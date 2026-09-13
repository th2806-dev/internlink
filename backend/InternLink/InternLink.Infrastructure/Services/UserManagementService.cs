using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Email;
using InternLink.Infrastructure.Identity;
using InternLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace InternLink.Infrastructure.Services;

public class UserManagementService : IUserManagementService
{
    private readonly AppDbContext _db;
    private readonly PasswordHasher<User> _hasher;
    private readonly IEmailService _emailService;
    private readonly ILogger<UserManagementService> _logger;

    public UserManagementService(
        AppDbContext db,
        PasswordHasher<User> hasher,
        IEmailService emailService,
        ILogger<UserManagementService> logger)
    {
        _db = db;
        _hasher = hasher;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<PaginatedResponse<UserDto>> GetUsersAsync(UserFilterRequest filter, Guid? departmentId = null)
    {
        var query = _db.Users.Where(u => !u.IsDeleted);

        // DepartmentAdmin: only see users in their department
        if (departmentId.HasValue)
            query = query.Where(u => u.DepartmentId == departmentId.Value);

        if (!string.IsNullOrWhiteSpace(filter.Role) && Enum.TryParse<Role>(filter.Role, true, out var role))
            query = query.Where(u => u.Role == role);

        if (filter.IsActive.HasValue)
            query = query.Where(u => u.IsActive == filter.IsActive.Value);

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var term = filter.SearchTerm.ToLower();
            query = query.Where(u =>
                u.Username.ToLower().Contains(term) ||
                (u.FullName != null && u.FullName.ToLower().Contains(term)) ||
                (u.Email != null && u.Email.ToLower().Contains(term)));
        }

        var total = await query.CountAsync();
        var users = await query
            .OrderBy(u => u.Username)
            .Skip(filter.Skip)
            .Take(filter.Take)
            .ToListAsync();

        var dtos = new List<UserDto>();
        foreach (var user in users)
            dtos.Add(await MapUserAsync(user));

        return new PaginatedResponse<UserDto>
        {
            Items = dtos,
            Total = total,
            Skip = filter.Skip,
            Take = filter.Take
        };
    }

    public async Task<UserDto?> GetUserByIdAsync(Guid id)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
        return user == null ? null : await MapUserAsync(user);
    }

    public async Task<UserDto> CreateUserAsync(CreateUserRequest request, Guid? creatorDepartmentId = null)
    {
        if (!Enum.TryParse<Role>(request.Role, true, out var role) || role is Role.SuperAdmin)
            throw new InvalidOperationException("Role must be Student, Lecturer, or DepartmentAdmin");

        if (role == Role.DepartmentAdmin)
        {
            if (creatorDepartmentId.HasValue)
                throw new InvalidOperationException("DepartmentAdmin accounts can only be created by SuperAdmin.");

            if (!request.DepartmentId.HasValue)
                throw new InvalidOperationException("DepartmentId is required when creating a DepartmentAdmin account.");

            var departmentExists = await _db.Departments.AnyAsync(d => d.Id == request.DepartmentId.Value && !d.IsDeleted && d.IsActive);
            if (!departmentExists)
                throw new InvalidOperationException("Selected department does not exist or is inactive.");
        }

        if (await _db.Users.AnyAsync(u => u.Username == request.Username && !u.IsDeleted))
            throw new InvalidOperationException($"Username '{request.Username}' already exists");

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var emailTaken = await _db.Users.AnyAsync(u => u.Email == request.Email && !u.IsDeleted);
            if (emailTaken)
                throw new InvalidOperationException($"Email '{request.Email}' already exists");
        }

        var tempPassword = PasswordGenerator.GenerateTemporaryPassword(8);
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = request.Username.Trim(),
            FullName = request.FullName.Trim(),
            Email = NullIfWhiteSpace(request.Email),
            Role = role,
            DepartmentId = role == Role.DepartmentAdmin ? request.DepartmentId : creatorDepartmentId,
            IsActive = true,
            MustChangePassword = true,
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = _hasher.HashPassword(user, tempPassword);

        await _db.Users.AddAsync(user);
        await LinkProfileAsync(user, request.StudentCode, request.StaffCode, role);

        // Record invitation in-app notification in database
        var welcomeNotif = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Title = "Thư mời tham gia hệ thống InternLink",
            Content = $"Chào mừng {user.FullName} ({user.Username}) đã được tạo tài khoản trên hệ thống InternLink. Mật khẩu tạm thời: {tempPassword}",
            Link = "/login",
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        await _db.Notifications.AddAsync(welcomeNotif);

        await _db.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(user.Email))
        {
            var invitationRole = role switch
            {
                Role.Lecturer => InvitationRole.Lecturer,
                Role.DepartmentAdmin => InvitationRole.DepartmentAdmin,
                _ => InvitationRole.Student
            };

            var emailResult = await _emailService.SendInvitationAsync(new InvitationEmailRequest
            {
                ToEmail = user.Email,
                FullName = user.FullName ?? user.Username,
                Role = invitationRole,
                Username = user.Username,
                TemporaryPassword = tempPassword
            });

            if (!emailResult.Success)
                _logger.LogWarning("User {Username} created but invitation email failed: {Message}", user.Username, emailResult.Message);
        }
        else
        {
            _logger.LogWarning("User {Username} created without email — invitation not sent", user.Username);
        }

        return await MapUserAsync(user);
    }

    public async Task<UserDto?> UpdateUserAsync(Guid id, UpdateUserRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
        if (user == null)
            return null;

        if (user.Role == Role.SuperAdmin)
            throw new InvalidOperationException("SuperAdmin account cannot be modified through this endpoint");

        if (!string.IsNullOrWhiteSpace(request.Email) && request.Email != user.Email)
        {
            var emailTaken = await _db.Users.AnyAsync(u => u.Email == request.Email && u.Id != id && !u.IsDeleted);
            if (emailTaken)
                throw new InvalidOperationException($"Email '{request.Email}' already exists");
        }

        user.FullName = request.FullName.Trim();
        user.Email = NullIfWhiteSpace(request.Email);
        user.IsActive = request.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return await MapUserAsync(user);
    }

    public async Task<ResetPasswordResultDto?> ResetPasswordAsync(Guid id)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
        if (user == null)
            return null;

        if (user.Role == Role.SuperAdmin)
            throw new InvalidOperationException("Cannot reset SuperAdmin password through this endpoint");

        var newPassword = PasswordGenerator.GenerateTemporaryPassword(8);
        user.PasswordHash = _hasher.HashPassword(user, newPassword);
        user.MustChangePassword = true;
        user.UpdatedAt = DateTime.UtcNow;

        // Record reset password notification in database
        var resetNotif = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Title = "Cấp lại mật khẩu tài khoản InternLink",
            Content = $"Mật khẩu tài khoản {user.Username} đã được thiết lập lại thành công. Mật khẩu tạm thời mới: {newPassword}",
            Link = "/login",
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        await _db.Notifications.AddAsync(resetNotif);

        await _db.SaveChangesAsync();

        var emailSent = false;
        string? emailMessage = null;

        if (!string.IsNullOrWhiteSpace(user.Email))
        {
            var result = await _emailService.SendPasswordResetAsync(new PasswordResetEmailRequest
            {
                ToEmail = user.Email,
                FullName = user.FullName ?? user.Username,
                Username = user.Username,
                NewPassword = newPassword
            });

            emailSent = result.Success;
            emailMessage = result.Message;
        }
        else
        {
            emailMessage = "User has no email — password reset but notification not sent";
            _logger.LogWarning("Password reset for {Username} without email notification", user.Username);
        }

        return new ResetPasswordResultDto
        {
            UserId = user.Id,
            Username = user.Username,
            EmailSent = emailSent,
            EmailMessage = emailMessage
        };
    }

    public async Task<bool> DeleteUserAsync(Guid id)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
        if (user == null)
            return false;

        if (user.Role == Role.SuperAdmin)
            throw new InvalidOperationException("Cannot delete SuperAdmin account");

        user.IsDeleted = true;
        user.IsActive = false;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    private async Task LinkProfileAsync(User user, string? studentCode, string? staffCode, Role role)
    {
        if (role == Role.Student && !string.IsNullOrWhiteSpace(studentCode))
        {
            var student = await _db.Students.FirstOrDefaultAsync(s => s.StudentCode == studentCode.Trim() && !s.IsDeleted)
                ?? throw new InvalidOperationException($"Student with code '{studentCode}' not found");

            if (student.UserId.HasValue && student.UserId != user.Id)
                throw new InvalidOperationException($"Student '{studentCode}' is already linked to another user");

            student.UserId = user.Id;
        }

        if (role == Role.Lecturer && !string.IsNullOrWhiteSpace(staffCode))
        {
            var lecturer = await _db.Lecturers.FirstOrDefaultAsync(l => l.StaffCode == staffCode.Trim() && !l.IsDeleted)
                ?? throw new InvalidOperationException($"Lecturer with staff code '{staffCode}' not found");

            if (lecturer.UserId.HasValue && lecturer.UserId != user.Id)
                throw new InvalidOperationException($"Lecturer '{staffCode}' is already linked to another user");

            lecturer.UserId = user.Id;
        }
    }

    private async Task<UserDto> MapUserAsync(User user)
    {
        string? studentCode = null;
        string? staffCode = null;

        if (user.Role == Role.Student)
        {
            studentCode = await _db.Students
                .Where(s => s.UserId == user.Id && !s.IsDeleted)
                .Select(s => s.StudentCode)
                .FirstOrDefaultAsync();
        }
        else if (user.Role == Role.Lecturer)
        {
            staffCode = await _db.Lecturers
                .Where(l => l.UserId == user.Id && !l.IsDeleted)
                .Select(l => l.StaffCode)
                .FirstOrDefaultAsync();
        }

        return new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role.ToString(),
            IsActive = user.IsActive,
            MustChangePassword = user.MustChangePassword,
            LastLoginAt = user.LastLoginAt,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            LinkedStudentCode = studentCode,
            LinkedStaffCode = staffCode,
            DepartmentId = user.DepartmentId
        };
    }

    private static string? NullIfWhiteSpace(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

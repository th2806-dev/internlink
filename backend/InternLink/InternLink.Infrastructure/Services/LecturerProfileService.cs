using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using AutoMapper;
using ClosedXML.Excel;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Identity;
using InternLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace InternLink.Infrastructure.Services;

public class LecturerProfileService : ILecturerProfileService
{
    public const string TemporaryPasswordPolicyDescription =
        "Mat khau tam 8 ky tu ngau nhien (gui qua email neu co)";

    private readonly AppDbContext _db;
    private readonly IMapper _mapper;
    private readonly PasswordHasher<User> _hasher;
    private readonly IEmailService _emailService;
    private readonly IExcelService _excelService;
    private readonly ILogger<LecturerProfileService> _logger;

    // Fuzzy matching definitions for lecturer columns
    private static readonly Dictionary<string, ColumnDefinition> LecturerColumns = new()
    {
        [nameof(Col.StaffCode)] = new("magv", "ma gv", "staffcode", "staff code", "code", "ma giang vien", "msgv", "ma giang vien", "staff number", "ma so gv", "ma so giao vien", "employee id", "employeeid"),
        [nameof(Col.FullName)] = new("hoten", "ho ten", "ho va ten", "fullname", "full name", "tengiangvien", "ten giang vien", "ho va ten giang vien", "ten giao vien", "họ tên", "họ và tên"),
        [nameof(Col.Ho)] = new("ho", "họ", "ho dem", "họ đệm", "ho va ten dem", "họ và tên đệm", "last name", "lastname", "họ và đệm"),
        [nameof(Col.Ten)] = new("ten", "tên", "first name", "firstname", "ten goi", "tên gọi"),
        [nameof(Col.Email)] = new("email", "e-mail", "thu dien tu", "thư điện tử", "email address", "email gv"),
        [nameof(Col.Phone)] = new("phone", "sdt", "sđt", "dien thoai", "điện thoại", "so dien thoai", "số điện thoại", "phone number", "sdt lien he", "so dt"),
        [nameof(Col.Department)] = new("bomon", "bo mon", "department", "khoa", "bo mon / khoa", "bo mon/khoa", "bo mon chuyen mon", "khoa / bo mon", "department name", "bo mon dao tao"),
        [nameof(Col.Username)] = new("username", "tendangnhap", "ten dang nhap", "tai khoan", "tài khoản", "user name", "login"),
    };

    public LecturerProfileService(
        AppDbContext db,
        IMapper mapper,
        PasswordHasher<User> hasher,
        IEmailService emailService,
        IExcelService excelService,
        ILogger<LecturerProfileService> logger)
    {
        _db = db;
        _mapper = mapper;
        _hasher = hasher;
        _emailService = emailService;
        _excelService = excelService;
        _logger = logger;
    }

    public async Task<IEnumerable<LecturerDto>> GetAllAsync(int skip = 0, int take = 100, Guid? semesterId = null, Guid? departmentId = null)
    {
        var query = _db.Lecturers
            .Where(l => !l.IsDeleted);

        if (departmentId.HasValue)
        {
            query = query.Where(l => l.DepartmentId == departmentId.Value);
        }

        if (semesterId.HasValue && semesterId != Guid.Empty)
        {
            query = query.Where(l =>
                l.SemesterLecturers.Any(sl => sl.SemesterId == semesterId && !sl.IsDeleted) ||
                l.Internships.Any(i => !i.IsDeleted && i.SemesterId == semesterId));
        }

        var items = await query
            .OrderBy(l => l.FullName)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return _mapper.Map<List<LecturerDto>>(items);
    }

    public async Task<LecturerDto?> GetByIdAsync(Guid id)
    {
        var lecturer = await _db.Lecturers.FirstOrDefaultAsync(l => l.Id == id && !l.IsDeleted);
        return lecturer == null ? null : _mapper.Map<LecturerDto>(lecturer);
    }

    public async Task<LecturerDto?> GetByUserIdAsync(Guid userId)
    {
        var lecturer = await _db.Lecturers.FirstOrDefaultAsync(l => l.UserId == userId && !l.IsDeleted);
        return lecturer == null ? null : _mapper.Map<LecturerDto>(lecturer);
    }

    public async Task<LecturerDto> CreateAsync(CreateLecturerRequest request, Guid? departmentId = null)
    {
        if (await _db.Lecturers.AnyAsync(l => l.StaffCode == request.StaffCode && !l.IsDeleted))
            throw new InvalidOperationException($"Staff code '{request.StaffCode}' already exists");

        Guid? userId = request.UserId;
        var createdNewUser = false;
        string? createdUsername = null;
        string? createdTemporaryPassword = null;

        if (request.GrantAccount || !string.IsNullOrWhiteSpace(request.Username))
        {
            createdUsername = (request.Username ?? request.StaffCode).Trim();
            var ensure = await EnsureLecturerUserAsync(createdUsername, request.FullName, request.Email, departmentId);
            userId = ensure.UserId;
            createdNewUser = ensure.CreatedNew;
            createdTemporaryPassword = ensure.TemporaryPassword;
        }
        else if (userId.HasValue)
        {
            var userTaken = await _db.Lecturers.AnyAsync(l => l.UserId == userId && !l.IsDeleted);
            if (userTaken)
                throw new InvalidOperationException("User is already linked to another lecturer profile");
        }

        var lecturer = new Lecturer
        {
            Id = Guid.NewGuid(),
            StaffCode = request.StaffCode.Trim(),
            FullName = request.FullName.Trim(),
            Email = NullIfWhiteSpace(request.Email),
            Phone = NullIfWhiteSpace(request.Phone),
            Department = NullIfWhiteSpace(request.Department),
            UserId = userId,
            DepartmentId = departmentId, // Scoped to the creating admin's department (null for SuperAdmin)
            CreatedAt = DateTime.UtcNow
        };

        await _db.Lecturers.AddAsync(lecturer);
        await _db.SaveChangesAsync();

        if (createdNewUser && createdUsername != null && createdTemporaryPassword != null)
        {
            await TrySendInvitationAsync(
                lecturer.Email,
                lecturer.FullName,
                createdUsername,
                createdTemporaryPassword,
                staffCode: lecturer.StaffCode,
                rowNumber: null);
        }

        return _mapper.Map<LecturerDto>(lecturer);
    }

    public async Task<LecturerDto?> UpdateAsync(Guid id, UpdateLecturerRequest request)
    {
        var lecturer = await _db.Lecturers.FirstOrDefaultAsync(l => l.Id == id && !l.IsDeleted);
        if (lecturer == null)
            return null;

        if (request.UserId.HasValue && request.UserId != lecturer.UserId)
        {
            var userTaken = await _db.Lecturers.AnyAsync(l => l.UserId == request.UserId && l.Id != id && !l.IsDeleted);
            if (userTaken)
                throw new InvalidOperationException("User is already linked to another lecturer profile");
            lecturer.UserId = request.UserId;
        }
        else if (request.GrantAccount || !string.IsNullOrWhiteSpace(request.Username))
        {
            if (lecturer.UserId.HasValue)
                throw new InvalidOperationException("Lecturer already has a login account");

            var username = (request.Username ?? lecturer.StaffCode).Trim();
            var email = NullIfWhiteSpace(request.Email) ?? lecturer.Email;
            var ensure = await EnsureLecturerUserAsync(username, request.FullName, email, lecturer.DepartmentId);
            lecturer.UserId = ensure.UserId;

            if (ensure.CreatedNew && ensure.TemporaryPassword != null)
            {
                await TrySendInvitationAsync(
                    email,
                    request.FullName.Trim(),
                    username,
                    ensure.TemporaryPassword,
                    staffCode: lecturer.StaffCode,
                    rowNumber: null);
            }
        }

        lecturer.FullName = request.FullName.Trim();
        lecturer.Email = NullIfWhiteSpace(request.Email);
        lecturer.Phone = NullIfWhiteSpace(request.Phone);
        lecturer.Department = NullIfWhiteSpace(request.Department);
        lecturer.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return _mapper.Map<LecturerDto>(lecturer);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var lecturer = await _db.Lecturers.FirstOrDefaultAsync(l => l.Id == id && !l.IsDeleted);
        if (lecturer == null)
            return false;

        var hasInternships = await _db.Internships.AnyAsync(i => i.LecturerId == id && !i.IsDeleted);
        if (hasInternships)
            throw new InvalidOperationException("Cannot delete lecturer with assigned internships");

        lecturer.IsDeleted = true;
        lecturer.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<LecturerOverviewDto?> GetOverviewAsync(Guid lecturerId)
    {
        var lecturer = await _db.Lecturers.FirstOrDefaultAsync(l => l.Id == lecturerId && !l.IsDeleted);
        if (lecturer == null)
            return null;

        var internships = await _db.Internships
            .Where(i => i.LecturerId == lecturerId && !i.IsDeleted)
            .Include(i => i.Student)
            .Include(i => i.Company)
            .Include(i => i.Submissions)
            .Include(i => i.WeeklyReports)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        var summaries = internships.Select(i => new LecturerInternshipSummaryDto
        {
            InternshipId = i.Id,
            StudentId = i.StudentId,
            StudentCode = i.Student?.StudentCode ?? string.Empty,
            StudentName = i.Student?.FullName ?? string.Empty,
            CompanyName = i.Company?.CompanyName,
            Status = i.Status.ToString(),
            SubmissionCount = i.Submissions?.Count(s => !s.IsDeleted) ?? 0,
            WeeklyReportCount = i.WeeklyReports?.Count(w => !w.IsDeleted) ?? 0,
            StartDate = i.StartDate,
            EndDate = i.EndDate
        }).ToList();

        var statusCounts = summaries
            .GroupBy(s => s.Status)
            .ToDictionary(g => g.Key, g => g.Count());

        return new LecturerOverviewDto
        {
            Lecturer = _mapper.Map<LecturerDto>(lecturer),
            TotalInternships = summaries.Count,
            StatusCounts = statusCounts,
            Internships = summaries
        };
    }

    public async Task<LecturerImportResultDto> ImportFromExcelAsync(Stream excelStream, Guid? semesterId = null, Guid? departmentId = null, bool grantAccount = false)
    {
        if (excelStream == null || !excelStream.CanRead)
            throw new ArgumentException("Excel file stream is required");

        using var workbook = new XLWorkbook(excelStream);
        var worksheet = workbook.Worksheets.FirstOrDefault()
            ?? throw new InvalidOperationException("Excel file has no worksheet");

        var usedRange = worksheet.RangeUsed();
        if (usedRange == null)
            throw new InvalidOperationException("Excel file is empty");

        var headerRow = TemplateHelper.FindHeaderRow(worksheet, row =>
        {
            var map = BuildColumnMap(row);
            return map.ContainsKey(Col.StaffCode) &&
                   (map.ContainsKey(Col.FullName) || map.ContainsKey(Col.Ten) || map.ContainsKey(Col.Ho));
        }) ?? usedRange.FirstRow();

        var columnMap = BuildColumnMap(headerRow);
        var hasValidNameCol = columnMap.ContainsKey(Col.FullName) || columnMap.ContainsKey(Col.Ten) || columnMap.ContainsKey(Col.Ho);

        if (!columnMap.ContainsKey(Col.StaffCode) || !hasValidNameCol)
            throw new InvalidOperationException("Excel must include MaGV (StaffCode) and HoTen (FullName) columns");

        var errors = new List<LecturerImportErrorDto>();
        var emailErrors = new List<LecturerImportErrorDto>();
        var created = new List<Lecturer>();
        var allProcessedLecturers = new List<Lecturer>();
        var pendingInvitations = new List<PendingInvitation>();
        var seenCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var seenUsernames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var totalRows = 0;
        var emailSentCount = 0;
        var emailFailedCount = 0;

        foreach (var row in usedRange.RowsUsed())
        {
            if (row.RowNumber() <= headerRow.RowNumber())
                continue;

            var rowNumber = row.RowNumber();
            var staffCode = GetCell(row, columnMap, Col.StaffCode);
            var hoTen = GetCell(row, columnMap, Col.FullName);
            var ho = GetCell(row, columnMap, Col.Ho);
            var ten = GetCell(row, columnMap, Col.Ten);
            // Prefer structured Họ + Tên columns; only fall back to a combined name column.
            var fullName = ho != null || ten != null
                ? TemplateHelper.CombineFullName(ho, ten, null)
                : TemplateHelper.CombineFullName(null, null, hoTen);
            var email = GetCell(row, columnMap, Col.Email);
            var phone = GetCell(row, columnMap, Col.Phone);
            var department = GetCell(row, columnMap, Col.Department);
            var username = GetCell(row, columnMap, Col.Username);

            (email, phone) = TemplateHelper.SanitizeEmailAndPhone(email, phone);

            if (IsBlankRow(staffCode, fullName, email, phone, department, username))
                continue;

            totalRows++;

            if (string.IsNullOrWhiteSpace(staffCode))
            {
                errors.Add(new LecturerImportErrorDto { RowNumber = rowNumber, Message = "Staff code (MaGV) is required" });
                continue;
            }

            if (string.IsNullOrWhiteSpace(fullName))
            {
                errors.Add(new LecturerImportErrorDto { RowNumber = rowNumber, StaffCode = staffCode, Message = "Full name is required" });
                continue;
            }

            if (!string.IsNullOrWhiteSpace(email) && !TemplateHelper.IsValidEmail(email))
            {
                errors.Add(new LecturerImportErrorDto { RowNumber = rowNumber, StaffCode = staffCode, Message = "Invalid email format" });
                continue;
            }

            staffCode = staffCode.Trim();
            fullName = fullName.Trim();

            if (!seenCodes.Add(staffCode))
            {
                errors.Add(new LecturerImportErrorDto { RowNumber = rowNumber, StaffCode = staffCode, Message = "Duplicate MaGV in file" });
                continue;
            }

            var existingLecturer = await _db.Lecturers
                .Include(l => l.User)
                .FirstOrDefaultAsync(l => l.StaffCode == staffCode);

            if (existingLecturer != null)
            {
                // The StaffCode index is unique across deleted rows too, so re-importing a
                // soft-deleted lecturer must restore it instead of inserting a duplicate
                // (which used to throw DbUpdateException -> 500 "An unexpected error occurred.").
                existingLecturer.IsDeleted = false;
                existingLecturer.FullName = fullName;
                if (!string.IsNullOrWhiteSpace(email))
                    existingLecturer.Email = email.Trim();
                if (!string.IsNullOrWhiteSpace(phone))
                    existingLecturer.Phone = phone.Trim();
                if (!string.IsNullOrWhiteSpace(department))
                    existingLecturer.Department = department.Trim();
                existingLecturer.UpdatedAt = DateTime.UtcNow;

                if (existingLecturer.User != null)
                {
                    // Revive the login account that was soft-deleted together with the lecturer.
                    if (grantAccount && existingLecturer.User.IsDeleted)
                    {
                        existingLecturer.User.IsDeleted = false;
                        existingLecturer.User.IsActive = true;
                    }
                    existingLecturer.User.FullName = fullName;
                    if (!string.IsNullOrWhiteSpace(email))
                        existingLecturer.User.Email = email.Trim();
                    existingLecturer.User.UpdatedAt = DateTime.UtcNow;
                }
                else if (grantAccount && (!string.IsNullOrWhiteSpace(username) || !string.IsNullOrWhiteSpace(email)))
                {
                    if (string.IsNullOrWhiteSpace(username))
                        username = staffCode;

                    if (seenUsernames.Add(username))
                    {
                        try
                        {
                            var ensure = await EnsureLecturerUserAsync(username, fullName, email, departmentId);
                            existingLecturer.UserId = ensure.UserId;
                            if (ensure.CreatedNew && ensure.TemporaryPassword != null)
                            {
                                pendingInvitations.Add(new PendingInvitation(
                                    rowNumber, staffCode, username, fullName, NullIfWhiteSpace(email), ensure.TemporaryPassword));
                            }
                        }
                        catch (InvalidOperationException)
                        {
                            // Ignore user conflict for existing lecturer
                        }
                    }
                }

                allProcessedLecturers.Add(existingLecturer);
                continue;
            }

            if (string.IsNullOrWhiteSpace(username) && !string.IsNullOrWhiteSpace(email))
                username = staffCode;

            Guid? userId = null;
            if (grantAccount && !string.IsNullOrWhiteSpace(username))
            {
                username = username.Trim();
                if (!seenUsernames.Add(username))
                {
                    errors.Add(new LecturerImportErrorDto { RowNumber = rowNumber, StaffCode = staffCode, Username = username, Message = "Duplicate username in file" });
                    continue;
                }

                try
                {
                    var ensure = await EnsureLecturerUserAsync(username, fullName, email, departmentId);
                    userId = ensure.UserId;
                    if (ensure.CreatedNew && ensure.TemporaryPassword != null)
                    {
                        pendingInvitations.Add(new PendingInvitation(
                            rowNumber, staffCode, username, fullName, NullIfWhiteSpace(email), ensure.TemporaryPassword));
                    }
                }
                catch (InvalidOperationException ex)
                {
                    errors.Add(new LecturerImportErrorDto { RowNumber = rowNumber, StaffCode = staffCode, Username = username, Message = ex.Message });
                    continue;
                }
            }

            var newLecturer = new Lecturer
            {
                Id = Guid.NewGuid(),
                StaffCode = staffCode,
                FullName = fullName,
                Email = NullIfWhiteSpace(email),
                Phone = NullIfWhiteSpace(phone),
                Department = NullIfWhiteSpace(department),
                DepartmentId = departmentId,
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            };

            created.Add(newLecturer);
            allProcessedLecturers.Add(newLecturer);
        }

        if (created.Count > 0)
        {
            await _db.Lecturers.AddRangeAsync(created);
        }
        await _db.SaveChangesAsync();

        // Link imported lecturers to the semester (so the semester's lecturer roster is known
        // right after import, even before students are assigned).
        if (semesterId.HasValue && semesterId.Value != Guid.Empty && allProcessedLecturers.Count > 0)
        {
            var semesterExists = await _db.Semesters.AnyAsync(s => s.Id == semesterId.Value && !s.IsDeleted);
            if (semesterExists)
            {
                var lecturerIds = allProcessedLecturers.Select(l => l.Id).Distinct().ToList();
                var existingLinks = await _db.SemesterLecturers
                    .Where(sl => sl.SemesterId == semesterId.Value && lecturerIds.Contains(sl.LecturerId) && !sl.IsDeleted)
                    .Select(sl => sl.LecturerId)
                    .ToListAsync();

                var linksToAdd = lecturerIds
                    .Where(id => !existingLinks.Contains(id))
                    .Select(id => new SemesterLecturer
                    {
                        Id = Guid.NewGuid(),
                        SemesterId = semesterId.Value,
                        LecturerId = id,
                        CreatedAt = DateTime.UtcNow
                    })
                    .ToList();

                if (linksToAdd.Count > 0)
                {
                    await _db.SemesterLecturers.AddRangeAsync(linksToAdd);
                    await _db.SaveChangesAsync();
                }
            }
        }

        foreach (var invite in pendingInvitations)
        {
            var send = await TrySendInvitationAsync(
                invite.Email,
                invite.FullName,
                invite.Username,
                invite.TemporaryPassword,
                invite.StaffCode,
                invite.RowNumber);

            if (send.Status == InvitationSendStatus.Sent)
                emailSentCount++;
            else if (send.Status == InvitationSendStatus.Failed)
            {
                emailFailedCount++;
                emailErrors.Add(send.Error!);
            }
            else if (send.Status == InvitationSendStatus.SkippedNoEmail)
            {
                emailFailedCount++;
                emailErrors.Add(send.Error!);
            }
        }

        return new LecturerImportResultDto
        {
            TotalRows = totalRows,
            SuccessCount = allProcessedLecturers.Count,
            FailedCount = errors.Count,
            SkippedDuplicateCount = 0,
            EmailSentCount = emailSentCount,
            EmailFailedCount = emailFailedCount,
            DefaultPassword = TemporaryPasswordPolicyDescription,
            CreatedLecturers = _mapper.Map<List<LecturerDto>>(allProcessedLecturers),
            Errors = errors,
            EmailErrors = emailErrors
        };
    }

    public byte[] GetImportTemplate()
    {
        return TemplateHelper.GetTemplateBytes("Mau-danh-sach-GV.xlsx", () =>
        {
            using var workbook = new XLWorkbook();
            var sheet = workbook.Worksheets.Add("Lecturers");

            sheet.Cell(1, 1).Value = "MaGV";
            sheet.Cell(1, 2).Value = "HoTen";
            sheet.Cell(1, 3).Value = "Email";
            sheet.Cell(1, 4).Value = "SDT";
            sheet.Cell(1, 5).Value = "BoMon";
            sheet.Cell(1, 6).Value = "Username";

            sheet.Cell(2, 1).Value = "GV001";
            sheet.Cell(2, 2).Value = "Nguyen Van A";
            sheet.Cell(2, 3).Value = "nguyenvana@university.edu.vn";
            sheet.Cell(2, 4).Value = "0901234567";
            sheet.Cell(2, 5).Value = "CNTT";
            sheet.Cell(2, 6).Value = "GV001";

            sheet.Cell(4, 1).Value = "Ghi chu:";
            sheet.Cell(4, 2).Value =
                "Neu co Email hoac Username thi tao tai khoan login (username mac dinh = MaGV, mat khau tam 8 ky tu ngau nhien). " +
                "Neu co Email thi he thong gui thu moi tham gia (link + username + mat khau). " +
                "Lan dang nhap dau tien bat buoc doi mat khau.";

            sheet.Row(1).Style.Font.Bold = true;
            sheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        });
    }

    public async Task<byte[]> ExportLecturersExcelAsync(Guid? departmentId = null)
    {
        var lecturersQuery = _db.Lecturers
            .Include(l => l.Internships)
            .Include(l => l.User)
            .Where(l => !l.IsDeleted);

        if (departmentId.HasValue)
        {
            lecturersQuery = lecturersQuery.Where(l => l.DepartmentId == departmentId.Value);
        }

        var lecturers = await lecturersQuery
            .OrderBy(l => l.StaffCode)
            .ToListAsync();

        var mappings = new Dictionary<string, Func<Lecturer, object?>>
        {
            ["STT"] = l => lecturers.IndexOf(l) + 1,
            ["Mã Giảng Viên (MSGV)"] = l => l.StaffCode,
            ["Họ và Tên Giảng Viên"] = l => l.FullName,
            ["Bộ Môn / Khoa"] = l => l.Department ?? "-",
            ["Email"] = l => l.Email ?? "-",
            ["Số Điện Thoại"] = l => l.Phone ?? "-",
            ["Tài Khoản Đăng Nhập"] = l => l.User?.Username ?? "Chưa cấp tài khoản",
            ["Số SV Đang Hướng Dẫn"] = l => l.Internships.Count(i => !i.IsDeleted),
            ["Trạng Thái Tài Khoản"] = l => l.User == null ? "Chưa kích hoạt" : (l.User.IsActive ? "Hoạt động" : "Đã khóa"),
        };

        return _excelService.ExportToExcel(
            "DanhSachGiangVien",
            "DANH SÁCH GIẢNG VIÊN HƯỚNG DẪN THỰC TẬP",
            lecturers,
            mappings);
    }

    private async Task<(Guid UserId, bool CreatedNew, string? TemporaryPassword)> EnsureLecturerUserAsync(string username, string fullName, string? email, Guid? departmentId = null)
    {
        var existing = await _db.Users.FirstOrDefaultAsync(u => u.Username == username);
        if (existing != null)
        {
            if (existing.Role != Role.Lecturer)
                throw new InvalidOperationException($"Username '{username}' exists but is not a Lecturer account");

            // Include soft-deleted lecturers: the UserId index covers deleted rows too, so a
            // user already attached to any lecturer row (even a deleted one) cannot be reused.
            var linked = await _db.Lecturers.AnyAsync(l => l.UserId == existing.Id);
            if (linked)
                throw new InvalidOperationException($"Username '{username}' is already linked to a lecturer profile");

            if (existing.IsDeleted)
            {
                // Reuse a soft-deleted login account instead of leaving an orphan duplicate.
                existing.IsDeleted = false;
                existing.IsActive = true;
                existing.UpdatedAt = DateTime.UtcNow;
            }

            return (existing.Id, CreatedNew: false, TemporaryPassword: null);
        }

        if (!string.IsNullOrWhiteSpace(email))
        {
            var emailTaken = await _db.Users.AnyAsync(u => u.Email == email && !u.IsDeleted);
            if (emailTaken)
                throw new InvalidOperationException($"Email '{email}' already exists in system");
        }

        var tempPassword = PasswordGenerator.GenerateTemporaryPassword();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = username,
            FullName = fullName,
            Email = NullIfWhiteSpace(email),
            Role = Role.Lecturer,
            DepartmentId = departmentId, // Scoped to the importing/creating admin's department so /admin/users lists it
            IsActive = true,
            MustChangePassword = true,
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = _hasher.HashPassword(user, tempPassword);
        await _db.Users.AddAsync(user);
        await _db.SaveChangesAsync();
        return (user.Id, CreatedNew: true, TemporaryPassword: tempPassword);
    }

    private async Task<InvitationSendOutcome> TrySendInvitationAsync(
        string? email,
        string fullName,
        string username,
        string temporaryPassword,
        string? staffCode,
        int? rowNumber)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            _logger.LogWarning(
                "Skipped invitation email for lecturer {StaffCode} (username={Username}): no email address",
                staffCode,
                username);

            return InvitationSendOutcome.Skipped(
                new LecturerImportErrorDto
                {
                    RowNumber = rowNumber ?? 0,
                    StaffCode = staffCode,
                    Username = username,
                    Message = "Account created but invitation email skipped: no email address"
                });
        }

        try
        {
            var result = await _emailService.SendInvitationAsync(new InvitationEmailRequest
            {
                ToEmail = email.Trim(),
                FullName = fullName,
                Role = InvitationRole.Lecturer,
                Username = username,
                TemporaryPassword = temporaryPassword
            });

            if (!result.Success)
            {
                _logger.LogWarning(
                    "Failed to send invitation email to lecturer {StaffCode} (username={Username}): {Message}",
                    staffCode,
                    username,
                    result.Message);

                return InvitationSendOutcome.Failed(
                    new LecturerImportErrorDto
                    {
                        RowNumber = rowNumber ?? 0,
                        StaffCode = staffCode,
                        Username = username,
                        Message = result.Message ?? "Failed to send invitation email"
                    });
            }

            _logger.LogInformation(
                "Invitation email sent for lecturer {StaffCode} (username={Username}) to {Email}",
                staffCode,
                username,
                email);

            return InvitationSendOutcome.Sent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Exception while sending invitation email for lecturer {StaffCode} (username={Username})",
                staffCode,
                username);

            return InvitationSendOutcome.Failed(
                new LecturerImportErrorDto
                {
                    RowNumber = rowNumber ?? 0,
                    StaffCode = staffCode,
                    Username = username,
                    Message = $"Failed to send invitation email: {ex.Message}"
                });
        }
    }

    private enum Col { StaffCode, FullName, Ho, Ten, Email, Phone, Department, Username }

    private enum InvitationSendStatus { Sent, Failed, SkippedNoEmail }

    private sealed record PendingInvitation(
        int RowNumber,
        string StaffCode,
        string Username,
        string FullName,
        string? Email,
        string TemporaryPassword);

    private sealed record InvitationSendOutcome(InvitationSendStatus Status, LecturerImportErrorDto? Error)
    {
        public static InvitationSendOutcome Sent() => new(InvitationSendStatus.Sent, null);
        public static InvitationSendOutcome Failed(LecturerImportErrorDto error) => new(InvitationSendStatus.Failed, error);
        public static InvitationSendOutcome Skipped(LecturerImportErrorDto error) => new(InvitationSendStatus.SkippedNoEmail, error);
    }

    private static Dictionary<Col, int> BuildColumnMap(IXLRangeRow headerRow)
    {
        // Use fuzzy column matcher with expanded aliases
        var fuzzyResult = FuzzyColumnMatcher.Match(headerRow, LecturerColumns, minScore: 50);

        // Map string keys back to enum
        var map = new Dictionary<Col, int>();
        foreach (var kvp in fuzzyResult)
        {
            if (Enum.TryParse<Col>(kvp.Key, out var col))
                map[col] = kvp.Value;
        }
        return map;
    }

    private static string NormalizeHeader(string value) =>
        FuzzyColumnMatcher.NormalizeHeader(value);

    private static string? GetCell(IXLRangeRow row, Dictionary<Col, int> map, Col column)
    {
        if (!map.TryGetValue(column, out var colIndex)) return null;
        var cell = row.Cell(colIndex);
        if (cell.DataType == XLDataType.Number)
            return cell.GetDouble().ToString("0");
        var text = cell.GetString();
        return string.IsNullOrWhiteSpace(text) ? null : text.Trim();
    }

    private static bool IsBlankRow(params string?[] values) => values.All(string.IsNullOrWhiteSpace);
    private static string? NullIfWhiteSpace(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

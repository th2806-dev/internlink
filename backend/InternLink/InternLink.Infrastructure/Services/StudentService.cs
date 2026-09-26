using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using AutoMapper;
using ClosedXML.Excel;
using InternLink.Application.Common;
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

public class StudentService : IStudentService
{
    public const string TemporaryPasswordPolicyDescription =
        "Mat khau tam 8 ky tu ngau nhien (gui qua email neu co)";

    private readonly AppDbContext _db;
    private readonly IMapper _mapper;
    private readonly PasswordHasher<User> _hasher;
    private readonly IEmailService _emailService;
    private readonly IExcelService _excelService;
    private readonly ILogger<StudentService> _logger;

    // Fuzzy matching definitions: each column has multiple accepted aliases
    private static readonly Dictionary<string, ColumnDefinition> StudentColumns = new()
    {
        [nameof(StudentColumn.StudentCode)] = new("mssv", "studentCode", "student number", "studentcode", "ma sv", "masv", "ma sinh vien", "ma so sinh vien", "student id", "studentid"),
        // NOTE: no bare "tên" alias here on purpose — a header "Tên" must map to the
        // separate Ten (given-name) column, not steal it as a combined full name.
        [nameof(StudentColumn.FullName)] = new("hoten", "ho ten", "ho va ten", "fullname", "full name", "student name", "ten sinh vien", "ho va ten sinh vien", "họ tên", "họ và tên"),
        [nameof(StudentColumn.Ho)] = new("ho", "họ", "ho dem", "họ đệm", "ho va ten dem", "họ và tên đệm", "last name", "lastname", "họ và đệm"),
        [nameof(StudentColumn.Ten)] = new("ten", "tên", "first name", "firstname", "ten goi", "tên gọi"),
        [nameof(StudentColumn.Class)] = new("lop", "class", "classname", "lop hoc", "class name", "lop sv", "lop sinh vien", "ma lop"),
        [nameof(StudentColumn.Major)] = new("nganh", "ngành", "chuyen nganh", "chuyên ngành", "major", "nganh hoc", "ngành học", "major name", "chuyen nganh hoc"),
        [nameof(StudentColumn.Email)] = new("email", "e-mail", "thu dien tu", "thư điện tử", "email address", "email sinh vien"),
        [nameof(StudentColumn.Phone)] = new("phone", "sdt", "sđt", "dien thoai", "điện thoại", "so dien thoai", "số điện thoại", "phone number", "sdt lien he", "so dt"),
        [nameof(StudentColumn.Username)] = new("username", "tendangnhap", "ten dang nhap", "tai khoan", "tài khoản", "user name", "login"),
        [nameof(StudentColumn.Department)] = new("khoa", "department", "khoa quan ly", "khoa hoc"),
        [nameof(StudentColumn.DesiredPosition)] = new("nguyen vong", "vi tri mong muon", "desired position", "vi tri nguyen vong", "desiredposition", "vi tri"),
        [nameof(StudentColumn.Skills)] = new("ky nang", "skills", "ky nang chuyen mon", "chuyen mon", "skill"),
        [nameof(StudentColumn.ResumeUrl)] = new("cv", "link cv", "resume", "cv url", "resume url", "portfolio"),
    };

    public StudentService(
        AppDbContext db,
        IMapper mapper,
        PasswordHasher<User> hasher,
        IEmailService emailService,
        IExcelService excelService,
        ILogger<StudentService> logger)
    {
        _db = db;
        _mapper = mapper;
        _hasher = hasher;
        _emailService = emailService;
        _excelService = excelService;
        _logger = logger;
    }

    public async Task<IEnumerable<StudentDto>> GetAllStudentsAsync(int skip = 0, int take = 100, Guid? lecturerId = null, Guid? semesterId = null, Guid? departmentId = null)
    {
        var query = _db.Students.Where(s => !s.IsDeleted);
        query = ApplySemesterScope(query, semesterId);
        query = ApplyLecturerScope(query, lecturerId);
        query = ApplyDepartmentScope(query, departmentId);

        var students = await query
            .OrderBy(s => s.FullName)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return _mapper.Map<List<StudentDto>>(students);
    }

    public async Task<PaginatedResponse<StudentDto>> GetStudentsWithFilterAsync(StudentFilterRequest filter, Guid? lecturerId = null, Guid? departmentId = null)
    {
        var query = _db.Students.Where(s => !s.IsDeleted);
        query = ApplyLecturerScope(query, lecturerId);
        query = ApplyDepartmentScope(query, departmentId);

        if (!string.IsNullOrWhiteSpace(filter.Class))
            query = query.Where(s => s.Class == filter.Class);

        if (!string.IsNullOrWhiteSpace(filter.Major))
            query = query.Where(s => s.Major == filter.Major);

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var searchLower = filter.SearchTerm.ToLower();
            query = query.Where(s =>
                s.FullName.ToLower().Contains(searchLower) ||
                s.StudentCode.ToLower().Contains(searchLower)
            );
        }

        var total = await query.CountAsync();

        var students = await query
            .OrderBy(s => s.FullName)
            .Skip(filter.Skip)
            .Take(filter.Take)
            .ToListAsync();

        return new PaginatedResponse<StudentDto>
        {
            Items = _mapper.Map<List<StudentDto>>(students),
            Total = total,
            Skip = filter.Skip,
            Take = filter.Take
        };
    }

    public async Task<StudentDto?> GetStudentByIdAsync(Guid id, Guid? lecturerId = null)
    {
        var query = _db.Students.Where(s => s.Id == id && !s.IsDeleted);
        query = ApplyLecturerScope(query, lecturerId);
        var student = await query.FirstOrDefaultAsync();

        return student == null ? null : _mapper.Map<StudentDto>(student);
    }

    public async Task<StudentDto?> GetStudentByCodeAsync(string studentCode, Guid? lecturerId = null)
    {
        var normalizedCode = NormalizeStudentCode(studentCode);
        var query = _db.Students.Where(s => s.StudentCode == normalizedCode && !s.IsDeleted);
        query = ApplyLecturerScope(query, lecturerId);
        var student = await query.FirstOrDefaultAsync();

        return student == null ? null : _mapper.Map<StudentDto>(student);
    }

    private static IQueryable<Student> ApplyLecturerScope(IQueryable<Student> query, Guid? lecturerId)
    {
        if (!lecturerId.HasValue)
            return query;

        return query.Where(s => s.Internships.Any(i => !i.IsDeleted && i.LecturerId == lecturerId.Value));
    }

    private static IQueryable<Student> ApplySemesterScope(IQueryable<Student> query, Guid? semesterId)
    {
        if (!semesterId.HasValue || semesterId.Value == Guid.Empty)
            return query;

        // Students of the selected term = those with a (non-deleted) internship in that term,
        // plus students not yet enrolled in any term so freshly added profiles stay visible.
        return query.Where(s =>
            !s.Internships.Any(i => !i.IsDeleted) ||
            s.Internships.Any(i => !i.IsDeleted && i.SemesterId == semesterId.Value));
    }

    private static IQueryable<Student> ApplyDepartmentScope(IQueryable<Student> query, Guid? departmentId)
    {
        if (!departmentId.HasValue)
            return query;

        return query.Where(s => s.DepartmentId == departmentId.Value);
    }

    public async Task<StudentDto?> GetStudentByUserIdAsync(Guid userId)
    {
        var student = await _db.Students
            .FirstOrDefaultAsync(s => s.UserId == userId && !s.IsDeleted);

        return student == null ? null : _mapper.Map<StudentDto>(student);
    }

    public async Task<StudentPortalProfileDto?> GetPortalProfileByUserIdAsync(Guid userId)
    {
        var student = await _db.Students
            .FirstOrDefaultAsync(s => s.UserId == userId && !s.IsDeleted);

        if (student == null)
            return null;

        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);

        var activeSemester = await _db.Semesters
            .Where(s => !s.IsDeleted && s.Status == SemesterStatus.Active)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        var internshipQuery = _db.Internships
            .Include(i => i.Company)
            .Include(i => i.Lecturer)
            .Include(i => i.Student)
            .Include(i => i.Semester)
            .Where(i => !i.IsDeleted && i.StudentId == student.Id);

        // KHÔNG lọc theo "kỳ active tạo sau nhất" toàn hệ thống: nhiều khoa có thể cùng
        // có kỳ Active (CNTT + QTKD), lọc chung sẽ sai kỳ cho SV của khoa kia.
        // Ưu tiên internship thuộc kỳ Active của chính SV, fallback mới nhất theo CreatedAt.

        var internship = await internshipQuery
            .OrderByDescending(i => i.CreatedAt)
            .ThenByDescending(i => i.Id)
            .FirstOrDefaultAsync();

        List<WeeklyReport> weeklyReports = new();
        Evaluation? evaluation = null;
        if (internship != null)
        {
            weeklyReports = await _db.WeeklyReports
                .Where(r => !r.IsDeleted && r.InternshipId == internship.Id)
                .ToListAsync();

            evaluation = await _db.Evaluations
                .Where(e => !e.IsDeleted && e.InternshipId == internship.Id)
                .OrderByDescending(e => e.CreatedAt)
                .FirstOrDefaultAsync();
        }

        var totalWeeks = internship?.Semester?.TotalWeeks ?? activeSemester?.TotalWeeks;
        var scheduleSemesterId = internship?.SemesterId ?? activeSemester?.Id;
        IReadOnlyList<int>? requiredWeeks = null;
        if (scheduleSemesterId.HasValue)
        {
            var schedules = await _db.SemesterReportSchedules
                .AsNoTracking()
                .Where(s => s.SemesterId == scheduleSemesterId.Value && !s.IsDeleted)
                .ToListAsync();
            requiredWeeks = InternshipProgressCalculator.ResolveRequiredWeekNumbers(
                totalWeeks ?? 0,
                schedules);
        }

        var breakdown = InternshipProgressCalculator.Calculate(
            user,
            student,
            internship,
            weeklyReports,
            evaluation,
            totalWeeks,
            requiredWeeks);

        return new StudentPortalProfileDto
        {
            Student = _mapper.Map<StudentDto>(student),
            Internship = internship == null ? null : _mapper.Map<InternshipDto>(internship),
            LecturerName = internship?.Lecturer?.FullName,
            ProgressPercent = breakdown.TotalPercent,
            ProgressBreakdown = breakdown,
        };
    }

    public async Task<StudentDto> CreateStudentAsync(CreateStudentRequest request, Guid? departmentId = null)
    {
        var normalizedStudentCode = NormalizeStudentCode(request.StudentCode);
        var existingStudent = await _db.Students
            .FirstOrDefaultAsync(s => s.StudentCode == normalizedStudentCode && !s.IsDeleted);

        if (existingStudent != null)
            throw new InvalidOperationException($"Student number '{normalizedStudentCode}' already exists");

        Guid? userId = request.UserId;
        var createdNewUser = false;
        string? createdUsername = null;
        string? createdTemporaryPassword = null;

        if (request.GrantAccount || !string.IsNullOrWhiteSpace(request.Username))
        {
            createdUsername = (request.Username ?? normalizedStudentCode).Trim();
            var ensure = await EnsureStudentUserAsync(createdUsername, request.FullName, request.Email, departmentId);
            userId = ensure.UserId;
            createdNewUser = ensure.CreatedNew;
            createdTemporaryPassword = ensure.TemporaryPassword;
        }
        else if (userId.HasValue)
        {
            var userTaken = await _db.Students.AnyAsync(s => s.UserId == userId && !s.IsDeleted);
            if (userTaken)
                throw new InvalidOperationException("User is already linked to another student profile");
        }

        var student = new Student
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            StudentCode = normalizedStudentCode,
            FullName = request.FullName.Trim(),
            Class = NullIfWhiteSpace(request.Class),
            Major = NullIfWhiteSpace(request.Major),
            Email = NullIfWhiteSpace(request.Email),
            Phone = NullIfWhiteSpace(request.Phone),
            Department = NullIfWhiteSpace(request.Department),
            DesiredPosition = NullIfWhiteSpace(request.DesiredPosition),
            AlternativePosition = NullIfWhiteSpace(request.AlternativePosition),
            DesiredLocation = NullIfWhiteSpace(request.DesiredLocation),
            WorkPreference = NullIfWhiteSpace(request.WorkPreference),
            PreferredIndustry = NullIfWhiteSpace(request.PreferredIndustry),
            Skills = NullIfWhiteSpace(request.Skills),
            ResumeUrl = NullIfWhiteSpace(request.ResumeUrl),
            DepartmentId = departmentId, // Scoped to the creating admin's department (null for SuperAdmin)
            CreatedAt = DateTime.UtcNow
        };

        await _db.Students.AddAsync(student);
        await _db.SaveChangesAsync();

        if (createdNewUser && createdUsername != null && createdTemporaryPassword != null)
        {
            await TrySendInvitationAsync(
                student.Email,
                student.FullName,
                createdUsername,
                createdTemporaryPassword,
                student.StudentCode,
                rowNumber: null);
        }

        return _mapper.Map<StudentDto>(student);
    }

    public async Task<StudentDto?> UpdateStudentAsync(Guid id, UpdateStudentRequest request)
    {
        var student = await _db.Students
            .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);

        if (student == null)
            return null;

        if (request.UserId.HasValue && request.UserId != student.UserId)
        {
            var userTaken = await _db.Students.AnyAsync(s => s.UserId == request.UserId && s.Id != id && !s.IsDeleted);
            if (userTaken)
                throw new InvalidOperationException("User is already linked to another student profile");
            student.UserId = request.UserId;
        }
        else if (request.GrantAccount || !string.IsNullOrWhiteSpace(request.Username))
        {
            if (student.UserId.HasValue)
                throw new InvalidOperationException("Student already has a login account");

            var username = (request.Username ?? student.StudentCode).Trim();
            var email = NullIfWhiteSpace(request.Email) ?? student.Email;
            var ensure = await EnsureStudentUserAsync(username, request.FullName, email, student.DepartmentId);
            student.UserId = ensure.UserId;

            if (ensure.CreatedNew && ensure.TemporaryPassword != null)
            {
                await TrySendInvitationAsync(
                    email,
                    request.FullName.Trim(),
                    username,
                    ensure.TemporaryPassword,
                    student.StudentCode,
                    rowNumber: null);
            }
        }

        student.FullName = request.FullName.Trim();
        student.Class = NullIfWhiteSpace(request.Class);
        student.Major = NullIfWhiteSpace(request.Major);
        student.Email = NullIfWhiteSpace(request.Email);
        student.Phone = NullIfWhiteSpace(request.Phone);
        student.Department = NullIfWhiteSpace(request.Department);
        student.DesiredPosition = NullIfWhiteSpace(request.DesiredPosition);
        student.AlternativePosition = NullIfWhiteSpace(request.AlternativePosition);
        student.DesiredLocation = NullIfWhiteSpace(request.DesiredLocation);
        student.WorkPreference = NullIfWhiteSpace(request.WorkPreference);
        student.PreferredIndustry = NullIfWhiteSpace(request.PreferredIndustry);
        student.Skills = NullIfWhiteSpace(request.Skills);
        student.ResumeUrl = NullIfWhiteSpace(request.ResumeUrl);
        student.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return _mapper.Map<StudentDto>(student);
    }

    public async Task<bool> DeleteStudentAsync(Guid id)
    {
        var student = await _db.Students
            .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);

        if (student == null)
            return false;

        var internships = await _db.Internships
            .Where(i => i.StudentId == id && !i.IsDeleted)
            .ToListAsync();

        if (internships.Count > 0)
        {
            var internshipIds = internships.Select(i => i.Id).ToList();

            var hasStarted = internships.Any(i => i.Status != InternshipStatus.NotStarted);
            var hasSubmissions = await _db.Submissions.AnyAsync(s => internshipIds.Contains(s.InternshipId) && !s.IsDeleted);
            var hasReports = await _db.WeeklyReports.AnyAsync(w => internshipIds.Contains(w.InternshipId) && !w.IsDeleted);
            var hasEvaluations = await _db.Evaluations.AnyAsync(e => internshipIds.Contains(e.InternshipId) && !e.IsDeleted);
            var hasDocuments = await _db.Documents.AnyAsync(d => d.InternshipId.HasValue && internshipIds.Contains(d.InternshipId.Value) && !d.IsDeleted);

            if (hasStarted || hasSubmissions || hasReports || hasEvaluations || hasDocuments)
            {
                throw new InvalidOperationException(
                    "Không thể xóa sinh viên đã phát sinh hoạt động thực tập (đã có báo cáo, bài nộp, chấm điểm hoặc hồ sơ). " +
                    "Hãy chọn sinh viên chưa có hoạt động để xóa hoặc liên hệ quản trị dữ liệu.");
            }

            // No activity yet (freshly imported into the term) -> safely remove the placeholder
            // internship rows so the student can later be re-imported into the same term.
            _db.Internships.RemoveRange(internships);
        }

        student.IsDeleted = true;
        student.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return true;
    }

    public async Task<bool> StudentCodeExistsAsync(string studentCode, Guid? excludeId = null)
    {
        var normalizedCode = NormalizeStudentCode(studentCode);
        var query = _db.Students.Where(s => s.StudentCode == normalizedCode && !s.IsDeleted);

        if (excludeId.HasValue)
            query = query.Where(s => s.Id != excludeId.Value);

        return await query.AnyAsync();
    }

    public async Task<StudentImportResultDto> ImportStudentsFromExcelAsync(Stream excelStream, Guid? semesterId = null, Guid? departmentId = null, bool grantAccount = false)
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
            return map.ContainsKey(StudentColumn.StudentCode) &&
                   (map.ContainsKey(StudentColumn.FullName) || map.ContainsKey(StudentColumn.Ten) || map.ContainsKey(StudentColumn.Ho));
        }) ?? usedRange.FirstRow();

        var columnMap = BuildColumnMap(headerRow);
        var hasValidNameCol = columnMap.ContainsKey(StudentColumn.FullName) || columnMap.ContainsKey(StudentColumn.Ten) || columnMap.ContainsKey(StudentColumn.Ho);

        if (!columnMap.ContainsKey(StudentColumn.StudentCode) || !hasValidNameCol)
            throw new InvalidOperationException("Excel must include MSSV and HoTen (or Ho/Ten/FullName) columns");

        var errors = new List<StudentImportErrorDto>();
        var emailErrors = new List<StudentImportErrorDto>();
        var created = new List<Student>();
        var allEnrolledStudents = new List<Student>();
        var pendingInvitations = new List<PendingInvitation>();
        var seenInFile = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var seenUsernames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var totalRows = 0;
        var emailSentCount = 0;
        var emailFailedCount = 0;

        var sw = System.Diagnostics.Stopwatch.StartNew();

        var existingStudents = await _db.Students
            .Include(s => s.User)
            .Where(s => !s.IsDeleted)
            .ToDictionaryAsync(s => s.StudentCode, StringComparer.OrdinalIgnoreCase);

        foreach (var row in usedRange.RowsUsed())
        {
            if (row.RowNumber() <= headerRow.RowNumber())
                continue;

            var rowNumber = row.RowNumber();
            var studentCode = GetCell(row, columnMap, StudentColumn.StudentCode);
            var hoTen = GetCell(row, columnMap, StudentColumn.FullName);
            var ho = GetCell(row, columnMap, StudentColumn.Ho);
            var ten = GetCell(row, columnMap, StudentColumn.Ten);
            // Prefer structured Họ + Tên columns (as in Mau-danh-sach-SV.xlsx); only fall
            // back to a combined "Họ tên" column when no separate Họ/Tên columns exist.
            var fullName = ho != null || ten != null
                ? TemplateHelper.CombineFullName(ho, ten, null)
                : TemplateHelper.CombineFullName(null, null, hoTen);
            var className = GetCell(row, columnMap, StudentColumn.Class);
            var major = GetCell(row, columnMap, StudentColumn.Major);
            var email = GetCell(row, columnMap, StudentColumn.Email);
            var phone = GetCell(row, columnMap, StudentColumn.Phone);
            var username = GetCell(row, columnMap, StudentColumn.Username);
            var department = GetCell(row, columnMap, StudentColumn.Department);
            var desiredPosition = GetCell(row, columnMap, StudentColumn.DesiredPosition);
            var skills = GetCell(row, columnMap, StudentColumn.Skills);
            var resumeUrl = GetCell(row, columnMap, StudentColumn.ResumeUrl);

            (email, phone) = TemplateHelper.SanitizeEmailAndPhone(email, phone);

            if (IsBlankRow(studentCode, fullName, className, major, email, phone, username, department, desiredPosition, skills, resumeUrl))
                continue;

            totalRows++;

            if (string.IsNullOrWhiteSpace(studentCode))
            {
                errors.Add(new StudentImportErrorDto { RowNumber = rowNumber, Message = "MSSV is required" });
                continue;
            }

            if (string.IsNullOrWhiteSpace(fullName))
            {
                errors.Add(new StudentImportErrorDto { RowNumber = rowNumber, StudentCode = studentCode, Message = "Full name is required" });
                continue;
            }

            if (studentCode.Length > 50)
            {
                errors.Add(new StudentImportErrorDto { RowNumber = rowNumber, StudentCode = studentCode, Message = "MSSV must not exceed 50 characters" });
                continue;
            }

            if (fullName.Length > 200)
            {
                errors.Add(new StudentImportErrorDto { RowNumber = rowNumber, StudentCode = studentCode, Message = "Full name must not exceed 200 characters" });
                continue;
            }

            if (!string.IsNullOrWhiteSpace(email) && !IsValidEmail(email))
            {
                errors.Add(new StudentImportErrorDto { RowNumber = rowNumber, StudentCode = studentCode, Message = "Invalid email format" });
                continue;
            }

            studentCode = studentCode.Trim();
            fullName = fullName.Trim();

            if (!seenInFile.Add(studentCode))
            {
                errors.Add(new StudentImportErrorDto { RowNumber = rowNumber, StudentCode = studentCode, Message = "Duplicate MSSV in file" });
                continue;
            }

            existingStudents.TryGetValue(studentCode, out var existingStudent);

            if (existingStudent != null)
            {
                existingStudent.FullName = fullName;
                if (!string.IsNullOrWhiteSpace(className))
                    existingStudent.Class = className.Trim();
                if (!string.IsNullOrWhiteSpace(major))
                    existingStudent.Major = major.Trim();
                if (!string.IsNullOrWhiteSpace(email))
                    existingStudent.Email = email.Trim();
                if (!string.IsNullOrWhiteSpace(phone))
                    existingStudent.Phone = phone.Trim();
                if (!string.IsNullOrWhiteSpace(department))
                    existingStudent.Department = department.Trim();
                if (!string.IsNullOrWhiteSpace(desiredPosition))
                    existingStudent.DesiredPosition = desiredPosition.Trim();
                if (!string.IsNullOrWhiteSpace(skills))
                    existingStudent.Skills = skills.Trim();
                if (!string.IsNullOrWhiteSpace(resumeUrl))
                    existingStudent.ResumeUrl = resumeUrl.Trim();
                existingStudent.UpdatedAt = DateTime.UtcNow;

                if (existingStudent.User != null)
                {
                    existingStudent.User.FullName = fullName;
                    if (!string.IsNullOrWhiteSpace(email))
                        existingStudent.User.Email = email.Trim();
                    existingStudent.User.UpdatedAt = DateTime.UtcNow;
                }
                else if (grantAccount && (!string.IsNullOrWhiteSpace(username) || !string.IsNullOrWhiteSpace(email)))
                {
                    if (string.IsNullOrWhiteSpace(username))
                        username = studentCode;

                    if (seenUsernames.Add(username))
                    {
                        try
                        {
                            var ensure = await EnsureStudentUserAsync(username, fullName, email, departmentId);
                            existingStudent.UserId = ensure.UserId;
                            if (ensure.CreatedNew && ensure.TemporaryPassword != null)
                            {
                                pendingInvitations.Add(new PendingInvitation(
                                    rowNumber, studentCode, username, fullName, NullIfWhiteSpace(email), ensure.TemporaryPassword));
                            }
                        }
                        catch (InvalidOperationException)
                        {
                            // Ignore user linkage conflict for existing student
                        }
                    }
                }

                allEnrolledStudents.Add(existingStudent);
                continue;
            }

            if (string.IsNullOrWhiteSpace(username) && !string.IsNullOrWhiteSpace(email))
                username = studentCode;

            Guid? userId = null;
            if (grantAccount && !string.IsNullOrWhiteSpace(username))
            {
                username = username.Trim();
                if (!seenUsernames.Add(username))
                {
                    errors.Add(new StudentImportErrorDto
                    {
                        RowNumber = rowNumber,
                        StudentCode = studentCode,
                        Username = username,
                        Message = "Duplicate username in file"
                    });
                    continue;
                }

                try
                {
                    var ensure = await EnsureStudentUserAsync(username, fullName, email, departmentId);
                    userId = ensure.UserId;
                    if (ensure.CreatedNew && ensure.TemporaryPassword != null)
                    {
                        pendingInvitations.Add(new PendingInvitation(
                            rowNumber, studentCode, username, fullName, NullIfWhiteSpace(email), ensure.TemporaryPassword));
                    }
                }
                catch (InvalidOperationException ex)
                {
                    errors.Add(new StudentImportErrorDto
                    {
                        RowNumber = rowNumber,
                        StudentCode = studentCode,
                        Username = username,
                        Message = ex.Message
                    });
                    continue;
                }
            }

            var newStudent = new Student
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                StudentCode = studentCode,
                FullName = fullName,
                Class = NullIfWhiteSpace(className),
                Major = NullIfWhiteSpace(major),
                Email = NullIfWhiteSpace(email),
                Phone = NullIfWhiteSpace(phone),
                Department = NullIfWhiteSpace(department),
                DepartmentId = departmentId, // Scoped to importing admin's department
                DesiredPosition = NullIfWhiteSpace(desiredPosition),
                Skills = NullIfWhiteSpace(skills),
                ResumeUrl = NullIfWhiteSpace(resumeUrl),
                CreatedAt = DateTime.UtcNow
            };

            created.Add(newStudent);
            allEnrolledStudents.Add(newStudent);
            existingStudents[studentCode] = newStudent;
        }

        if (created.Count > 0)
        {
            await _db.Students.AddRangeAsync(created);
        }
        await _db.SaveChangesAsync();

        // Create internship records for each imported student (new or re-enrolling) in the given semester
        if (semesterId.HasValue && semesterId != Guid.Empty && allEnrolledStudents.Count > 0)
        {
            // Verify semester exists
            var semesterExists = await _db.Semesters.AnyAsync(s => s.Id == semesterId && !s.IsDeleted);
            if (semesterExists)
            {
                var enrolledStudentIds = allEnrolledStudents.Select(s => s.Id).ToList();
                var existingInternshipStudentIds = (await _db.Internships
                    .Where(i => i.SemesterId == semesterId.Value && enrolledStudentIds.Contains(i.StudentId) && !i.IsDeleted)
                    .Select(i => i.StudentId)
                    .ToListAsync())
                    .ToHashSet();

                var internships = new List<Internship>();
                foreach (var student in allEnrolledStudents)
                {
                    if (!existingInternshipStudentIds.Contains(student.Id))
                    {
                        internships.Add(new Internship
                        {
                            Id = Guid.NewGuid(),
                            StudentId = student.Id,
                            SemesterId = semesterId.Value,
                            CompanyId = null, // Nullable: assigned later by lecturer
                            Status = InternshipStatus.NotStarted,
                            Notes = "Nhập từ file Excel",
                            CreatedAt = DateTime.UtcNow
                        });
                        existingInternshipStudentIds.Add(student.Id);
                    }
                }

                if (internships.Count > 0)
                {
                    await _db.Internships.AddRangeAsync(internships);
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
                invite.StudentCode,
                invite.RowNumber);

            if (send.Status == InvitationSendStatus.Sent)
                emailSentCount++;
            else
            {
                emailFailedCount++;
                emailErrors.Add(send.Error!);
            }
        }

        sw.Stop();
        _logger.LogInformation("Imported {TotalRows} student rows (Created: {CreatedCount}, Enrolled: {EnrolledCount}, Errors: {ErrorCount}) in {ElapsedMs}ms",
            totalRows, created.Count, allEnrolledStudents.Count, errors.Count, sw.ElapsedMilliseconds);

        return new StudentImportResultDto
        {
            TotalRows = totalRows,
            SuccessCount = allEnrolledStudents.Count,
            FailedCount = errors.Count,
            SkippedDuplicateCount = 0,
            EmailSentCount = emailSentCount,
            EmailFailedCount = emailFailedCount,
            DefaultPassword = TemporaryPasswordPolicyDescription,
            CreatedStudents = _mapper.Map<List<StudentDto>>(allEnrolledStudents),
            Errors = errors,
            EmailErrors = emailErrors
        };
    }

    public byte[] GetStudentImportTemplate()
    {
        return TemplateHelper.GetTemplateBytes("Mau-danh-sach-SV.xlsx", () =>
        {
            using var workbook = new XLWorkbook();
            var sheet = workbook.Worksheets.Add("Students");

            sheet.Cell(1, 1).Value = "MSSV";
            sheet.Cell(1, 2).Value = "HoTen";
            sheet.Cell(1, 3).Value = "Lop";
            sheet.Cell(1, 4).Value = "Nganh";
            sheet.Cell(1, 5).Value = "Email";
            sheet.Cell(1, 6).Value = "SDT";
            sheet.Cell(1, 7).Value = "Username";
            sheet.Cell(1, 8).Value = "Khoa";
            sheet.Cell(1, 9).Value = "NguyenVong";
            sheet.Cell(1, 10).Value = "KyNang";
            sheet.Cell(1, 11).Value = "CV";

            sheet.Cell(2, 1).Value = "2421160052";
            sheet.Cell(2, 2).Value = "Nguyen Van A";
            sheet.Cell(2, 3).Value = "DH24TIN06";
            sheet.Cell(2, 4).Value = "Cong nghe thong tin";
            sheet.Cell(2, 5).Value = "vana@student.edu.vn";
            sheet.Cell(2, 6).Value = "0901234567";
            sheet.Cell(2, 7).Value = "2421160052";
            sheet.Cell(2, 8).Value = "Cong nghe thong tin";
            sheet.Cell(2, 9).Value = "Backend Developer";
            sheet.Cell(2, 10).Value = "C#, .NET, SQL Server";
            sheet.Cell(2, 11).Value = "https://drive.google.com/cv.pdf";

            sheet.Cell(4, 1).Value = "Ghi chu:";
            sheet.Cell(4, 2).Value =
                "Neu co Email hoac Username thi tao tai khoan login (username mac dinh = MSSV, mat khau tam 8 ky tu ngau nhien). " +
                "Neu co Email thi he thong gui thu moi tham gia (link + username + mat khau). " +
                "Lan dang nhap dau tien bat buoc doi mat khau.";

            sheet.Row(1).Style.Font.Bold = true;
            sheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        });
    }

    public async Task<byte[]> ExportStudentsExcelAsync(Guid? semesterId = null, Guid? lecturerId = null, Guid? departmentId = null)
    {
        var query = _db.Students
            .Include(s => s.Internships)
                .ThenInclude(i => i.Lecturer)
            .Include(s => s.Internships)
                .ThenInclude(i => i.Company)
            .Include(s => s.Internships)
                .ThenInclude(i => i.Semester)
            .Where(s => !s.IsDeleted);

        if (semesterId.HasValue)
        {
            query = query.Where(s => s.Internships.Any(i => i.SemesterId == semesterId.Value && !i.IsDeleted));
        }

        query = ApplyLecturerScope(query, lecturerId);
        query = ApplyDepartmentScope(query, departmentId);

        var students = await query.OrderBy(s => s.StudentCode).ToListAsync();

        var mappings = new Dictionary<string, Func<Student, object?>>
        {
            ["STT"] = s => students.IndexOf(s) + 1,
            ["Mã Sinh Viên (MSSV)"] = s => s.StudentCode,
            ["Họ và Tên"] = s => s.FullName,
            ["Lớp"] = s => s.Class ?? "-",
            ["Ngành học"] = s => s.Major ?? "-",
            ["Khoa"] = s => s.Department ?? "-",
            ["Nguyện vọng vị trí"] = s => s.DesiredPosition ?? "-",
            ["Kỹ năng"] = s => s.Skills ?? "-",
            ["Email"] = s => s.Email ?? "-",
            ["Số điện thoại"] = s => s.Phone ?? "-",
            ["Công ty thực tập"] = s => s.Internships.FirstOrDefault(i => !i.IsDeleted)?.Company?.CompanyName ?? "Chưa phân bổ",
            ["GVHD"] = s => s.Internships.FirstOrDefault(i => !i.IsDeleted)?.Lecturer?.FullName ?? "Chưa phân công",
            ["Học kỳ"] = s => s.Internships.FirstOrDefault(i => !i.IsDeleted)?.Semester?.Name ?? "-",
            ["Trạng thái"] = s => s.Internships.FirstOrDefault(i => !i.IsDeleted)?.Status.ToString() ?? "Chưa có kỳ thực tập",
        };

        return _excelService.ExportToExcel(
            "DanhSachSinhVien",
            "DANH SÁCH SINH VIÊN THỰC TẬP TỔNG HỢP",
            students,
            mappings);
    }

    private async Task<(Guid UserId, bool CreatedNew, string? TemporaryPassword)> EnsureStudentUserAsync(string username, string fullName, string? email, Guid? departmentId = null)
    {
        var existing = await _db.Users.FirstOrDefaultAsync(u => u.Username == username && !u.IsDeleted);
        if (existing != null)
        {
            if (existing.Role != Role.Student)
                throw new InvalidOperationException($"Username '{username}' exists but is not a Student account");

            var linked = await _db.Students.AnyAsync(s => s.UserId == existing.Id && !s.IsDeleted);
            if (linked)
                throw new InvalidOperationException($"Username '{username}' is already linked to a student profile");

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
            Role = Role.Student,
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
        string? studentCode,
        int? rowNumber)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            _logger.LogWarning(
                "Skipped invitation email for student {StudentCode} (username={Username}): no email address",
                studentCode,
                username);

            return InvitationSendOutcome.Skipped(
                new StudentImportErrorDto
                {
                    RowNumber = rowNumber ?? 0,
                    StudentCode = studentCode,
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
                Role = InvitationRole.Student,
                Username = username,
                TemporaryPassword = temporaryPassword
            });

            if (!result.Success)
            {
                _logger.LogWarning(
                    "Failed to send invitation email to student {StudentCode} (username={Username}): {Message}",
                    studentCode,
                    username,
                    result.Message);

                return InvitationSendOutcome.Failed(
                    new StudentImportErrorDto
                    {
                        RowNumber = rowNumber ?? 0,
                        StudentCode = studentCode,
                        Username = username,
                        Message = result.Message ?? "Failed to send invitation email"
                    });
            }

            _logger.LogInformation(
                "Invitation email sent for student {StudentCode} (username={Username}) to {Email}",
                studentCode,
                username,
                email);

            return InvitationSendOutcome.Sent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Exception while sending invitation email for student {StudentCode} (username={Username})",
                studentCode,
                username);

            return InvitationSendOutcome.Failed(
                new StudentImportErrorDto
                {
                    RowNumber = rowNumber ?? 0,
                    StudentCode = studentCode,
                    Username = username,
                    Message = $"Failed to send invitation email: {ex.Message}"
                });
        }
    }

    private enum StudentColumn
    {
        StudentCode,
        FullName,
        Ho,
        Ten,
        Class,
        Major,
        Email,
        Phone,
        Username,
        Department,
        DesiredPosition,
        Skills,
        ResumeUrl
    }

    private enum InvitationSendStatus { Sent, Failed, SkippedNoEmail }

    private sealed record PendingInvitation(
        int RowNumber,
        string StudentCode,
        string Username,
        string FullName,
        string? Email,
        string TemporaryPassword);

    private sealed record InvitationSendOutcome(InvitationSendStatus Status, StudentImportErrorDto? Error)
    {
        public static InvitationSendOutcome Sent() => new(InvitationSendStatus.Sent, null);
        public static InvitationSendOutcome Failed(StudentImportErrorDto error) => new(InvitationSendStatus.Failed, error);
        public static InvitationSendOutcome Skipped(StudentImportErrorDto error) => new(InvitationSendStatus.SkippedNoEmail, error);
    }

    private static Dictionary<StudentColumn, int> BuildColumnMap(IXLRangeRow headerRow)
    {
        // Use fuzzy column matcher with expanded aliases
        var fuzzyResult = FuzzyColumnMatcher.Match(headerRow, StudentColumns, minScore: 50);

        // Map string keys back to enum
        var map = new Dictionary<StudentColumn, int>();
        foreach (var kvp in fuzzyResult)
        {
            if (Enum.TryParse<StudentColumn>(kvp.Key, out var col))
                map[col] = kvp.Value;
        }
        return map;
    }

    private static string NormalizeHeader(string value) =>
        FuzzyColumnMatcher.NormalizeHeader(value);

    private static string RemoveDiacritics(string text) =>
        FuzzyColumnMatcher.NormalizeHeader(text);

    private static string? GetCell(IXLRangeRow row, Dictionary<StudentColumn, int> map, StudentColumn column)
    {
        if (!map.TryGetValue(column, out var colIndex))
            return null;

        var cell = row.Cell(colIndex);
        if (cell.DataType == XLDataType.Number)
            return cell.GetDouble().ToString("0");

        var text = cell.GetString();
        return string.IsNullOrWhiteSpace(text) ? null : text.Trim();
    }

    private static bool IsBlankRow(params string?[] values) =>
        values.All(string.IsNullOrWhiteSpace);

    private static string? NullIfWhiteSpace(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string NormalizeStudentCode(string value) =>
        (value ?? string.Empty).Trim();

    private static bool IsValidEmail(string email) =>
        Regex.IsMatch(email.Trim(), @"^[^@\s]+@[^@\s]+\.[^@\s]+$");
}

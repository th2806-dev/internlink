using AutoMapper;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public class WeeklyReportService : IWeeklyReportService
{
    private const long MaxFileSize = 20 * 1024 * 1024;
    private const string UploadFolder = "uploads/weekly-reports";

    private readonly AppDbContext _db;
    private readonly IMapper _mapper;
    private readonly INotificationService _notificationService;
    private readonly IWebHostEnvironment? _env;
    private readonly IGoogleDriveService? _googleDrive;

    public WeeklyReportService(AppDbContext db, IMapper mapper, INotificationService notificationService)
        : this(db, mapper, notificationService, (IWebHostEnvironment?)null)
    {
    }

    public WeeklyReportService(
        AppDbContext db,
        IMapper mapper,
        INotificationService notificationService,
        IWebHostEnvironment? env)
    {
        _db = db;
        _mapper = mapper;
        _notificationService = notificationService;
        _env = env;
    }

    public WeeklyReportService(
        AppDbContext db,
        IMapper mapper,
        INotificationService notificationService,
        IWebHostEnvironment? env,
        IGoogleDriveService googleDrive)
        : this(db, mapper, notificationService, env)
    {
        _googleDrive = googleDrive;
    }

    public async Task<WeeklyReportDto?> GetByIdAsync(Guid id)
    {
        var report = await _db.WeeklyReports
            .Include(r => r.Internship)
                .ThenInclude(i => i.Semester)
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);

        return report == null ? null : _mapper.Map<WeeklyReportDto>(report);
    }

    public async Task<WeeklyReportDto?> GetByIdAsync(Guid id, Guid userId, bool isLecturerOrAdmin)
    {
        var report = await _db.WeeklyReports
            .Include(r => r.Internship)
                .ThenInclude(i => i.Student)
            .Include(r => r.Internship)
                .ThenInclude(i => i.Semester)
            .Include(r => r.Internship)
                .ThenInclude(i => i.Lecturer)
            .Include(r => r.Feedbacks.Where(f => !f.IsDeleted))
                .ThenInclude(f => f.Lecturer)
            .Include(r => r.Versions)
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);

        if (report == null)
            return null;

        var ownsInternship = report.Internship?.Student?.UserId == userId;
        var isAssignedLecturer = report.Internship?.Lecturer?.UserId == userId;

        if (!isLecturerOrAdmin && !ownsInternship)
            throw new UnauthorizedAccessException("You do not have access to this weekly report");

        if (isLecturerOrAdmin && !isAssignedLecturer && !ownsInternship)
        {
            var isSuperAdmin = await _db.Users
                .AnyAsync(u => u.Id == userId && u.Role == Role.SuperAdmin && !u.IsDeleted);
            if (!isSuperAdmin)
                throw new UnauthorizedAccessException("You do not have access to this weekly report");
        }

        return _mapper.Map<WeeklyReportDto>(report);
    }

    public async Task<IEnumerable<WeeklyReportDto>> GetMineAsync(Guid userId)
    {
        var internship = await GetStudentInternshipAsync(userId);
        if (internship == null)
            return Array.Empty<WeeklyReportDto>();

        var reports = await _db.WeeklyReports
            .Include(r => r.Internship)
                .ThenInclude(i => i.Semester)
            .Include(r => r.Versions)
            .Include(r => r.Feedbacks.Where(f => !f.IsDeleted))
                .ThenInclude(f => f.Lecturer)
            .Where(r => r.InternshipId == internship.Id && !r.IsDeleted)
            .OrderByDescending(r => r.WeekNumber)
            .ToListAsync();

        return _mapper.Map<List<WeeklyReportDto>>(reports);
    }

    public async Task<IEnumerable<WeeklyReportDto>> GetByInternshipAsync(Guid internshipId)
    {
        return await GetByInternshipAsync(internshipId, Guid.Empty, isLecturerOrAdmin: true);
    }

    public async Task<IEnumerable<WeeklyReportDto>> GetByInternshipAsync(Guid internshipId, Guid userId, bool isLecturerOrAdmin)
    {
        if (userId != Guid.Empty)
            await EnsureInternshipAccessAsync(internshipId, userId, isLecturerOrAdmin);

        var reports = await _db.WeeklyReports
            .Include(r => r.Internship)
                .ThenInclude(i => i.Semester)
            .Include(r => r.Versions)
            .Include(r => r.Feedbacks.Where(f => !f.IsDeleted))
                .ThenInclude(f => f.Lecturer)
            .Where(r => r.InternshipId == internshipId && !r.IsDeleted)
            .OrderByDescending(r => r.WeekNumber)
            .ToListAsync();

        return _mapper.Map<List<WeeklyReportDto>>(reports);
    }

    public async Task<WeeklyReportDto> CreateDraftAsync(Guid userId, CreateWeeklyReportRequest request)
    {
        var internship = await _db.Internships
            .Include(i => i.Student)
            .Include(i => i.Semester)
            .FirstOrDefaultAsync(i => i.Id == request.InternshipId && !i.IsDeleted);

        if (internship == null)
            throw new InvalidOperationException("Internship not found");

        if (internship.Semester?.TotalWeeks > 0 && (request.WeekNumber < 1 || request.WeekNumber > internship.Semester.TotalWeeks))
            throw new InvalidOperationException($"Tuần báo cáo phải nằm trong khoảng 1 đến {internship.Semester.TotalWeeks}.");

        if (internship.Student?.UserId != userId)
            throw new UnauthorizedAccessException("Internship does not belong to the current student");

        var duplicate = await _db.WeeklyReports
            .AnyAsync(r => r.InternshipId == request.InternshipId
                           && r.WeekNumber == request.WeekNumber
                           && !r.IsDeleted);

        if (duplicate)
            throw new InvalidOperationException($"A weekly report for week {request.WeekNumber} already exists");

        var report = new WeeklyReport
        {
            Id = Guid.NewGuid(),
            InternshipId = request.InternshipId,
            WeekNumber = request.WeekNumber,
            Title = request.Title,
            Content = request.Content,
            Status = WeeklyReportStatus.Draft,
            CreatedAt = DateTime.UtcNow
        };

        _db.WeeklyReports.Add(report);
        await _db.SaveChangesAsync();

        return _mapper.Map<WeeklyReportDto>(report);
    }

    public async Task<WeeklyReportDto> CreateDraftWithFileAsync(
        Guid userId,
        CreateWeeklyReportRequest request,
        Stream fileStream,
        string originalFileName,
        long fileSize,
        string mimeType)
    {
        ValidateFile(fileStream, originalFileName, fileSize, mimeType);
        var internship = await GetOwnedInternshipAsync(userId, request.InternshipId);
        if (internship == null)
            throw new UnauthorizedAccessException("Internship does not belong to the current student");

        if (internship.Semester?.TotalWeeks > 0 && (request.WeekNumber < 1 || request.WeekNumber > internship.Semester.TotalWeeks))
            throw new InvalidOperationException($"Tuần báo cáo phải nằm trong khoảng 1 đến {internship.Semester.TotalWeeks}.");

        var duplicate = await _db.WeeklyReports.AnyAsync(r =>
            r.InternshipId == request.InternshipId &&
            r.WeekNumber == request.WeekNumber &&
            !r.IsDeleted);
        if (duplicate)
            throw new InvalidOperationException($"A weekly report for week {request.WeekNumber} already exists");

        var (relativePath, savedFileName, fileId) = await StoreFileAsync(fileStream, originalFileName, request.InternshipId, mimeType);
        var report = new WeeklyReport
        {
            Id = Guid.NewGuid(),
            InternshipId = request.InternshipId,
            WeekNumber = request.WeekNumber,
            Title = request.Title,
            Content = savedFileName,
            FileName = originalFileName,
            FileUrl = relativePath,
            GoogleDriveFileId = fileId,
            FileSize = fileSize,
            MimeType = mimeType,
            Status = WeeklyReportStatus.Draft,
            CreatedAt = DateTime.UtcNow,
        };

        _db.WeeklyReports.Add(report);
        await _db.SaveChangesAsync();
        _db.WeeklyReportVersions.Add(new WeeklyReportVersion
        {
            Id = Guid.NewGuid(),
            WeeklyReportId = report.Id,
            Version = report.Version,
            FileName = originalFileName,
            FileUrl = relativePath,
            GoogleDriveFileId = fileId,
            FileSize = fileSize,
            MimeType = mimeType,
            UploadedById = userId,
            UploadedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();
        return _mapper.Map<WeeklyReportDto>(report);
    }

    public async Task<WeeklyReportDto?> UpdateDraftAsync(Guid id, Guid userId, UpdateWeeklyReportRequest request)
    {
        var report = await LoadOwnedReportAsync(id, userId);
        if (report == null)
            return null;

        if (report.Status != WeeklyReportStatus.Draft && report.Status != WeeklyReportStatus.RevisionRequested)
            throw new InvalidOperationException("Only draft or revision-requested reports can be updated");

        if (!string.IsNullOrWhiteSpace(request.Title))
            report.Title = request.Title;

        if (!string.IsNullOrWhiteSpace(request.Content))
            report.Content = request.Content;

        report.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return _mapper.Map<WeeklyReportDto>(report);
    }

    public async Task<WeeklyReportDto?> UpdateDraftWithFileAsync(
        Guid id,
        Guid userId,
        UpdateWeeklyReportRequest request,
        Stream fileStream,
        string originalFileName,
        long fileSize,
        string mimeType)
    {
        ValidateFile(fileStream, originalFileName, fileSize, mimeType);
        var report = await LoadOwnedReportAsync(id, userId);
        if (report == null)
            return null;

        if (report.Status != WeeklyReportStatus.Draft && report.Status != WeeklyReportStatus.RevisionRequested)
            throw new InvalidOperationException("Only draft or revision-requested reports can be updated");

        var oldFileUrl = report.FileUrl;
        var (relativePath, savedFileName, fileId) = await StoreFileAsync(fileStream, originalFileName, report.InternshipId, mimeType);
        if (!string.IsNullOrWhiteSpace(request.Title))
            report.Title = request.Title;
        report.Content = savedFileName;
        report.FileName = originalFileName;
        report.FileUrl = relativePath;
        report.GoogleDriveFileId = fileId;
        report.FileSize = fileSize;
        report.MimeType = mimeType;
        report.Version++;
        report.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        _db.WeeklyReportVersions.Add(new WeeklyReportVersion
        {
            Id = Guid.NewGuid(),
            WeeklyReportId = report.Id,
            Version = report.Version,
            FileName = originalFileName,
            FileUrl = relativePath,
            GoogleDriveFileId = fileId,
            FileSize = fileSize,
            MimeType = mimeType,
            UploadedById = userId,
            UploadedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();
        return _mapper.Map<WeeklyReportDto>(report);
    }

    public async Task<WeeklyReportFileDownloadDto?> DownloadFileAsync(Guid id, Guid userId, bool isLecturerOrAdmin)
    {
        var report = await _db.WeeklyReports
            .Include(r => r.Internship)
                .ThenInclude(i => i.Student)
            .Include(r => r.Internship)
                .ThenInclude(i => i.Lecturer)
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);

        if (report == null || string.IsNullOrWhiteSpace(report.FileUrl))
            return null;

        var ownsInternship = report.Internship.Student?.UserId == userId;
        var isAssignedLecturer = report.Internship.Lecturer?.UserId == userId;
        if (!ownsInternship && !isAssignedLecturer && !isLecturerOrAdmin)
            throw new UnauthorizedAccessException("You do not have access to this file");

        if (isLecturerOrAdmin && !ownsInternship && !isAssignedLecturer)
        {
            var isSuperAdmin = await _db.Users.AnyAsync(u => u.Id == userId && u.Role == Role.SuperAdmin && !u.IsDeleted);
            if (!isSuperAdmin)
                throw new UnauthorizedAccessException("You do not have access to this file");
        }

        if (_googleDrive != null && report.FileUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            return new WeeklyReportFileDownloadDto
            {
                FileContent = await _googleDrive.DownloadAsync(report.FileUrl),
                FileName = report.FileName ?? "weekly-report.pdf",
                MimeType = report.MimeType ?? "application/pdf"
            };
        }

        var fullPath = Path.Combine(GetUploadRoot(), report.FileUrl.Replace("/", Path.DirectorySeparatorChar.ToString()));
        if (!File.Exists(fullPath))
            return null;

        return new WeeklyReportFileDownloadDto
        {
            FileContent = await File.ReadAllBytesAsync(fullPath),
            FileName = report.FileName ?? Path.GetFileName(fullPath),
            MimeType = report.MimeType ?? "application/pdf",
        };
    }

    public async Task<IReadOnlyList<WeeklyReportVersionDto>> GetVersionsAsync(
        Guid reportId,
        Guid userId,
        bool isLecturerOrAdmin)
    {
        var report = await _db.WeeklyReports
            .Include(r => r.Internship)
                .ThenInclude(i => i.Student)
            .Include(r => r.Internship)
                .ThenInclude(i => i.Lecturer)
            .Include(r => r.Versions)
            .FirstOrDefaultAsync(r => r.Id == reportId && !r.IsDeleted);

        if (report == null)
            return Array.Empty<WeeklyReportVersionDto>();

        EnsureReportAccess(report, userId, isLecturerOrAdmin);
        return _mapper.Map<List<WeeklyReportVersionDto>>(
            report.Versions.Where(v => !v.IsDeleted).OrderByDescending(v => v.Version));
    }

    public async Task<WeeklyReportFileDownloadDto?> DownloadVersionAsync(
        Guid versionId,
        Guid userId,
        bool isLecturerOrAdmin)
    {
        var version = await _db.WeeklyReportVersions
            .Include(v => v.WeeklyReport)
                .ThenInclude(r => r.Internship)
                    .ThenInclude(i => i.Student)
            .Include(v => v.WeeklyReport)
                .ThenInclude(r => r.Internship)
                    .ThenInclude(i => i.Lecturer)
            .FirstOrDefaultAsync(v => v.Id == versionId && !v.IsDeleted);

        if (version == null)
            return null;

        EnsureReportAccess(version.WeeklyReport, userId, isLecturerOrAdmin);
        var fullPath = Path.Combine(GetUploadRoot(), version.FileUrl.Replace("/", Path.DirectorySeparatorChar.ToString()));
        if (!File.Exists(fullPath))
            return null;

        return new WeeklyReportFileDownloadDto
        {
            FileContent = await File.ReadAllBytesAsync(fullPath),
            FileName = version.FileName,
            MimeType = version.MimeType,
        };
    }

    public async Task<WeeklyReportDto?> SubmitAsync(Guid id, Guid userId)
    {
        var report = await _db.WeeklyReports
            .Include(r => r.Internship)
                .ThenInclude(i => i.Student)
            .Include(r => r.Internship)
                .ThenInclude(i => i.Lecturer)
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);

        if (report == null)
            return null;

        // Verify ownership
        if (report.Internship?.Student?.UserId != userId)
            throw new UnauthorizedAccessException("Internship does not belong to the current student");

        if (report.Status != WeeklyReportStatus.Draft && report.Status != WeeklyReportStatus.RevisionRequested)
            throw new InvalidOperationException("Only draft or revision-requested reports can be submitted");

        if (report.Internship?.SemesterId != null)
        {
            var schedule = await _db.SemesterReportSchedules
                .FirstOrDefaultAsync(s => s.SemesterId == report.Internship.SemesterId && s.WeekNumber == report.WeekNumber && !s.IsDeleted);

            if (schedule != null && !schedule.IsSubmissionOpen)
            {
                throw new InvalidOperationException($"Bài nộp cho {schedule.Title} hiện đang tạm dừng nhận. Vui lòng liên hệ giảng viên hướng dẫn.");
            }

            if (schedule?.StartDate.HasValue == true && DateTime.UtcNow < schedule.StartDate.Value)
            {
                throw new InvalidOperationException($"Bài nộp cho {schedule.Title} chưa mở nhận trước ngày {schedule.StartDate.Value:dd/MM/yyyy HH:mm}.");
            }

            if (schedule != null && !schedule.AllowLateSubmission && DateTime.UtcNow > schedule.DueDate)
            {
                throw new InvalidOperationException($"Hạn nộp báo cáo tuần {report.WeekNumber} đã kết thúc vào ngày {schedule.DueDate:dd/MM/yyyy HH:mm}. Không cho phép nộp muộn.");
            }
        }

        report.Status = WeeklyReportStatus.Submitted;
        report.SubmittedAt = DateTime.UtcNow;
        report.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Notify the assigned lecturer
        var lecturerUserId = report.Internship?.Lecturer?.UserId;
        var studentName = report.Internship?.Student?.FullName ?? "Sinh viên";
        if (lecturerUserId.HasValue)
        {
            await _notificationService.CreateAsync(new CreateNotificationRequest
            {
                UserId = lecturerUserId.Value,
                Title = $"Sinh viên {studentName} đã nộp Báo cáo tuần {report.WeekNumber}",
                Content = $"Sinh viên {studentName} vừa nộp báo cáo tuần {report.WeekNumber}. Vui lòng xem xét và đánh giá.",
                Link = $"/weekly-reports/{report.Id}"
            });
        }

        return _mapper.Map<WeeklyReportDto>(report);
    }

    public async Task<WeeklyReportDto?> ReviewAsync(Guid id, ReviewWeeklyReportRequest request)
    {
        return await ReviewAsync(id, Guid.Empty, request);
    }

    public async Task<WeeklyReportDto?> ReviewAsync(Guid id, Guid userId, ReviewWeeklyReportRequest request)
    {
        var report = await _db.WeeklyReports
            .Include(r => r.Internship)
                .ThenInclude(i => i.Student)
            .Include(r => r.Internship)
                .ThenInclude(i => i.Lecturer)
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);

        if (report == null)
            return null;

        if (userId != Guid.Empty)
        {
            var isAssigned = report.Internship?.Lecturer?.UserId == userId;
            if (!isAssigned)
            {
                var isSuperAdmin = await _db.Users
                    .AnyAsync(u => u.Id == userId && u.Role == Role.SuperAdmin && !u.IsDeleted);
                if (!isSuperAdmin)
                    throw new UnauthorizedAccessException("You do not have access to this weekly report");
            }
        }

        if (!Enum.TryParse<WeeklyReportStatus>(request.Status, true, out var status))
            throw new InvalidOperationException($"Invalid status: {request.Status}");

        if (status is not (WeeklyReportStatus.Reviewed or WeeklyReportStatus.RevisionRequested or WeeklyReportStatus.Approved))
            throw new InvalidOperationException("Review status must be Reviewed, RevisionRequested, or Approved");

        report.Status = status;
        report.LecturerComment = request.LecturerComment;
        report.UpdatedAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(request.LecturerComment) && report.Internship.Lecturer != null)
        {
            _db.Feedbacks.Add(new Feedback
            {
                Id = Guid.NewGuid(),
                WeeklyReportId = report.Id,
                LecturerId = report.Internship.Lecturer.Id,
                Comment = request.LecturerComment.Trim(),
                IsPublic = true,
                CreatedAt = DateTime.UtcNow,
            });
        }
        await _db.SaveChangesAsync();

        var studentUserId = report.Internship.Student?.UserId;
        if (studentUserId.HasValue)
        {
            var lecturerName = report.Internship.Lecturer?.FullName ?? "Giảng viên";
            var statusText = status switch
            {
                WeeklyReportStatus.Approved => "đã được duyệt",
                WeeklyReportStatus.RevisionRequested => "cần chỉnh sửa lại",
                _ => "đã được nhận xét"
            };
            await _notificationService.CreateAsync(new CreateNotificationRequest
            {
                UserId = studentUserId.Value,
                Title = $"Báo cáo tuần {report.WeekNumber} {statusText}",
                Content = $"Giảng viên {lecturerName} đã đánh giá báo cáo tuần {report.WeekNumber} của bạn: {statusText}.",
                Link = $"/weekly-reports/{report.Id}"
            });
        }

        return _mapper.Map<WeeklyReportDto>(report);
    }

    public async Task<FeedbackDto?> AddStudentReplyAsync(Guid reportId, Guid studentUserId, string comment)
    {
        if (string.IsNullOrWhiteSpace(comment))
            throw new InvalidOperationException("Reply comment is required");

        var report = await _db.WeeklyReports
            .Include(r => r.Internship)
                .ThenInclude(i => i.Student)
            .Include(r => r.Internship)
                .ThenInclude(i => i.Lecturer)
            .FirstOrDefaultAsync(r => r.Id == reportId && !r.IsDeleted);

        if (report == null)
            return null;
        if (report.Internship.Student?.UserId != studentUserId)
            throw new UnauthorizedAccessException("You can only reply to your own weekly report");

        var feedback = new Feedback
        {
            Id = Guid.NewGuid(),
            WeeklyReportId = reportId,
            LecturerId = null,
            Comment = comment.Trim(),
            IsPublic = true,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Feedbacks.Add(feedback);
        await _db.SaveChangesAsync();

        var lecturerUserId = report.Internship.Lecturer?.UserId;
        if (lecturerUserId.HasValue)
        {
            await _notificationService.CreateAsync(new CreateNotificationRequest
            {
                UserId = lecturerUserId.Value,
                Title = "Sinh viên phản hồi báo cáo tuần",
                Content = $"Sinh viên phản hồi về báo cáo tuần {report.WeekNumber}.",
                Link = $"/weekly-reports/{reportId}"
            });
        }

        await _db.Entry(feedback).Reference(f => f.Lecturer).LoadAsync();
        return _mapper.Map<FeedbackDto>(feedback);
    }

    public async Task<bool> MarkFeedbacksReadAsync(Guid reportId, Guid userId, bool isLecturer)
    {
        var report = await _db.WeeklyReports
            .Include(r => r.Internship)
                .ThenInclude(i => i.Student)
            .Include(r => r.Internship)
                .ThenInclude(i => i.Lecturer)
            .Include(r => r.Feedbacks)
            .FirstOrDefaultAsync(r => r.Id == reportId && !r.IsDeleted);
        if (report == null)
            return false;

        var owns = report.Internship.Student?.UserId == userId;
        var assigned = report.Internship.Lecturer?.UserId == userId;
        var isSuperAdmin = isLecturer && await _db.Users.AnyAsync(u =>
            u.Id == userId && u.Role == Role.SuperAdmin && !u.IsDeleted);
        if ((!isLecturer && !owns) || (isLecturer && !assigned && !isSuperAdmin))
            throw new UnauthorizedAccessException("You do not have access to this feedback thread");

        var now = DateTime.UtcNow;
        foreach (var feedback in report.Feedbacks.Where(f => !f.IsDeleted))
        {
            if (isLecturer && feedback.LecturerId == null)
                feedback.LecturerReadAt = now;
            else if (!isLecturer && feedback.LecturerId != null)
                feedback.StudentReadAt = now;
        }
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SoftDeleteAsync(Guid id, Guid userId)
    {
        var report = await LoadOwnedReportAsync(id, userId);
        if (report == null)
            return false;

        if (report.Status != WeeklyReportStatus.Draft)
            throw new InvalidOperationException("Only draft reports can be deleted");

        report.IsDeleted = true;
        report.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    private async Task<WeeklyReport?> LoadOwnedReportAsync(Guid id, Guid userId)
    {
        var report = await _db.WeeklyReports
            .Include(r => r.Internship)
                .ThenInclude(i => i.Student)
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);

        if (report == null)
            return null;

        if (report.Internship.Student?.UserId != userId)
            throw new UnauthorizedAccessException("Weekly report does not belong to the current student");

        return report;
    }

    private static void EnsureReportAccess(WeeklyReport report, Guid userId, bool isLecturerOrAdmin)
    {
        var ownsInternship = report.Internship.Student?.UserId == userId;
        var isAssignedLecturer = report.Internship.Lecturer?.UserId == userId;
        if (!ownsInternship && !isAssignedLecturer && !isLecturerOrAdmin)
            throw new UnauthorizedAccessException("You do not have access to this weekly report");
    }

    private async Task EnsureInternshipAccessAsync(Guid internshipId, Guid userId, bool isLecturerOrAdmin)
    {
        var internship = await _db.Internships
            .Include(i => i.Student)
            .Include(i => i.Lecturer)
            .FirstOrDefaultAsync(i => i.Id == internshipId && !i.IsDeleted);

        if (internship == null)
            throw new UnauthorizedAccessException("You do not have access to this weekly report");

        var ownsInternship = internship.Student?.UserId == userId;
        var isAssignedLecturer = internship.Lecturer?.UserId == userId;

        if (!isLecturerOrAdmin && !ownsInternship)
            throw new UnauthorizedAccessException("You do not have access to this weekly report");

        if (isLecturerOrAdmin && !isAssignedLecturer && !ownsInternship)
        {
            var isSuperAdmin = await _db.Users
                .AnyAsync(u => u.Id == userId && u.Role == Role.SuperAdmin && !u.IsDeleted);
            if (!isSuperAdmin)
                throw new UnauthorizedAccessException("You do not have access to this weekly report");
        }
    }

    private async Task<Internship?> GetStudentInternshipAsync(Guid userId)
    {
        var activeSemesterId = await _db.Semesters
            .Where(s => !s.IsDeleted && s.Status == SemesterStatus.Active)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => (Guid?)s.Id)
            .FirstOrDefaultAsync();

        var query = _db.Internships
            .Include(i => i.Student)
            .Where(i => !i.IsDeleted && i.Student != null && i.Student.UserId == userId);

        if (activeSemesterId.HasValue)
            query = query.Where(i => i.SemesterId == activeSemesterId.Value);

        return await query
            .OrderByDescending(i => i.CreatedAt)
            .ThenByDescending(i => i.Id)
            .FirstOrDefaultAsync();
    }

    private async Task<Internship?> GetOwnedInternshipAsync(Guid userId, Guid internshipId)
    {
        return await _db.Internships
            .Include(i => i.Student)
            .Include(i => i.Semester)
            .FirstOrDefaultAsync(i => i.Id == internshipId && !i.IsDeleted && i.Student != null && i.Student.UserId == userId);
    }

    private static void ValidateFile(Stream fileStream, string originalFileName, long fileSize, string mimeType)
    {
        if (fileStream == null || fileSize <= 0 || fileSize > MaxFileSize)
            throw new InvalidOperationException("File must be between 1 byte and 20 MB");
        if (!string.Equals(Path.GetExtension(originalFileName), ".pdf", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Only PDF files are accepted");
        if (!string.Equals(mimeType, "application/pdf", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("The uploaded file must have PDF content type");
    }

    private async Task<(string RelativePath, string SavedFileName)> SaveFileAsync(
        Stream fileStream,
        string originalFileName,
        Guid internshipId)
    {
        var uploadPath = Path.Combine(GetUploadRoot(), UploadFolder, internshipId.ToString());
        Directory.CreateDirectory(uploadPath);
        var safeBase = Path.GetFileNameWithoutExtension(originalFileName);
        var savedFileName = $"{Guid.NewGuid()}_{safeBase}.pdf";
        var fullPath = Path.Combine(uploadPath, savedFileName);
        await using var stream = new FileStream(fullPath, FileMode.CreateNew);
        await fileStream.CopyToAsync(stream);
        return (
            Path.Combine(UploadFolder, internshipId.ToString(), savedFileName).Replace("\\", "/"),
            savedFileName);
    }

    private async Task<(string RelativePath, string SavedFileName, string? FileId)> StoreFileAsync(
        Stream fileStream, string originalFileName, Guid internshipId, string mimeType)
    {
        if (_googleDrive == null)
        {
            var local = await SaveFileAsync(fileStream, originalFileName, internshipId);
            return (local.RelativePath, local.SavedFileName, null);
        }
        var uploaded = await _googleDrive.UploadAsync(fileStream, originalFileName, mimeType);
        return (uploaded.WebViewLink, uploaded.FileName, uploaded.FileId);
    }

    private void DeleteStoredFile(string? relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
            return;

        var fullPath = Path.Combine(GetUploadRoot(), relativePath.Replace("/", Path.DirectorySeparatorChar.ToString()));
        if (File.Exists(fullPath))
            File.Delete(fullPath);
    }

    private string GetUploadRoot() =>
        _env == null
            ? Directory.GetCurrentDirectory()
            : string.IsNullOrEmpty(_env.WebRootPath) ? _env.ContentRootPath : _env.WebRootPath;
}

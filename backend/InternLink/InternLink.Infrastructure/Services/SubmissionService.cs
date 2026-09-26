using AutoMapper;
using System.IO.Compression;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public class SubmissionService : ISubmissionService
{
    private readonly AppDbContext _db;
    private readonly IMapper _mapper;
    private readonly INotificationService _notificationService;
    private readonly IWebHostEnvironment _env;

    private const string UploadFolder = "uploads/submissions";
    private static readonly string[] AllowedExtensions =
    {
        ".zip", ".rar", ".pdf", ".pptx", ".ppt", ".mp4", ".mov", ".sql", ".docx", ".doc",
        ".png", ".jpg", ".jpeg", ".webp", ".gif",
    };

    public SubmissionService(
        AppDbContext db,
        IMapper mapper,
        INotificationService notificationService,
        IWebHostEnvironment env)
    {
        _db = db;
        _mapper = mapper;
        _notificationService = notificationService;
        _env = env;
    }

    public async Task<SubmissionDto?> GetByIdAsync(Guid id)
    {
        var submission = await _db.Submissions
            .Include(s => s.Assets.Where(a => !a.IsDeleted))
            .Include(s => s.Feedbacks.Where(f => !f.IsDeleted))
                .ThenInclude(f => f.Lecturer)
            .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);

        return submission == null ? null : _mapper.Map<SubmissionDto>(submission);
    }

    public async Task<SubmissionDto?> GetByIdAsync(Guid id, Guid userId, bool isLecturerOrAdmin)
    {
        var submission = await _db.Submissions
            .Include(s => s.Internship)
                .ThenInclude(i => i.Student)
            .Include(s => s.Internship)
                .ThenInclude(i => i.Lecturer)
            .Include(s => s.Assets.Where(a => !a.IsDeleted))
            .Include(s => s.Feedbacks.Where(f => !f.IsDeleted))
                .ThenInclude(f => f.Lecturer)
            .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);

        if (submission == null)
            return null;

        var ownsInternship = submission.Internship.Student?.UserId == userId;
        var isAssignedLecturer = submission.Internship.Lecturer?.UserId == userId;

        if (!isLecturerOrAdmin && !ownsInternship)
            throw new UnauthorizedAccessException(InternLink.Shared.Responses.ErrorMessage.NoAccessSubmission);

        if (isLecturerOrAdmin && !isAssignedLecturer && !ownsInternship)
        {
            var isSuperAdmin = await _db.Users
                .AnyAsync(u => u.Id == userId && u.Role == Role.SuperAdmin && !u.IsDeleted);
            if (!isSuperAdmin)
                throw new UnauthorizedAccessException(InternLink.Shared.Responses.ErrorMessage.NoAccessSubmission);
        }

        return _mapper.Map<SubmissionDto>(submission);
    }

    public async Task<IEnumerable<SubmissionDto>> GetByInternshipAsync(Guid internshipId)
    {
        return await GetByInternshipAsync(internshipId, Guid.Empty, isLecturerOrAdmin: true);
    }

    public async Task<IEnumerable<SubmissionDto>> GetByInternshipAsync(Guid internshipId, Guid userId, bool isLecturerOrAdmin)
    {
        if (userId != Guid.Empty)
            await EnsureInternshipAccessAsync(internshipId, userId, isLecturerOrAdmin);

        var submissions = await _db.Submissions
            .Where(s => s.InternshipId == internshipId && !s.IsDeleted)
            .Include(s => s.Assets.Where(a => !a.IsDeleted))
            .Include(s => s.Feedbacks.Where(f => !f.IsDeleted))
                .ThenInclude(f => f.Lecturer)
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync();

        return _mapper.Map<List<SubmissionDto>>(submissions);
    }

    public async Task<IEnumerable<SubmissionDto>> GetMineAsync(Guid userId)
    {
        var internship = await GetStudentInternshipAsync(userId);
        if (internship == null)
            return Array.Empty<SubmissionDto>();

        return await GetByInternshipAsync(internship.Id);
    }

    public async Task<SubmissionDto> CreateAsync(Guid userId, CreateSubmissionRequest request)
    {
        var internship = await _db.Internships
            .Include(i => i.Student)
            .Include(i => i.Semester)
            .FirstOrDefaultAsync(i => i.Id == request.InternshipId && !i.IsDeleted);

        if (internship == null)
            throw new InvalidOperationException(InternLink.Shared.Responses.ErrorMessage.InternshipNotFound);

        if (internship.Student?.UserId != userId)
            throw new UnauthorizedAccessException(InternLink.Shared.Responses.ErrorMessage.NotOwnerInternship);

        if (!Enum.TryParse<SubmissionType>(request.Type, true, out var type))
            throw new InvalidOperationException(InternLink.Shared.Responses.ErrorMessage.InvalidSubmissionTypeDetail(request.Type));

        if (type == SubmissionType.Product && !await _db.Submissions.AnyAsync(s =>
            s.InternshipId == request.InternshipId &&
            s.Type == SubmissionType.FinalReport &&
            !s.IsDeleted))
            throw new InvalidOperationException("Báo cáo thực tập tốt nghiệp là sản phẩm bắt buộc trước khi nộp sản phẩm thực tế.");

        if (internship.SemesterId.HasValue && type == SubmissionType.FinalReport)
        {
            var totalWeeks = Math.Max(internship.Semester?.TotalWeeks ?? 1, 1);
            var schedule = await _db.SemesterReportSchedules.FirstOrDefaultAsync(s =>
                s.SemesterId == internship.SemesterId.Value && s.WeekNumber == totalWeeks + 1 && !s.IsDeleted);
            if (schedule != null)
            {
                if (!schedule.IsSubmissionOpen)
                    throw new InvalidOperationException("Báo cáo cuối kỳ hiện đang tạm dừng nhận.");
                if (schedule.StartDate.HasValue && DateTime.UtcNow < schedule.StartDate.Value)
                    throw new InvalidOperationException($"Báo cáo cuối kỳ chưa mở nhận trước ngày {schedule.StartDate.Value:dd/MM/yyyy HH:mm}.");
                if (!schedule.AllowLateSubmission && DateTime.UtcNow > schedule.DueDate)
                    throw new InvalidOperationException($"Hạn nộp báo cáo cuối kỳ đã kết thúc vào ngày {schedule.DueDate:dd/MM/yyyy HH:mm}.");
            }
        }

        var submission = new Submission
        {
            Id = Guid.NewGuid(),
            InternshipId = request.InternshipId,
            Type = type,
            Status = SubmissionStatus.Submitted,
            Version = 1,
            Title = request.Title,
            Description = request.Description,
            FileName = request.FileName,
            FileUrl = request.FileUrl,
            SubmittedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        _db.Submissions.Add(submission);
        await _db.SaveChangesAsync();
        return (await GetByIdAsync(submission.Id))!;
    }

    public async Task<SubmissionDto> CreateWithFileAsync(
        Guid userId,
        CreateSubmissionRequest request,
        Stream fileStream,
        string originalFileName)
    {
        var (relativePath, savedFileName) = await SaveSubmissionFileAsync(fileStream, originalFileName, request.InternshipId);

        request.FileName = savedFileName;
        request.FileUrl = relativePath;
        return await CreateAsync(userId, request);
    }

    public async Task<SubmissionDto> CreateBundleAsync(
        Guid userId,
        CreateSubmissionRequest request,
        IEnumerable<(Stream Stream, string FileName, long Length, string? ContentType)> files,
        IEnumerable<SubmissionAssetInput> links)
    {
        if (!Enum.TryParse<SubmissionType>(request.Type, true, out var type))
            throw new InvalidOperationException(InternLink.Shared.Responses.ErrorMessage.InvalidSubmissionTypeDetail(request.Type));

        var internship = await _db.Internships
            .Include(i => i.Student)
            .FirstOrDefaultAsync(i => i.Id == request.InternshipId && !i.IsDeleted);
        if (internship == null)
            throw new InvalidOperationException(InternLink.Shared.Responses.ErrorMessage.InternshipNotFound);
        if (internship.Student?.UserId != userId)
            throw new UnauthorizedAccessException(InternLink.Shared.Responses.ErrorMessage.NotOwnerInternship);

        var fileItems = files.ToList();
        var linkItems = links
            .Where(link => !string.IsNullOrWhiteSpace(link.Url))
            .ToList();
        if (fileItems.Count == 0 && linkItems.Count == 0)
            throw new InvalidOperationException("At least one file or link is required");

        if (type == SubmissionType.Product)
        {
            var hasFinalReport = await _db.Submissions.AnyAsync(s =>
                s.InternshipId == request.InternshipId &&
                s.Type == SubmissionType.FinalReport &&
                !s.IsDeleted);
            if (!hasFinalReport)
                throw new InvalidOperationException("Báo cáo thực tập tốt nghiệp là sản phẩm bắt buộc trước khi nộp sản phẩm thực tế.");
        }

        var submission = new Submission
        {
            Id = Guid.NewGuid(),
            InternshipId = request.InternshipId,
            Type = type,
            Status = SubmissionStatus.Submitted,
            Version = 1,
            Title = request.Title,
            Description = request.Description,
            SubmittedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
        };

        foreach (var file in fileItems)
        {
            var (relativePath, savedFileName) = await SaveSubmissionFileAsync(file.Stream, file.FileName, request.InternshipId);
            submission.Assets.Add(new SubmissionAsset
            {
                Id = Guid.NewGuid(),
                Label = file.FileName,
                FileName = savedFileName,
                FileUrl = relativePath,
                AssetType = "file",
                FileSize = file.Length,
                MimeType = file.ContentType,
                UploadedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
            });
            await file.Stream.DisposeAsync();
        }

        foreach (var link in linkItems)
        {
            submission.Assets.Add(new SubmissionAsset
            {
                Id = Guid.NewGuid(),
                Label = string.IsNullOrWhiteSpace(link.Label) ? link.Url : link.Label,
                FileUrl = link.Url.Trim(),
                AssetType = "link",
                UploadedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
            });
        }

        _db.Submissions.Add(submission);
        await _db.SaveChangesAsync();
        return (await GetByIdAsync(submission.Id))!;
    }

    public async Task<SubmissionDto?> ResubmitAsync(Guid id, Guid userId, ResubmitRequest request)
    {
        var existing = await _db.Submissions
            .Include(s => s.Internship)
                .ThenInclude(i => i.Student)
            .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);

        if (existing == null)
            return null;

        if (existing.Internship.Student?.UserId != userId)
            throw new UnauthorizedAccessException(InternLink.Shared.Responses.ErrorMessage.NotOwnerSubmission);

        if (existing.Status != SubmissionStatus.RevisionRequested)
            throw new InvalidOperationException("Resubmit is only allowed when status is RevisionRequested");

        var maxVersion = await _db.Submissions
            .Where(s => s.InternshipId == existing.InternshipId
                        && s.Type == existing.Type
                        && !s.IsDeleted)
            .MaxAsync(s => (int?)s.Version) ?? existing.Version;

        var resubmission = new Submission
        {
            Id = Guid.NewGuid(),
            InternshipId = existing.InternshipId,
            Type = existing.Type,
            Status = SubmissionStatus.Submitted,
            Version = maxVersion + 1,
            Title = request.Title ?? existing.Title,
            Description = request.Description ?? existing.Description,
            FileName = request.FileName ?? existing.FileName,
            FileUrl = request.FileUrl ?? existing.FileUrl,
            SubmittedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        _db.Submissions.Add(resubmission);
        await _db.SaveChangesAsync();

        return await GetByIdAsync(resubmission.Id);
    }

    public async Task<SubmissionDto?> ResubmitWithFileAsync(
        Guid id,
        Guid userId,
        ResubmitRequest request,
        Stream fileStream,
        string originalFileName)
    {
        var existing = await _db.Submissions
            .Include(s => s.Internship)
                .ThenInclude(i => i.Student)
            .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);

        if (existing == null)
            return null;

        var (relativePath, savedFileName) = await SaveSubmissionFileAsync(fileStream, originalFileName, existing.InternshipId);

        request.FileName = savedFileName;
        request.FileUrl = relativePath;
        return await ResubmitAsync(id, userId, request);
    }

    public async Task<SubmissionFileDownloadDto?> DownloadFileAsync(
        Guid submissionId,
        Guid userId,
        bool isLecturerOrAdmin)
    {
        var submission = await _db.Submissions
            .Include(s => s.Internship)
                .ThenInclude(i => i.Student)
            .Include(s => s.Internship)
                .ThenInclude(i => i.Lecturer)
            .FirstOrDefaultAsync(s => s.Id == submissionId && !s.IsDeleted);

        if (submission == null || string.IsNullOrWhiteSpace(submission.FileUrl))
            return null;

        var ownsInternship = submission.Internship.Student?.UserId == userId;
        var isAssignedLecturer = submission.Internship.Lecturer?.UserId == userId;

        if (!isLecturerOrAdmin && !ownsInternship)
            throw new UnauthorizedAccessException(InternLink.Shared.Responses.ErrorMessage.NoAccessFile);

        if (isLecturerOrAdmin && !isAssignedLecturer && !ownsInternship)
        {
            // SuperAdmin may download any submission file
            var isSuperAdmin = await _db.Users
                .AnyAsync(u => u.Id == userId && u.Role == Role.SuperAdmin && !u.IsDeleted);
            if (!isSuperAdmin)
                throw new UnauthorizedAccessException(InternLink.Shared.Responses.ErrorMessage.NoAccessFile);
        }

        if (Uri.TryCreate(submission.FileUrl, UriKind.Absolute, out var submissionUri) &&
            (submissionUri.Scheme == Uri.UriSchemeHttp || submissionUri.Scheme == Uri.UriSchemeHttps))
            return null;

        var fullPath = ResolveUploadPath(submission.FileUrl);
        if (!File.Exists(fullPath))
            return null;

        var extension = Path.GetExtension(submission.FileName ?? fullPath).ToLowerInvariant();
        return new SubmissionFileDownloadDto
        {
            FileContent = await File.ReadAllBytesAsync(fullPath),
            FileName = submission.FileName ?? Path.GetFileName(fullPath),
            MimeType = GetMimeType(extension),
        };
    }

    public async Task<SubmissionFileDownloadDto?> DownloadAssetAsync(
        Guid submissionId,
        Guid assetId,
        Guid userId,
        bool isLecturerOrAdmin)
    {
        var submission = await _db.Submissions
            .Include(s => s.Internship)
                .ThenInclude(i => i.Student)
            .Include(s => s.Internship)
                .ThenInclude(i => i.Lecturer)
            .Include(s => s.Assets)
            .FirstOrDefaultAsync(s => s.Id == submissionId && !s.IsDeleted);
        var asset = submission?.Assets.FirstOrDefault(a => a.Id == assetId && !a.IsDeleted);
        if (submission == null || asset == null || asset.AssetType != "file" || string.IsNullOrWhiteSpace(asset.FileUrl))
            return null;

        var ownsInternship = submission.Internship.Student?.UserId == userId;
        var isAssignedLecturer = submission.Internship.Lecturer?.UserId == userId;
        var isSuperAdmin = isLecturerOrAdmin && await _db.Users.AnyAsync(u =>
            u.Id == userId && u.Role == Role.SuperAdmin && !u.IsDeleted);
        if ((!isLecturerOrAdmin && !ownsInternship) ||
            (isLecturerOrAdmin && !isAssignedLecturer && !ownsInternship && !isSuperAdmin))
            throw new UnauthorizedAccessException(InternLink.Shared.Responses.ErrorMessage.NoAccessFile);

        var fullPath = ResolveUploadPath(asset.FileUrl);
        if (!File.Exists(fullPath))
            return null;

        return new SubmissionFileDownloadDto
        {
            FileContent = await File.ReadAllBytesAsync(fullPath),
            FileName = asset.FileName ?? Path.GetFileName(fullPath),
            MimeType = asset.MimeType ?? GetMimeType(Path.GetExtension(fullPath).ToLowerInvariant()),
        };
    }

    public async Task<SubmissionZipDownloadDto?> DownloadZipAsync(IEnumerable<Guid> submissionIds, Guid userId)
    {
        var ids = submissionIds.Distinct().ToList();
        if (ids.Count == 0)
            throw new InvalidOperationException("At least one submission is required");

        var isSuperAdmin = await _db.Users.AnyAsync(u => u.Id == userId && u.Role == Role.SuperAdmin && !u.IsDeleted);
        var submissions = await _db.Submissions
            .Include(s => s.Internship)
                .ThenInclude(i => i.Lecturer)
            .Where(s => ids.Contains(s.Id) && !s.IsDeleted)
            .ToListAsync();

        if (submissions.Count != ids.Count)
            throw new InvalidOperationException(InternLink.Shared.Responses.ErrorMessage.SubmissionNotFound);
        if (!isSuperAdmin && submissions.Any(s => s.Internship.Lecturer?.UserId != userId))
            throw new UnauthorizedAccessException("You can only download submissions assigned to you");

        await using var output = new MemoryStream();
        using (var archive = new ZipArchive(output, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var submission in submissions)
            {
                if (string.IsNullOrWhiteSpace(submission.FileUrl))
                    continue;

                var fullPath = ResolveUploadPath(submission.FileUrl);
                if (!File.Exists(fullPath))
                    continue;

                var entryName = $"{submission.InternshipId}_{submission.FileName ?? Path.GetFileName(fullPath)}";
                var entry = archive.CreateEntry(entryName, CompressionLevel.Fastest);
                await using var entryStream = entry.Open();
                await using var fileStream = File.OpenRead(fullPath);
                await fileStream.CopyToAsync(entryStream);
            }
        }

        return new SubmissionZipDownloadDto
        {
            FileContent = output.ToArray(),
            FileName = $"submissions_{DateTime.UtcNow:yyyyMMdd_HHmmss}.zip",
        };
    }

    public async Task<SubmissionDto?> UpdateStatusAsync(Guid id, UpdateSubmissionStatusRequest request, Guid? actorUserId = null)
    {
        var submission = await _db.Submissions
            .Include(s => s.Internship)
                .ThenInclude(i => i.Student)
            .Include(s => s.Internship)
                .ThenInclude(i => i.Lecturer)
            .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);

        if (submission == null)
            return null;

        if (actorUserId.HasValue)
            await EnsureSubmissionActorAccessAsync(submission, actorUserId.Value);

        if (!Enum.TryParse<SubmissionStatus>(request.Status, true, out var status))
            throw new InvalidOperationException(InternLink.Shared.Responses.ErrorMessage.InvalidStatusValueDetail(request.Status));

        submission.Status = status;
        submission.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<bool> SoftDeleteAsync(Guid id, Guid? actorUserId = null)
    {
        var submission = await _db.Submissions
            .Include(s => s.Internship)
                .ThenInclude(i => i.Student)
            .Include(s => s.Internship)
                .ThenInclude(i => i.Lecturer)
            .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);

        if (submission == null)
            return false;

        if (actorUserId.HasValue)
            await EnsureSubmissionActorAccessAsync(submission, actorUserId.Value);

        submission.IsDeleted = true;
        submission.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<FeedbackDto>> GetFeedbacksAsync(Guid submissionId, Guid userId, bool isLecturer)
    {
        var submission = await _db.Submissions
            .Include(s => s.Internship)
                .ThenInclude(i => i.Student)
            .Include(s => s.Feedbacks.Where(f => !f.IsDeleted))
                .ThenInclude(f => f.Lecturer)
            .FirstOrDefaultAsync(s => s.Id == submissionId && !s.IsDeleted);

        if (submission == null)
            return Array.Empty<FeedbackDto>();

        IEnumerable<Feedback> feedbacks = submission.Feedbacks;

        if (!isLecturer)
        {
            var ownsInternship = submission.Internship.Student?.UserId == userId;
            if (!ownsInternship)
                throw new UnauthorizedAccessException(InternLink.Shared.Responses.ErrorMessage.NoAccessFeedback);

            feedbacks = feedbacks.Where(f => f.IsPublic);
        }

        return _mapper.Map<List<FeedbackDto>>(feedbacks.OrderByDescending(f => f.CreatedAt));
    }

    public async Task<FeedbackDto?> AddFeedbackAsync(Guid submissionId, Guid userId, CreateFeedbackRequest request)
    {
        var lecturerId = await ResolveLecturerIdAsync(userId)
            ?? throw new UnauthorizedAccessException(InternLink.Shared.Responses.ErrorMessage.LecturerProfileMissing);

        var submission = await _db.Submissions
            .Include(s => s.Internship)
                .ThenInclude(i => i.Student)
            .Include(s => s.Internship)
                .ThenInclude(i => i.Lecturer)
            .FirstOrDefaultAsync(s => s.Id == submissionId && !s.IsDeleted);

        if (submission == null)
            return null;

        var isAssignedLecturer = submission.Internship.Lecturer?.UserId == userId
            || await _db.Users.AnyAsync(u => u.Id == userId && u.Role == Role.SuperAdmin && !u.IsDeleted);
        if (!isAssignedLecturer)
            throw new UnauthorizedAccessException("You do not have permission to review this submission");

        var newStatus = ResolveFeedbackStatus(request.NewStatus);
        submission.Status = newStatus;
        submission.UpdatedAt = DateTime.UtcNow;

        var feedback = new Feedback
        {
            Id = Guid.NewGuid(),
            SubmissionId = submissionId,
            LecturerId = lecturerId,
            Comment = request.Comment,
            IsPublic = request.IsPublic,
            CreatedAt = DateTime.UtcNow
        };

        _db.Feedbacks.Add(feedback);
        await _db.SaveChangesAsync();

        var studentUserId = submission.Internship.Student?.UserId;
        if (studentUserId.HasValue)
        {
            await _notificationService.CreateAsync(new CreateNotificationRequest
            {
                UserId = studentUserId.Value,
                Title = "New feedback on your submission",
                Content = $"Your submission \"{submission.Title ?? submission.Type.ToString()}\" received feedback.",
                Link = $"/submissions/{submission.Id}"
            });
        }

        await _db.Entry(feedback).Reference(f => f.Lecturer).LoadAsync();
        return _mapper.Map<FeedbackDto>(feedback);
    }

    public async Task<FeedbackDto?> UpdateFeedbackAsync(Guid feedbackId, Guid userId, UpdateFeedbackRequest request)
    {
        var feedback = await _db.Feedbacks
            .Include(f => f.Lecturer)
            .FirstOrDefaultAsync(f => f.Id == feedbackId && !f.IsDeleted);

        if (feedback == null)
            return null;

        if (feedback.Lecturer?.UserId != userId)
            throw new UnauthorizedAccessException(InternLink.Shared.Responses.ErrorMessage.OnlyOwnFeedback);

        feedback.Comment = request.Comment;
        feedback.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return _mapper.Map<FeedbackDto>(feedback);
    }

    private async Task EnsureInternshipAccessAsync(Guid internshipId, Guid userId, bool isLecturerOrAdmin)
    {
        var internship = await _db.Internships
            .Include(i => i.Student)
            .Include(i => i.Lecturer)
            .FirstOrDefaultAsync(i => i.Id == internshipId && !i.IsDeleted);

        if (internship == null)
            throw new UnauthorizedAccessException(InternLink.Shared.Responses.ErrorMessage.NoAccessInternshipDocuments);

        await EnsureInternshipActorAccessAsync(internship, userId, isLecturerOrAdmin);
    }

    private async Task EnsureSubmissionActorAccessAsync(Submission submission, Guid userId)
    {
        await EnsureInternshipActorAccessAsync(submission.Internship, userId, isLecturerOrAdmin: true);
    }

    private async Task EnsureInternshipActorAccessAsync(Internship internship, Guid userId, bool isLecturerOrAdmin)
    {
        var ownsInternship = internship.Student?.UserId == userId;
        var isAssignedLecturer = internship.Lecturer?.UserId == userId;

        if (!isLecturerOrAdmin && !ownsInternship)
            throw new UnauthorizedAccessException(InternLink.Shared.Responses.ErrorMessage.NoAccessSubmission);

        if (isLecturerOrAdmin && !isAssignedLecturer && !ownsInternship)
        {
            var isSuperAdmin = await _db.Users
                .AnyAsync(u => u.Id == userId && u.Role == Role.SuperAdmin && !u.IsDeleted);
            if (!isSuperAdmin)
                throw new UnauthorizedAccessException(InternLink.Shared.Responses.ErrorMessage.NoAccessSubmission);
        }
    }

    private async Task<Guid?> ResolveLecturerIdAsync(Guid userId)
    {
        return await _db.Lecturers
            .Where(l => l.UserId == userId && !l.IsDeleted)
            .Select(l => (Guid?)l.Id)
            .FirstOrDefaultAsync();
    }

    private async Task<Internship?> GetStudentInternshipAsync(Guid userId)
    {
        // KHÔNG lọc theo "kỳ active tạo sau nhất" toàn hệ thống: nhiều khoa có thể cùng
        // có kỳ Active, lọc chung sẽ sai kỳ cho SV của khoa kia (không thấy bài nộp của mình).
        // Lấy internship mới nhất của chính SV theo CreatedAt.
        return await _db.Internships
            .Include(i => i.Student)
            .Where(i => !i.IsDeleted && i.Student != null && i.Student.UserId == userId)
            .OrderByDescending(i => i.CreatedAt)
            .ThenByDescending(i => i.Id)
            .FirstOrDefaultAsync();
    }

    private static SubmissionStatus ResolveFeedbackStatus(string? newStatus)
    {
        if (string.IsNullOrWhiteSpace(newStatus))
            return SubmissionStatus.RevisionRequested;

        if (!Enum.TryParse<SubmissionStatus>(newStatus, true, out var status))
            throw new InvalidOperationException(InternLink.Shared.Responses.ErrorMessage.InvalidStatusValueDetail(newStatus));

        return status;
    }

    private async Task<(string RelativePath, string SavedFileName)> SaveSubmissionFileAsync(
        Stream fileStream,
        string originalFileName,
        Guid internshipId)
    {
        if (fileStream == null || fileStream.Length == 0)
            throw new ArgumentException(InternLink.Shared.Responses.ErrorMessage.FileEmpty);

        var extension = Path.GetExtension(originalFileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
            throw new InvalidOperationException($"File type '{extension}' is not allowed");

        var uploadPath = Path.Combine(GetUploadRoot(), UploadFolder, internshipId.ToString());
        Directory.CreateDirectory(uploadPath);

        var safeBase = Path.GetFileNameWithoutExtension(originalFileName);
        var uniqueFileName = $"{Guid.NewGuid()}_{safeBase}{extension}";
        var fullPath = Path.Combine(uploadPath, uniqueFileName);
        var relativePath = Path.Combine(UploadFolder, internshipId.ToString(), uniqueFileName)
            .Replace("\\", "/");

        await using (var stream = new FileStream(fullPath, FileMode.Create))
        {
            await fileStream.CopyToAsync(stream);
        }

        return (relativePath, uniqueFileName);
    }

    private string GetUploadRoot() => _env.ContentRootPath;

    private string ResolveUploadPath(string relativePath)
    {
        var normalizedPath = relativePath.Replace('/', Path.DirectorySeparatorChar);
        var roots = new[] { _env.ContentRootPath, _env.WebRootPath }
            .Where(root => !string.IsNullOrWhiteSpace(root))
            .Distinct(StringComparer.OrdinalIgnoreCase);

        foreach (var root in roots)
        {
            var fullRoot = Path.GetFullPath(root!);
            var fullPath = Path.GetFullPath(Path.Combine(fullRoot, normalizedPath));
            if (fullPath.StartsWith(fullRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) && File.Exists(fullPath))
                return fullPath;
        }

        return Path.Combine(GetUploadRoot(), normalizedPath);
    }

    private static string GetMimeType(string extension) => extension switch
    {
        ".pdf" => "application/pdf",
        ".doc" => "application/msword",
        ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".ppt" => "application/vnd.ms-powerpoint",
        ".zip" => "application/zip",
        ".rar" => "application/vnd.rar",
        ".mp4" => "video/mp4",
        ".mov" => "video/quicktime",
        ".sql" => "application/sql",
        _ => "application/octet-stream",
    };

    public async Task<FeedbackDto?> AddStudentReplyAsync(Guid submissionId, Guid studentUserId, string comment)
    {
        if (string.IsNullOrWhiteSpace(comment))
            throw new InvalidOperationException(InternLink.Shared.Responses.ErrorMessage.ReplyCommentRequired);

        var submission = await _db.Submissions
            .Include(s => s.Internship)
                .ThenInclude(i => i.Student)
            .Include(s => s.Internship)
                .ThenInclude(i => i.Lecturer)
            .FirstOrDefaultAsync(s => s.Id == submissionId && !s.IsDeleted);

        if (submission == null)
            return null;

        // Verify the student owns this submission
        if (submission.Internship?.Student?.UserId != studentUserId)
            throw new UnauthorizedAccessException("You can only reply to your own submissions");

        var feedback = new Feedback
        {
            Id = Guid.NewGuid(),
            SubmissionId = submissionId,
            LecturerId = null,
            Comment = comment.Trim(),
            IsPublic = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Feedbacks.Add(feedback);
        await _db.SaveChangesAsync();

        // Notify the lecturer
        var lecturerUserId = submission.Internship?.Lecturer?.UserId;
        if (lecturerUserId.HasValue)
        {
            var studentName = submission.Internship?.Student?.FullName ?? "Sinh viên";
            await _notificationService.CreateAsync(new CreateNotificationRequest
            {
                UserId = lecturerUserId.Value,
                Title = "Sinh viên phản hồi về bài nộp",
                Content = $"{studentName} vừa gửi phản hồi về bài nộp \"{submission.Title ?? submission.Type.ToString()}\".",
                Link = $"/submissions/{submission.Id}"
            });
        }

        return _mapper.Map<FeedbackDto>(feedback);
    }

    public async Task<bool> MarkFeedbacksReadAsync(Guid submissionId, Guid userId, bool isLecturer)
    {
        var submission = await _db.Submissions
            .Include(s => s.Internship)
                .ThenInclude(i => i.Student)
            .Include(s => s.Internship)
                .ThenInclude(i => i.Lecturer)
            .Include(s => s.Feedbacks)
            .FirstOrDefaultAsync(s => s.Id == submissionId && !s.IsDeleted);
        if (submission == null)
            return false;

        var owns = submission.Internship.Student?.UserId == userId;
        var assigned = submission.Internship.Lecturer?.UserId == userId;
        var isSuperAdmin = isLecturer && await _db.Users.AnyAsync(u =>
            u.Id == userId && u.Role == Role.SuperAdmin && !u.IsDeleted);
        if ((!isLecturer && !owns) || (isLecturer && !assigned && !isSuperAdmin))
            throw new UnauthorizedAccessException(InternLink.Shared.Responses.ErrorMessage.NoAccessFeedback);

        var now = DateTime.UtcNow;
        foreach (var feedback in submission.Feedbacks.Where(f => !f.IsDeleted))
        {
            if (isLecturer && feedback.LecturerId == null)
                feedback.LecturerReadAt = now;
            else if (!isLecturer && feedback.LecturerId != null)
                feedback.StudentReadAt = now;
        }
        await _db.SaveChangesAsync();
        return true;
    }
}

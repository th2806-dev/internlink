using System.IO.Compression;
using System.Text;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public sealed class WeeklyReportArchiveService : IWeeklyReportArchiveService
{
    private readonly AppDbContext _db;
    private readonly IWeeklyReportService _weeklyReportService;
    private readonly ISubmissionService _submissionService;

    public WeeklyReportArchiveService(
        AppDbContext db,
        IWeeklyReportService weeklyReportService,
        ISubmissionService submissionService)
    {
        _db = db;
        _weeklyReportService = weeklyReportService;
        _submissionService = submissionService;
    }

    public async Task<IReadOnlyList<WeeklyReportArchiveStudentDto>?> GetStudentsAsync(Guid semesterId, Guid departmentId)
    {
        if (!await IsSemesterInScopeAsync(semesterId, departmentId))
            return null;

        var internships = await GetInternshipsQuery(semesterId, departmentId)
            .Include(item => item.Student)
            .Include(item => item.Company)
            .Include(item => item.WeeklyReports.Where(report => !report.IsDeleted))
            .Include(item => item.Submissions.Where(submission => !submission.IsDeleted))
                .ThenInclude(submission => submission.Assets.Where(asset => !asset.IsDeleted))
            .OrderBy(item => item.Student!.StudentCode)
            .ToListAsync();

        return internships.Select(item =>
        {
            var documents = BuildDocuments(item);
            var reports = item.WeeklyReports.Where(report => !report.IsDeleted).ToList();
            return new WeeklyReportArchiveStudentDto
            {
                StudentId = item.StudentId,
                InternshipId = item.Id,
                StudentCode = item.Student!.StudentCode,
                StudentName = item.Student.FullName,
                ClassName = item.Student.Class,
                CompanyName = item.Company?.CompanyName,
                ReportCount = reports.Count,
                FileCount = reports.Count(report => !string.IsNullOrWhiteSpace(report.FileUrl)),
                WeeklyReportCount = reports.Count,
                HasFinalReport = documents.Any(document => document.DocumentType == "FinalReport"),
                HasEvidence = documents.Any(document => document.DocumentType == "Evidence"),
                TotalFilesCount = documents.Count,
                Weeks = reports.Select(report => report.WeekNumber).Distinct().Order().ToList(),
                LastSubmittedAt = documents
                    .Where(document => document.SubmittedAt.HasValue)
                    .Select(document => document.SubmittedAt)
                    .Max(),
                Documents = documents,
            };
        }).ToList();
    }

    public async Task<WeeklyReportArchiveZipDto?> CreateZipAsync(
        Guid semesterId,
        Guid departmentId,
        Guid userId,
        Guid? studentId = null,
        string documentType = "all")
    {
        var normalizedType = NormalizeDocumentType(documentType);
        if (normalizedType == null)
            throw new InvalidOperationException("Loại tài liệu cần tải không hợp lệ.");

        var semester = await _db.Semesters.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == semesterId && !item.IsDeleted
                && (item.DepartmentId == null || item.DepartmentId == departmentId));
        if (semester == null)
            return null;

        var internships = await GetInternshipsQuery(semesterId, departmentId, studentId)
            .Include(item => item.Student)
            .Include(item => item.WeeklyReports.Where(report => !report.IsDeleted))
            .Include(item => item.Submissions.Where(submission => !submission.IsDeleted))
                .ThenInclude(submission => submission.Assets.Where(asset => !asset.IsDeleted))
            .ToListAsync();
        if (studentId.HasValue && internships.Count == 0)
            return null;

        using var output = new MemoryStream();
        using (var archive = new ZipArchive(output, ZipArchiveMode.Create, leaveOpen: true, Encoding.UTF8))
        {
            var usedEntries = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var addedFiles = 0;

            async Task AddEntryAsync(string entryName, byte[] content)
            {
                var safeName = SanitizeEntryName(entryName);
                var uniqueName = safeName;
                var suffix = 2;
                while (!usedEntries.Add(uniqueName))
                {
                    var directory = Path.GetDirectoryName(safeName)?.Replace('\\', '/') ?? string.Empty;
                    var fileName = Path.GetFileName(safeName);
                    var duplicate = $"{Path.GetFileNameWithoutExtension(fileName)}_{suffix}{Path.GetExtension(fileName)}";
                    uniqueName = string.IsNullOrEmpty(directory) ? duplicate : $"{directory}/{duplicate}";
                    suffix++;
                }

                var entry = archive.CreateEntry(uniqueName, CompressionLevel.Fastest);
                await using var entryStream = entry.Open();
                await entryStream.WriteAsync(content);
                addedFiles++;
            }

            foreach (var internship in internships)
            {
                var student = internship.Student!;
                var studentFolder = SanitizeFileName($"{student.StudentCode}_{student.FullName}");

                if (IncludesWeeklyReports(normalizedType))
                {
                    var reports = internship.WeeklyReports
                        .Where(report => !report.IsDeleted)
                        .OrderBy(report => report.WeekNumber)
                        .ThenBy(report => report.Version);
                    foreach (var report in reports)
                    {
                        byte[] content;
                        string fileName;
                        if (!string.IsNullOrWhiteSpace(report.FileUrl))
                        {
                            var file = await _weeklyReportService.DownloadFileAsync(
                                report.Id,
                                userId,
                                isLecturerOrAdmin: true);
                            if (file == null)
                                continue;
                            content = file.FileContent;
                            fileName = file.FileName;
                        }
                        else if (!string.IsNullOrWhiteSpace(report.Content))
                        {
                            content = Encoding.UTF8.GetBytes(report.Content);
                            fileName = $"{SanitizeFileName(report.Title)}.txt";
                        }
                        else
                        {
                            continue;
                        }

                        await AddEntryAsync(
                            $"{studentFolder}/BaoCaoTuan/Tuan{report.WeekNumber:D2}_V{report.Version:D2}_{fileName}",
                            content);
                    }
                }

                foreach (var submission in internship.Submissions.Where(submission =>
                             !submission.IsDeleted && IncludesSubmission(normalizedType, submission.Type)))
                {
                    var typeFolder = GetSubmissionFolder(submission.Type);
                    if (!string.IsNullOrWhiteSpace(submission.FileUrl))
                    {
                        var mainFile = await _submissionService.DownloadFileAsync(
                            submission.Id,
                            userId,
                            isLecturerOrAdmin: true);
                        if (mainFile != null)
                        {
                            await AddEntryAsync(
                                $"{studentFolder}/{typeFolder}/V{submission.Version:D2}_{mainFile.FileName}",
                                mainFile.FileContent);
                        }
                    }

                    foreach (var asset in submission.Assets.Where(asset =>
                                 !asset.IsDeleted && asset.AssetType == "file" && !string.IsNullOrWhiteSpace(asset.FileUrl)))
                    {
                        var assetFile = await _submissionService.DownloadAssetAsync(
                            submission.Id,
                            asset.Id,
                            userId,
                            isLecturerOrAdmin: true);
                        if (assetFile == null)
                            continue;

                        await AddEntryAsync(
                            $"{studentFolder}/{typeFolder}/V{submission.Version:D2}_{assetFile.FileName}",
                            assetFile.FileContent);
                    }
                }
            }

            if (addedFiles == 0)
                return null;
        }

        var archiveStudentCode = studentId.HasValue
            ? internships[0].Student?.StudentCode ?? studentId.Value.ToString("N")
            : null;
        var typeName = normalizedType == "all" ? "ho-so" : normalizedType;
        var archiveName = studentId.HasValue
            ? $"{SanitizeFileName(archiveStudentCode!)}_{typeName}_{SanitizeFileName(semester.Name)}.zip"
            : $"{typeName}_{SanitizeFileName(semester.Name)}.zip";
        return new WeeklyReportArchiveZipDto { Content = output.ToArray(), FileName = archiveName };
    }

    private static List<StudentArchiveDocumentItemDto> BuildDocuments(Internship internship)
    {
        var documents = internship.WeeklyReports
            .Where(report => !report.IsDeleted)
            .Select(report => new StudentArchiveDocumentItemDto
            {
                Id = report.Id,
                DocumentType = "WeeklyReport",
                DisplayType = "Báo cáo tuần",
                Title = report.Title,
                FileName = report.FileName,
                FileSize = report.FileSize,
                WeekNumber = report.WeekNumber,
                Version = report.Version,
                Status = report.Status.ToString(),
                SubmittedAt = report.SubmittedAt,
            })
            .ToList();

        foreach (var submission in internship.Submissions.Where(submission => !submission.IsDeleted))
        {
            var (documentType, displayType) = GetSubmissionTypeLabel(submission.Type);
            if (!string.IsNullOrWhiteSpace(submission.FileUrl))
            {
                documents.Add(new StudentArchiveDocumentItemDto
                {
                    Id = submission.Id,
                    SubmissionId = submission.Id,
                    DocumentType = documentType,
                    DisplayType = displayType,
                    Title = submission.Title ?? displayType,
                    FileName = submission.FileName,
                    Version = submission.Version,
                    Status = submission.Status.ToString(),
                    SubmittedAt = submission.SubmittedAt,
                });
            }

            documents.AddRange(submission.Assets
                .Where(asset => !asset.IsDeleted && asset.AssetType == "file" && !string.IsNullOrWhiteSpace(asset.FileUrl))
                .Select(asset => new StudentArchiveDocumentItemDto
                {
                    Id = asset.Id,
                    SubmissionId = submission.Id,
                    AssetId = asset.Id,
                    DocumentType = documentType,
                    DisplayType = displayType,
                    Title = asset.Label ?? submission.Title ?? displayType,
                    FileName = asset.FileName,
                    FileSize = asset.FileSize,
                    Version = submission.Version,
                    Status = submission.Status.ToString(),
                    SubmittedAt = asset.UploadedAt,
                }));
        }

        return documents.OrderByDescending(document => document.SubmittedAt).ToList();
    }

    private static string? NormalizeDocumentType(string? documentType)
    {
        var value = documentType?.Trim().ToLowerInvariant();
        return value is "all" or "weekly" or "final" or "evidence" or "product" or "other"
            ? value
            : null;
    }

    private static bool IncludesWeeklyReports(string documentType) =>
        documentType is "all" or "weekly";

    private static bool IncludesSubmission(string documentType, SubmissionType type) =>
        documentType switch
        {
            "all" => true,
            "weekly" => type == SubmissionType.WeeklyReport,
            "final" => type == SubmissionType.FinalReport,
            "evidence" => type == SubmissionType.Evidence,
            "product" => type == SubmissionType.Product,
            "other" => type == SubmissionType.InternshipLog,
            _ => false,
        };

    private static (string DocumentType, string DisplayType) GetSubmissionTypeLabel(SubmissionType type) =>
        type switch
        {
            SubmissionType.WeeklyReport => ("WeeklyReport", "Báo cáo tuần"),
            SubmissionType.FinalReport => ("FinalReport", "Báo cáo cuối kỳ"),
            SubmissionType.Evidence => ("Evidence", "Đánh giá doanh nghiệp"),
            SubmissionType.Product => ("Product", "Sản phẩm thực tế"),
            SubmissionType.InternshipLog => ("InternshipLog", "Nhật ký thực tập"),
            _ => ("Submission", type.ToString()),
        };

    private static string GetSubmissionFolder(SubmissionType type) =>
        type switch
        {
            SubmissionType.WeeklyReport => "BaoCaoTuan",
            SubmissionType.FinalReport => "BaoCaoCuoiKy",
            SubmissionType.Evidence => "DanhGiaDoanhNghiep",
            SubmissionType.Product => "SanPhamThucTe",
            SubmissionType.InternshipLog => "NhatKyThucTap",
            _ => "HoSoKhac",
        };

    private async Task<bool> IsSemesterInScopeAsync(Guid semesterId, Guid departmentId) =>
        await _db.Semesters.AsNoTracking()
            .AnyAsync(item => item.Id == semesterId && !item.IsDeleted
                && (item.DepartmentId == null || item.DepartmentId == departmentId));

    private IQueryable<Internship> GetInternshipsQuery(Guid semesterId, Guid departmentId, Guid? studentId = null)
    {
        var query = _db.Internships.AsNoTracking()
            .Where(item => item.SemesterId == semesterId && !item.IsDeleted
                && item.Student != null && !item.Student.IsDeleted
                && item.Student.DepartmentId == departmentId);
        if (studentId.HasValue)
            query = query.Where(item => item.StudentId == studentId.Value);
        return query;
    }

    private static string SanitizeEntryName(string value) =>
        string.Join("/", value.Replace('\\', '/').Split('/')
            .Select(segment => SanitizeFileName(segment)));

    private static string SanitizeFileName(string value)
    {
        var invalidCharacters = Path.GetInvalidFileNameChars().Concat(new[] { '/', '\\' }).ToHashSet();
        var safeName = new string(value
            .Select(character => char.IsControl(character) || invalidCharacters.Contains(character) ? '_' : character)
            .ToArray())
            .Trim(' ', '.');
        return string.IsNullOrWhiteSpace(safeName) ? "document" : safeName;
    }
}

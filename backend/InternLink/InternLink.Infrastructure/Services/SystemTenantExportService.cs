using System.IO.Compression;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using ClosedXML.Excel;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Entities.Rbac;
using InternLink.Domain.Entities.System;
using InternLink.Infrastructure.Persistence;
using InternLink.Shared.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public sealed class SystemTenantExportService(
    AppDbContext context,
    IWebHostEnvironment environment) : ISystemTenantExportService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Converters = { new JsonStringEnumConverter() }
    };

    public async Task<TenantDataExportArchive?> ExportAsync(
        Guid tenantId,
        Guid actorId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var tenant = await context.SysTenants.IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.PublicId == tenantId && !item.IsDeleted, cancellationToken);
        if (tenant == null)
            return null;

        var exportedAt = DateTimeOffset.UtcNow;
        var downloadName = $"{SanitizeFileName(tenant.TenantCode)}_data_{exportedAt:yyyyMMdd_HHmmss}.zip";
        var temporaryPath = Path.Combine(Path.GetTempPath(), $"internlink-tenant-export-{Guid.NewGuid():N}.zip");
        var archiveStream = new FileStream(
            temporaryPath,
            FileMode.CreateNew,
            FileAccess.ReadWrite,
            FileShare.Read,
            81920,
            FileOptions.Asynchronous | FileOptions.DeleteOnClose);

        try
        {
            var datasetCounts = new Dictionary<string, int>(StringComparer.Ordinal);
            IReadOnlyList<TenantExportFile> archivedFiles;
            IReadOnlyList<TenantExportFileManifestItem> fileManifest;

            using (var archive = new ZipArchive(archiveStream, ZipArchiveMode.Create, leaveOpen: true))
            {
                datasetCounts["data/departments.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/departments.json",
                    context.Departments.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .OrderBy(item => item.Code)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.Code,
                            item.Name,
                            item.Description,
                            item.IsActive,
                            item.CreatedAt,
                            item.UpdatedAt
                        }).AsAsyncEnumerable(),
                    cancellationToken);

                datasetCounts["data/students.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/students.json",
                    context.Students.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .OrderBy(item => item.StudentCode)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.StudentCode,
                            item.FullName,
                            item.Class,
                            item.Major,
                            item.Email,
                            item.Phone,
                            item.Department,
                            item.DesiredPosition,
                            item.AlternativePosition,
                            item.DesiredLocation,
                            item.WorkPreference,
                            item.PreferredIndustry,
                            item.Skills,
                            item.DepartmentId,
                            item.CreatedAt,
                            item.UpdatedAt
                        }).AsAsyncEnumerable(),
                    cancellationToken);
                datasetCounts["data/students.csv"] = await WriteStudentsCsvAsync(archive, tenantId, cancellationToken);

                datasetCounts["data/lecturers.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/lecturers.json",
                    context.Lecturers.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .OrderBy(item => item.StaffCode)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.StaffCode,
                            item.FullName,
                            item.AcademicTitle,
                            item.Email,
                            item.Phone,
                            item.Department,
                            item.DepartmentId,
                            item.CreatedAt,
                            item.UpdatedAt
                        }).AsAsyncEnumerable(),
                    cancellationToken);
                datasetCounts["data/lecturers.csv"] = await WriteLecturersCsvAsync(archive, tenantId, cancellationToken);

                datasetCounts["data/companies.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/companies.json",
                    context.Companies.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .OrderBy(item => item.CompanyName)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.CompanyCode,
                            item.TaxCode,
                            item.CompanyName,
                            item.Address,
                            item.Website,
                            item.Industry,
                            item.ContactPerson,
                            item.ContactEmail,
                            item.ContactPhone,
                            item.Capacity,
                            item.IsActive,
                            item.DepartmentId,
                            item.CreatedAt,
                            item.UpdatedAt
                        }).AsAsyncEnumerable(),
                    cancellationToken);

                datasetCounts["data/company-positions.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/company-positions.json",
                    context.CompanyPositions.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .OrderBy(item => item.CompanyId)
                        .ThenBy(item => item.Title)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.CompanyId,
                            item.SemesterId,
                            item.PositionCode,
                            item.Title,
                            item.Description,
                            item.RequiredMajor,
                            item.RequiredSkills,
                            item.Location,
                            item.Slots,
                            item.Stipend,
                            item.IsOpen,
                            item.CreatedAt,
                            item.UpdatedAt
                        }).AsAsyncEnumerable(),
                    cancellationToken);

                datasetCounts["data/semesters.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/semesters.json",
                    context.Semesters.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .OrderBy(item => item.AcademicYear)
                        .ThenBy(item => item.Name)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.Name,
                            item.Term,
                            item.AcademicYear,
                            item.StartDate,
                            item.EndDate,
                            item.Status,
                            item.Description,
                            item.MaxStudentsPerLecturer,
                            item.TotalWeeks,
                            item.TargetStudents,
                            item.InternshipStartWeek,
                            item.DepartmentId,
                            item.CreatedAt,
                            item.UpdatedAt
                        }).AsAsyncEnumerable(),
                    cancellationToken);

                datasetCounts["data/school-academic-terms.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/school-academic-terms.json",
                    context.SchoolAcademicTerms.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .OrderBy(item => item.AcademicYear)
                        .ThenBy(item => item.Term)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.AcademicYear,
                            item.Term,
                            item.StartDate,
                            item.EndDate
                        }).AsAsyncEnumerable(),
                    cancellationToken);

                datasetCounts["data/semester-lecturers.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/semester-lecturers.json",
                    context.SemesterLecturers.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .Select(item => new { item.PublicId, item.SemesterId, item.LecturerId, item.CreatedAt })
                        .AsAsyncEnumerable(),
                    cancellationToken);
                datasetCounts["data/semester-companies.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/semester-companies.json",
                    context.SemesterCompanies.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .Select(item => new { item.PublicId, item.SemesterId, item.CompanyId, item.IsActive, item.CreatedAt })
                        .AsAsyncEnumerable(),
                    cancellationToken);
                datasetCounts["data/semester-report-schedules.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/semester-report-schedules.json",
                    context.SemesterReportSchedules.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.SemesterId,
                            item.LecturerId,
                            item.WeekNumber,
                            item.Title,
                            item.StartDate,
                            item.DueDate,
                            item.IsSubmissionOpen,
                            item.AllowLateSubmission,
                            item.Description
                        }).AsAsyncEnumerable(),
                    cancellationToken);

                datasetCounts["data/internships.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/internships.json",
                    context.Internships.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.StudentId,
                            item.CompanyId,
                            item.LecturerId,
                            item.SemesterId,
                            item.AssignedAt,
                            item.StartDate,
                            item.EndDate,
                            item.Status,
                            item.Position,
                            item.SupervisorName,
                            item.SupervisorPhone,
                            item.SupervisorEmail,
                            item.SupervisorDepartment,
                            item.CreatedAt,
                            item.UpdatedAt
                        }).AsAsyncEnumerable(),
                    cancellationToken);

                datasetCounts["data/evaluations.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/evaluations.json",
                    context.Evaluations.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted
                            && item.Internship.TenantId == tenantId
                            && !item.Internship.IsDeleted
                            && item.Internship.Student.TenantId == tenantId
                            && !item.Internship.Student.IsDeleted)
                        .OrderBy(item => item.Internship.Student.StudentCode)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.InternshipId,
                            StudentCode = item.Internship.Student.StudentCode,
                            StudentName = item.Internship.Student.FullName,
                            item.RubricId,
                            item.TechnicalScore,
                            item.CommunicationScore,
                            item.TeamworkScore,
                            item.InitiativeScore,
                            item.FinalGrade,
                            item.QualityLevel,
                            item.WeeklyQualityJson,
                            item.HasCreativeProduct,
                            item.OralExamScore,
                            item.CriteriaScoresJson,
                            item.Comments,
                            item.Strengths,
                            item.AreasForImprovement,
                            item.EvaluatedAt,
                            item.IsFinalized,
                            item.DefenseDate,
                            item.DefenseStatus,
                            item.DefenseCouncilName,
                            item.DefenseExaminerName
                        }).AsAsyncEnumerable(),
                    cancellationToken);
                datasetCounts["data/evaluations.csv"] = await WriteEvaluationsCsvAsync(archive, tenantId, cancellationToken);
                await WriteAcademicWorkbookAsync(
                    archive,
                    tenantId,
                    tenant.Name,
                    exportedAt,
                    cancellationToken);

                datasetCounts["data/employer-evaluations.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/employer-evaluations.json",
                    context.EmployerEvaluations.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted
                            && item.Internship.TenantId == tenantId
                            && !item.Internship.IsDeleted
                            && item.Internship.Student.TenantId == tenantId
                            && !item.Internship.Student.IsDeleted)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.InternshipId,
                            StudentCode = item.Internship.Student.StudentCode,
                            StudentName = item.Internship.Student.FullName,
                            item.AttendanceScore,
                            item.SkillsScore,
                            item.AttitudeScore,
                            item.FinalScore,
                            item.RubricScoresJson,
                            item.Strengths,
                            item.AreasForImprovement,
                            item.Comments,
                            item.ConfirmedMentorName,
                            item.ConfirmedAt
                        }).AsAsyncEnumerable(),
                    cancellationToken);

                datasetCounts["data/evaluation-rubrics.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/evaluation-rubrics.json",
                    context.EvaluationRubrics.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.SemesterId,
                            item.DepartmentId,
                            item.Name,
                            item.Version,
                            item.RatingLevelsJson,
                            item.ApplicationMode,
                            item.Status,
                            item.SubmittedAt,
                            item.ApprovedAt,
                            item.RejectionReason
                        }).AsAsyncEnumerable(),
                    cancellationToken);
                datasetCounts["data/evaluation-rubric-criteria.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/evaluation-rubric-criteria.json",
                    context.EvaluationRubricCriteria.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.RubricId,
                            item.Name,
                            item.Description,
                            item.Weight,
                            item.MaxScore,
                            item.OrderIndex
                        }).AsAsyncEnumerable(),
                    cancellationToken);

                datasetCounts["data/weekly-reports.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/weekly-reports.json",
                    context.WeeklyReports.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.InternshipId,
                            item.WeekNumber,
                            item.Version,
                            item.Title,
                            item.Content,
                            item.FileName,
                            item.FileSize,
                            item.MimeType,
                            item.Status,
                            item.SubmittedAt,
                            item.LecturerComment
                        }).AsAsyncEnumerable(),
                    cancellationToken);
                datasetCounts["data/weekly-report-versions.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/weekly-report-versions.json",
                    context.WeeklyReportVersions.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.WeeklyReportId,
                            item.Version,
                            item.FileName,
                            item.FileSize,
                            item.MimeType,
                            item.UploadedAt
                        }).AsAsyncEnumerable(),
                    cancellationToken);

                datasetCounts["data/submissions.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/submissions.json",
                    context.Submissions.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.InternshipId,
                            item.Type,
                            item.Status,
                            item.Version,
                            item.Title,
                            item.Description,
                            item.FileName,
                            item.EmployerScore,
                            item.SubmittedAt
                        }).AsAsyncEnumerable(),
                    cancellationToken);
                datasetCounts["data/submission-assets.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/submission-assets.json",
                    context.SubmissionAssets.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.SubmissionId,
                            item.Label,
                            item.FileName,
                            item.AssetType,
                            item.FileSize,
                            item.MimeType,
                            item.UploadedAt
                        }).AsAsyncEnumerable(),
                    cancellationToken);
                datasetCounts["data/feedback.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/feedback.json",
                    context.Feedbacks.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.SubmissionId,
                            item.WeeklyReportId,
                            item.LecturerId,
                            item.Comment,
                            item.IsPublic,
                            item.StudentReadAt,
                            item.LecturerReadAt,
                            item.CreatedAt
                        }).AsAsyncEnumerable(),
                    cancellationToken);

                datasetCounts["data/attendance-sessions.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/attendance-sessions.json",
                    context.AttendanceSessions.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.SemesterId,
                            item.LecturerId,
                            item.WeekNumber,
                            item.Title,
                            item.Description,
                            item.MeetingDate,
                            item.DurationMinutes,
                            item.Location,
                            item.Status,
                            item.IsLecturerOnly,
                            item.IsGeneralSession
                        }).AsAsyncEnumerable(),
                    cancellationToken);
                datasetCounts["data/attendance-records.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/attendance-records.json",
                    context.AttendanceRecords.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.AttendanceSessionId,
                            item.StudentId,
                            item.InternshipId,
                            item.Status,
                            item.MarkedAt,
                            item.MarkedBy
                        }).AsAsyncEnumerable(),
                    cancellationToken);

                datasetCounts["data/documents.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/documents.json",
                    context.Documents.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.InternshipId,
                            item.SemesterId,
                            item.Department,
                            item.Version,
                            item.PublishedAt,
                            item.Title,
                            item.Description,
                            item.FileName,
                            item.FileSize,
                            item.MimeType,
                            item.UploadedAt,
                            item.IsRequired,
                            item.IsPublished,
                            item.ArchiveReason,
                            item.ArchivedAt,
                            item.ArchivedBy,
                            item.Category
                        }).AsAsyncEnumerable(),
                    cancellationToken);
                datasetCounts["data/document-versions.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/document-versions.json",
                    context.DocumentVersions.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.DocumentId,
                            item.VersionNumber,
                            item.FileName,
                            item.FileSize,
                            item.MimeType,
                            item.UploadedAt,
                            item.ChangeNote
                        }).AsAsyncEnumerable(),
                    cancellationToken);

                datasetCounts["data/lecturer-semester-summaries.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/lecturer-semester-summaries.json",
                    context.LecturerSemesterSummaries.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.SemesterId,
                            item.LecturerId,
                            item.Results,
                            item.Difficulties,
                            item.Recommendations,
                            item.Conclusion
                        }).AsAsyncEnumerable(),
                    cancellationToken);
                datasetCounts["data/semester-faculty-summaries.json"] = await WriteJsonArrayAsync(
                    archive,
                    "data/semester-faculty-summaries.json",
                    context.SemesterFacultySummaries.IgnoreQueryFilters().AsNoTracking()
                        .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                        .Select(item => new
                        {
                            item.PublicId,
                            item.SemesterId,
                            item.DepartmentId,
                            item.Results,
                            item.Difficulties,
                            item.Recommendations,
                            item.Conclusion
                        }).AsAsyncEnumerable(),
                    cancellationToken);

                var fileReferences = await GetFileReferencesAsync(tenantId, cancellationToken);
                (archivedFiles, fileManifest) = await AddFilesAsync(archive, fileReferences, cancellationToken);

                await WriteJsonAsync(archive, "manifest.json", new
                {
                    formatVersion = 1,
                    tenant = new
                    {
                        id = tenant.PublicId,
                        tenant.TenantCode,
                        tenant.Name,
                        tenant.LegalName
                    },
                    exportedAt,
                    dataFormat = "UTF-8 JSON arrays and machine-readable CSV; data/academic-records.xlsx is the presentation-ready workbook with named, filterable tables.",
                    included = "Non-deleted academic records for this tenant and locally managed academic files referenced by those records.",
                    presentationWorkbook = "data/academic-records.xlsx",
                    excluded = new[]
                    {
                        "Passwords, refresh tokens, authentication/session data, platform configuration, tenant billing, and secrets.",
                        "User avatars and remote/external files that are not available in local managed storage."
                    },
                    datasets = datasetCounts,
                    files = new
                    {
                        archivedCount = archivedFiles.Count,
                        unavailableOrExternalCount = fileManifest.Count(item => item.ArchivePath == null),
                        references = fileManifest
                    }
                }, cancellationToken);
            }

            var actorName = await context.Users.IgnoreQueryFilters()
                .Where(user => user.PublicId == actorId && !user.IsDeleted)
                .Select(user => user.Username)
                .FirstOrDefaultAsync(cancellationToken);
            context.SysAuditLogs.Add(new SysAuditLog
            {
                TenantId = SysTenant.DefaultTenantId,
                TableName = "Sys_Tenants",
                ActionType = "TENANT_DATA_EXPORT",
                RecordId = tenant.PublicId.ToString(),
                UserId = actorId,
                Username = actorName,
                FunctionCode = SystemPermissionCodes.TenantsExport,
                IpAddress = ipAddress,
                NewValuesJson = JsonSerializer.Serialize(new
                {
                    tenant.TenantCode,
                    archiveFileName = downloadName,
                    exportedAt,
                    datasetCounts,
                    archivedFileCount = archivedFiles.Count,
                    unavailableOrExternalFileCount = fileManifest.Count(item => item.ArchivePath == null)
                }),
                CreatedAt = exportedAt.UtcDateTime
            });
            await context.SaveChangesAsync(cancellationToken);

            archiveStream.Position = 0;
            return new TenantDataExportArchive(archiveStream, downloadName);
        }
        catch
        {
            await archiveStream.DisposeAsync();
            throw;
        }
    }

    private async Task<int> WriteStudentsCsvAsync(
        ZipArchive archive,
        Guid tenantId,
        CancellationToken cancellationToken) =>
        await WriteCsvAsync(
            archive,
            "data/students.csv",
            ["Mã sinh viên", "Họ tên", "Lớp", "Ngành", "Email", "Điện thoại", "Khoa", "Mã khoa"],
            context.Students.IgnoreQueryFilters().AsNoTracking()
                .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                .OrderBy(item => item.StudentCode)
                .Select(item => new
                {
                    item.StudentCode,
                    item.FullName,
                    item.Class,
                    item.Major,
                    item.Email,
                    item.Phone,
                    item.Department,
                    item.DepartmentId
                }).AsAsyncEnumerable(),
            item => [
                item.StudentCode,
                item.FullName,
                item.Class,
                item.Major,
                item.Email,
                item.Phone,
                item.Department,
                item.DepartmentId?.ToString()
            ],
            cancellationToken);

    private async Task<int> WriteLecturersCsvAsync(
        ZipArchive archive,
        Guid tenantId,
        CancellationToken cancellationToken) =>
        await WriteCsvAsync(
            archive,
            "data/lecturers.csv",
            ["Mã giảng viên", "Họ tên", "Học hàm/học vị", "Email", "Điện thoại", "Khoa", "Mã khoa"],
            context.Lecturers.IgnoreQueryFilters().AsNoTracking()
                .Where(item => item.TenantId == tenantId && !item.IsDeleted)
                .OrderBy(item => item.StaffCode)
                .Select(item => new
                {
                    item.StaffCode,
                    item.FullName,
                    item.AcademicTitle,
                    item.Email,
                    item.Phone,
                    item.Department,
                    item.DepartmentId
                }).AsAsyncEnumerable(),
            item => [
                item.StaffCode,
                item.FullName,
                item.AcademicTitle,
                item.Email,
                item.Phone,
                item.Department,
                item.DepartmentId?.ToString()
            ],
            cancellationToken);

    private async Task<int> WriteEvaluationsCsvAsync(
        ZipArchive archive,
        Guid tenantId,
        CancellationToken cancellationToken) =>
        await WriteCsvAsync(
            archive,
            "data/evaluations.csv",
            ["Mã sinh viên", "Họ tên", "Điểm chuyên môn", "Điểm giao tiếp", "Điểm teamwork", "Điểm chủ động", "Điểm cuối kỳ", "Điểm rubric chất lượng", "Điểm vấn đáp", "Đã chốt", "Nhận xét"],
            context.Evaluations.IgnoreQueryFilters().AsNoTracking()
                .Where(item => item.TenantId == tenantId && !item.IsDeleted
                    && item.Internship.TenantId == tenantId
                    && !item.Internship.IsDeleted
                    && item.Internship.Student.TenantId == tenantId
                    && !item.Internship.Student.IsDeleted)
                .OrderBy(item => item.Internship.Student.StudentCode)
                .Select(item => new
                {
                    StudentCode = item.Internship.Student.StudentCode,
                    StudentName = item.Internship.Student.FullName,
                    item.TechnicalScore,
                    item.CommunicationScore,
                    item.TeamworkScore,
                    item.InitiativeScore,
                    item.FinalGrade,
                    item.QualityLevel,
                    item.OralExamScore,
                    item.IsFinalized,
                    item.Comments
                }).AsAsyncEnumerable(),
            item => [
                item.StudentCode,
                item.StudentName,
                item.TechnicalScore.ToString(),
                item.CommunicationScore.ToString(),
                item.TeamworkScore.ToString(),
                item.InitiativeScore.ToString(),
                item.FinalGrade.ToString(),
                item.QualityLevel?.ToString(),
                item.OralExamScore?.ToString(),
                item.IsFinalized ? "Có" : "Không",
                item.Comments
            ],
            cancellationToken);

    private async Task WriteAcademicWorkbookAsync(
        ZipArchive archive,
        Guid tenantId,
        string tenantName,
        DateTimeOffset exportedAt,
        CancellationToken cancellationToken)
    {
        var students = await context.Students.IgnoreQueryFilters().AsNoTracking()
            .Where(item => item.TenantId == tenantId && !item.IsDeleted)
            .OrderBy(item => item.StudentCode)
            .Select(item => new
            {
                item.StudentCode,
                item.FullName,
                item.Class,
                item.Major,
                item.Email,
                item.Phone,
                item.Department,
                item.DepartmentId
            })
            .ToListAsync(cancellationToken);
        var lecturers = await context.Lecturers.IgnoreQueryFilters().AsNoTracking()
            .Where(item => item.TenantId == tenantId && !item.IsDeleted)
            .OrderBy(item => item.StaffCode)
            .Select(item => new
            {
                item.StaffCode,
                item.FullName,
                item.AcademicTitle,
                item.Email,
                item.Phone,
                item.Department,
                item.DepartmentId
            })
            .ToListAsync(cancellationToken);
        var evaluations = await context.Evaluations.IgnoreQueryFilters().AsNoTracking()
            .Where(item => item.TenantId == tenantId && !item.IsDeleted
                && item.Internship.TenantId == tenantId
                && !item.Internship.IsDeleted
                && item.Internship.Student.TenantId == tenantId
                && !item.Internship.Student.IsDeleted)
            .OrderBy(item => item.Internship.Student.StudentCode)
            .Select(item => new
            {
                StudentCode = item.Internship.Student.StudentCode,
                StudentName = item.Internship.Student.FullName,
                item.TechnicalScore,
                item.CommunicationScore,
                item.TeamworkScore,
                item.InitiativeScore,
                item.FinalGrade,
                item.QualityLevel,
                item.OralExamScore,
                item.IsFinalized,
                item.Comments
            })
            .ToListAsync(cancellationToken);

        using var workbook = new XLWorkbook();
        AddPresentationWorksheet(
            workbook,
            "Sinh viên",
            "DANH SÁCH SINH VIÊN",
            tenantName,
            exportedAt,
            "Students",
            ["Mã sinh viên", "Họ tên", "Lớp", "Ngành", "Email", "Điện thoại", "Khoa", "Mã khoa"],
            students.Select(item => (IReadOnlyList<object?>)[
                item.StudentCode,
                item.FullName,
                item.Class,
                item.Major,
                item.Email,
                item.Phone,
                item.Department,
                item.DepartmentId?.ToString()
            ]).ToList(),
            [18, 28, 18, 24, 32, 18, 24, 36]);
        AddPresentationWorksheet(
            workbook,
            "Giảng viên",
            "DANH SÁCH GIẢNG VIÊN",
            tenantName,
            exportedAt,
            "Lecturers",
            ["Mã giảng viên", "Họ tên", "Học hàm/học vị", "Email", "Điện thoại", "Khoa", "Mã khoa"],
            lecturers.Select(item => (IReadOnlyList<object?>)[
                item.StaffCode,
                item.FullName,
                item.AcademicTitle,
                item.Email,
                item.Phone,
                item.Department,
                item.DepartmentId?.ToString()
            ]).ToList(),
            [18, 28, 22, 32, 18, 24, 36]);
        AddPresentationWorksheet(
            workbook,
            "Đánh giá",
            "KẾT QUẢ ĐÁNH GIÁ THỰC TẬP",
            tenantName,
            exportedAt,
            "Evaluations",
            ["Mã sinh viên", "Họ tên", "Điểm chuyên môn", "Điểm giao tiếp", "Điểm teamwork", "Điểm chủ động", "Điểm cuối kỳ", "Điểm rubric chất lượng", "Điểm vấn đáp", "Đã chốt", "Nhận xét"],
            evaluations.Select(item => (IReadOnlyList<object?>)[
                item.StudentCode,
                item.StudentName,
                item.TechnicalScore,
                item.CommunicationScore,
                item.TeamworkScore,
                item.InitiativeScore,
                item.FinalGrade,
                item.QualityLevel?.ToString(),
                item.OralExamScore,
                item.IsFinalized ? "Có" : "Không",
                item.Comments
            ]).ToList(),
            [18, 28, 18, 18, 18, 18, 18, 22, 18, 14, 44]);

        var entry = archive.CreateEntry("data/academic-records.xlsx", CompressionLevel.Optimal);
        await using var stream = entry.Open();
        workbook.SaveAs(stream);
    }

    private static void AddPresentationWorksheet(
        XLWorkbook workbook,
        string sheetName,
        string title,
        string tenantName,
        DateTimeOffset exportedAt,
        string tableName,
        IReadOnlyList<string> headers,
        IReadOnlyList<IReadOnlyList<object?>> rows,
        IReadOnlyList<double> columnWidths)
    {
        const int headerRow = 4;
        const int dataStartRow = headerRow + 1;
        var worksheet = workbook.Worksheets.Add(sheetName);
        var columnCount = headers.Count;
        var lastDataRow = rows.Count == 0 ? dataStartRow : dataStartRow + rows.Count - 1;

        worksheet.Range(1, 1, Math.Max(lastDataRow, dataStartRow), columnCount).Style.Font.FontName = "Arial";
        worksheet.Range(1, 1, Math.Max(lastDataRow, dataStartRow), columnCount).Style.Font.FontSize = 13;
        worksheet.Range(1, 1, Math.Max(lastDataRow, dataStartRow), columnCount).Style.Alignment.Vertical =
            XLAlignmentVerticalValues.Center;

        worksheet.Cell(1, 1).Value = title;
        worksheet.Range(1, 1, 1, columnCount).Merge();
        worksheet.Range(1, 1, 1, columnCount).Style
            .Fill.SetBackgroundColor(XLColor.FromHtml("#EAF2F8"));
        worksheet.Range(1, 1, 1, columnCount).Style.Font.Bold = true;
        worksheet.Range(1, 1, 1, columnCount).Style.Font.FontColor = XLColor.FromHtml("#123B5D");
        worksheet.Row(1).Height = 28;

        worksheet.Cell(2, 1).Value =
            $"Đơn vị: {tenantName}  |  Ngày xuất: {exportedAt:dd/MM/yyyy HH:mm} UTC  |  Số bản ghi: {rows.Count:N0}";
        worksheet.Range(2, 1, 2, columnCount).Merge();
        worksheet.Range(2, 1, 2, columnCount).Style
            .Fill.SetBackgroundColor(XLColor.FromHtml("#F4F7FA"));
        worksheet.Range(2, 1, 2, columnCount).Style.Font.FontColor = XLColor.FromHtml("#526273");
        worksheet.Row(2).Height = 24;

        for (var column = 0; column < headers.Count; column++)
        {
            worksheet.Cell(headerRow, column + 1).Value = headers[column];
            worksheet.Column(column + 1).Width = columnWidths[column];
        }

        var headerRange = worksheet.Range(headerRow, 1, headerRow, columnCount);
        headerRange.Style.Fill.SetBackgroundColor(XLColor.FromHtml("#026AA7"));
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Font.FontColor = XLColor.White;
        headerRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        headerRange.Style.Alignment.WrapText = true;
        headerRange.Style.Border.BottomBorder = XLBorderStyleValues.Medium;
        worksheet.Row(headerRow).Height = 38;

        for (var rowIndex = 0; rowIndex < rows.Count; rowIndex++)
        {
            var rowNumber = dataStartRow + rowIndex;
            var values = rows[rowIndex];
            for (var column = 0; column < values.Count; column++)
            {
                var cell = worksheet.Cell(rowNumber, column + 1);
                switch (values[column])
                {
                    case null:
                        cell.Value = string.Empty;
                        break;
                    case string text:
                        cell.Value = text;
                        break;
                    case int integer:
                        cell.Value = integer;
                        break;
                    case long integer:
                        cell.Value = integer;
                        break;
                    case decimal number:
                        cell.Value = number;
                        cell.Style.NumberFormat.Format = "0.00";
                        break;
                    case double number:
                        cell.Value = number;
                        cell.Style.NumberFormat.Format = "0.00";
                        break;
                    default:
                        cell.Value = Convert.ToString(values[column], System.Globalization.CultureInfo.InvariantCulture)
                            ?? string.Empty;
                        break;
                }
            }

            worksheet.Row(rowNumber).Height = 28;
        }

        if (rows.Count > 0)
        {
            var table = worksheet.Range(headerRow, 1, lastDataRow, columnCount).CreateTable(tableName);
            table.Theme = XLTableTheme.TableStyleMedium2;
            table.ShowRowStripes = true;
        }
        else
        {
            worksheet.Cell(dataStartRow, 1).Value = "Không có dữ liệu trong danh mục này.";
            worksheet.Range(dataStartRow, 1, dataStartRow, columnCount).Merge();
            worksheet.Range(dataStartRow, 1, dataStartRow, columnCount).Style
                .Font.FontColor = XLColor.FromHtml("#64748B");
            worksheet.Row(dataStartRow).Height = 28;
        }

        worksheet.SheetView.FreezeRows(headerRow);
    }

    private static async Task<int> WriteJsonArrayAsync<T>(
        ZipArchive archive,
        string entryName,
        IAsyncEnumerable<T> rows,
        CancellationToken cancellationToken)
    {
        var entry = archive.CreateEntry(entryName, CompressionLevel.Optimal);
        await using var stream = entry.Open();
        using var writer = new Utf8JsonWriter(stream, new JsonWriterOptions { Indented = true });
        var count = 0;
        writer.WriteStartArray();
        await foreach (var row in rows.WithCancellation(cancellationToken))
        {
            JsonSerializer.Serialize(writer, row, JsonOptions);
            count++;
        }
        writer.WriteEndArray();
        await writer.FlushAsync(cancellationToken);
        return count;
    }

    private static async Task WriteJsonAsync<T>(
        ZipArchive archive,
        string entryName,
        T value,
        CancellationToken cancellationToken)
    {
        var entry = archive.CreateEntry(entryName, CompressionLevel.Optimal);
        await using var stream = entry.Open();
        await JsonSerializer.SerializeAsync(stream, value, JsonOptions, cancellationToken);
    }

    private static async Task<int> WriteCsvAsync<T>(
        ZipArchive archive,
        string entryName,
        IReadOnlyList<string> headers,
        IAsyncEnumerable<T> rows,
        Func<T, IReadOnlyList<string?>> values,
        CancellationToken cancellationToken)
    {
        var entry = archive.CreateEntry(entryName, CompressionLevel.Optimal);
        await using var stream = entry.Open();
        await using var writer = new StreamWriter(stream, new UTF8Encoding(encoderShouldEmitUTF8Identifier: true));
        await WriteCsvRowAsync(writer, headers, cancellationToken);
        var count = 0;
        await foreach (var row in rows.WithCancellation(cancellationToken))
        {
            await WriteCsvRowAsync(writer, values(row), cancellationToken);
            count++;
        }
        return count;
    }

    private static async Task WriteCsvRowAsync(
        StreamWriter writer,
        IReadOnlyList<string?> values,
        CancellationToken cancellationToken)
    {
        var escaped = values.Select(value =>
        {
            var text = value ?? string.Empty;
            if (text.Length > 0 && text.TrimStart() is { Length: > 0 } trimmed
                && trimmed[0] is '=' or '+' or '-' or '@')
                text = $"'{text}";
            return $"\"{text.Replace("\"", "\"\"")}\"";
        });
        await writer.WriteLineAsync(string.Join(",", escaped).AsMemory(), cancellationToken);
    }

    private async Task<IReadOnlyList<TenantExportFileReference>> GetFileReferencesAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var references = new List<TenantExportFileReference>();
        references.AddRange(await context.Documents.IgnoreQueryFilters().AsNoTracking()
            .Where(item => item.TenantId == tenantId && !item.IsDeleted && item.FilePath != null)
            .Select(item => new TenantExportFileReference("documents", item.PublicId, item.FileName, item.FilePath))
            .ToListAsync(cancellationToken));
        references.AddRange(await context.DocumentVersions.IgnoreQueryFilters().AsNoTracking()
            .Where(item => item.TenantId == tenantId && !item.IsDeleted)
            .Select(item => new TenantExportFileReference("document-versions", item.PublicId, item.FileName, item.FilePath))
            .ToListAsync(cancellationToken));
        references.AddRange(await context.WeeklyReports.IgnoreQueryFilters().AsNoTracking()
            .Where(item => item.TenantId == tenantId && !item.IsDeleted && item.FileUrl != null)
            .Select(item => new TenantExportFileReference("weekly-reports", item.PublicId, item.FileName, item.FileUrl))
            .ToListAsync(cancellationToken));
        references.AddRange(await context.WeeklyReportVersions.IgnoreQueryFilters().AsNoTracking()
            .Where(item => item.TenantId == tenantId && !item.IsDeleted)
            .Select(item => new TenantExportFileReference("weekly-report-versions", item.PublicId, item.FileName, item.FileUrl))
            .ToListAsync(cancellationToken));
        references.AddRange(await context.Submissions.IgnoreQueryFilters().AsNoTracking()
            .Where(item => item.TenantId == tenantId && !item.IsDeleted && item.FileUrl != null)
            .Select(item => new TenantExportFileReference("submissions", item.PublicId, item.FileName, item.FileUrl))
            .ToListAsync(cancellationToken));
        references.AddRange(await context.SubmissionAssets.IgnoreQueryFilters().AsNoTracking()
            .Where(item => item.TenantId == tenantId && !item.IsDeleted
                && item.AssetType == "file" && item.FileUrl != null)
            .Select(item => new TenantExportFileReference("submission-assets", item.PublicId, item.FileName, item.FileUrl))
            .ToListAsync(cancellationToken));
        var studentResumes = await context.Students.IgnoreQueryFilters().AsNoTracking()
            .Where(item => item.TenantId == tenantId && !item.IsDeleted && item.ResumeUrl != null)
            .Select(item => new { item.PublicId, item.ResumeUrl })
            .ToListAsync(cancellationToken);
        references.AddRange(studentResumes.Select(item => new TenantExportFileReference(
            "student-resumes",
            item.PublicId,
            GetResumeFileName(item.ResumeUrl),
            item.ResumeUrl)));
        return references;
    }

    private async Task<(IReadOnlyList<TenantExportFile> Files, IReadOnlyList<TenantExportFileManifestItem> Manifest)>
        AddFilesAsync(
            ZipArchive archive,
            IReadOnlyList<TenantExportFileReference> references,
            CancellationToken cancellationToken)
    {
        var filesByPath = new Dictionary<string, TenantExportFile>(StringComparer.OrdinalIgnoreCase);
        var manifest = new List<TenantExportFileManifestItem>(references.Count);

        foreach (var reference in references)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var fullPath = TenantManagedFilePathResolver.Resolve(
                reference.StoragePath,
                environment.WebRootPath,
                environment.ContentRootPath);
            if (fullPath == null)
            {
                manifest.Add(new TenantExportFileManifestItem(
                    reference.RecordType,
                    reference.RecordId,
                    reference.FileName,
                    null));
                continue;
            }

            if (!filesByPath.TryGetValue(fullPath, out var archivedFile))
            {
                var archivePath = $"files/{reference.RecordType}/{reference.RecordId:N}_{SanitizeFileName(reference.FileName)}";
                var entry = archive.CreateEntry(archivePath, CompressionLevel.Optimal);
                await using (var target = entry.Open())
                await using (var source = new FileStream(
                                 fullPath,
                                 FileMode.Open,
                                 FileAccess.Read,
                                 FileShare.Read,
                                 81920,
                                 FileOptions.Asynchronous | FileOptions.SequentialScan))
                {
                    await source.CopyToAsync(target, cancellationToken);
                }

                archivedFile = new TenantExportFile(archivePath);
                filesByPath.Add(fullPath, archivedFile);
            }

            manifest.Add(new TenantExportFileManifestItem(
                reference.RecordType,
                reference.RecordId,
                reference.FileName,
                archivedFile.ArchivePath));
        }

        return (filesByPath.Values.ToArray(), manifest);
    }

    private static string SanitizeFileName(string? fileName)
    {
        var name = Path.GetFileName(fileName ?? string.Empty);
        var safeName = new string(name.Select(character =>
            char.IsLetterOrDigit(character) || character is '.' or '-' or '_'
                ? character
                : '_').Take(120).ToArray());
        return string.IsNullOrWhiteSpace(safeName) ? "file" : safeName;
    }

    private static string GetResumeFileName(string? path)
    {
        if (string.IsNullOrWhiteSpace(path))
            return "resume";

        var fileName = Path.GetFileName(path);
        if (Uri.TryCreate(path, UriKind.Absolute, out var uri)
            && (uri.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
                || uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)))
            fileName = Path.GetFileName(uri.AbsolutePath);
        return SanitizeFileName(fileName);
    }

    private sealed record TenantExportFileReference(
        string RecordType,
        Guid RecordId,
        string? FileName,
        string? StoragePath);

    private sealed record TenantExportFile(string ArchivePath);

    private sealed record TenantExportFileManifestItem(
        string RecordType,
        Guid RecordId,
        string? FileName,
        string? ArchivePath);
}

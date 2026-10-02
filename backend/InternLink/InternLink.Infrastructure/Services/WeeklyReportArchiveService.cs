using System.IO.Compression;
using System.Text;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public sealed class WeeklyReportArchiveService : IWeeklyReportArchiveService
{
    private readonly AppDbContext _db;
    private readonly IWeeklyReportService _weeklyReportService;

    public WeeklyReportArchiveService(AppDbContext db, IWeeklyReportService weeklyReportService)
    {
        _db = db;
        _weeklyReportService = weeklyReportService;
    }

    public async Task<IReadOnlyList<WeeklyReportArchiveStudentDto>?> GetStudentsAsync(Guid semesterId, Guid departmentId)
    {
        if (!await IsSemesterInScopeAsync(semesterId, departmentId))
            return null;

        var internships = await GetInternshipsQuery(semesterId, departmentId)
            .Include(item => item.Student)
            .Include(item => item.Company)
            .Include(item => item.WeeklyReports.Where(report => !report.IsDeleted))
            .OrderBy(item => item.Student!.StudentCode)
            .ToListAsync();

        return internships.Select(item =>
        {
            var reports = item.WeeklyReports.OrderBy(report => report.WeekNumber).ToList();
            return new WeeklyReportArchiveStudentDto
            {
                StudentId = item.StudentId,
                StudentCode = item.Student!.StudentCode,
                StudentName = item.Student.FullName,
                ClassName = item.Student.Class,
                CompanyName = item.Company?.CompanyName,
                ReportCount = reports.Count,
                FileCount = reports.Count(report => !string.IsNullOrWhiteSpace(report.FileUrl)),
                Weeks = reports.Select(report => report.WeekNumber).Distinct().ToList(),
                LastSubmittedAt = reports
                    .Where(report => report.SubmittedAt.HasValue)
                    .Select(report => report.SubmittedAt)
                    .Max(),
            };
        }).ToList();
    }

    public async Task<WeeklyReportArchiveZipDto?> CreateZipAsync(
        Guid semesterId,
        Guid departmentId,
        Guid userId,
        Guid? studentId = null)
    {
        var semester = await _db.Semesters.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == semesterId && !item.IsDeleted
                && (item.DepartmentId == null || item.DepartmentId == departmentId));
        if (semester == null)
            return null;

        var internships = await GetInternshipsQuery(semesterId, departmentId, studentId)
            .Include(item => item.Student)
            .Include(item => item.Company)
            .Include(item => item.WeeklyReports.Where(report => !report.IsDeleted))
            .ToListAsync();
        if (studentId.HasValue && internships.Count == 0)
            return null;

        var reports = internships
            .SelectMany(item => item.WeeklyReports.Select(report => (Internship: item, Report: report)))
            .OrderBy(item => item.Internship.Student!.StudentCode)
            .ThenBy(item => item.Report.WeekNumber)
            .ThenBy(item => item.Report.Version)
            .ToList();
        if (reports.Count == 0)
            return null;

        using var output = new MemoryStream();
        using (var archive = new ZipArchive(output, ZipArchiveMode.Create, leaveOpen: true, Encoding.UTF8))
        {
            var addedFiles = 0;
            foreach (var item in reports)
            {
                var student = item.Internship.Student!;
                byte[] content;
                string fileName;

                if (!string.IsNullOrWhiteSpace(item.Report.FileUrl))
                {
                    var file = await _weeklyReportService.DownloadFileAsync(item.Report.Id, userId, isLecturerOrAdmin: true);
                    if (file == null)
                        continue;
                    content = file.FileContent;
                    fileName = file.FileName;
                }
                else if (!string.IsNullOrWhiteSpace(item.Report.Content))
                {
                    content = Encoding.UTF8.GetBytes(item.Report.Content);
                    fileName = $"{SanitizeFileName(item.Report.Title)}.txt";
                }
                else
                {
                    continue;
                }

                var studentFolder = SanitizeFileName($"{student.StudentCode}_{student.FullName}");
                var safeFileName = SanitizeFileName(Path.GetFileName(fileName.Replace('\\', '/')));
                var entryName = $"{studentFolder}/Week-{item.Report.WeekNumber:D2}_V{item.Report.Version:D2}_{safeFileName}";
                var entry = archive.CreateEntry(entryName, CompressionLevel.Fastest);
                await using var entryStream = entry.Open();
                await entryStream.WriteAsync(content);
                addedFiles++;
            }

            if (addedFiles == 0)
                return null;
        }

        var archiveStudentCode = studentId.HasValue
            ? internships[0].Student?.StudentCode ?? studentId.Value.ToString("N")
            : null;
        var archiveName = studentId.HasValue
            ? $"{SanitizeFileName(archiveStudentCode!)}_weekly-reports_{SanitizeFileName(semester.Name)}.zip"
            : $"weekly-reports_{SanitizeFileName(semester.Name)}.zip";
        return new WeeklyReportArchiveZipDto { Content = output.ToArray(), FileName = archiveName };
    }

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

    private static string SanitizeFileName(string value)
    {
        var invalidCharacters = Path.GetInvalidFileNameChars().Concat(new[] { '/', '\\' }).ToHashSet();
        var safeName = new string(value
            .Select(character => char.IsControl(character) || invalidCharacters.Contains(character) ? '_' : character)
            .ToArray())
            .Trim(' ', '.');
        return string.IsNullOrWhiteSpace(safeName) ? "report" : safeName;
    }
}
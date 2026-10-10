using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public sealed class LecturerParticipationHistoryService : ILecturerParticipationHistoryService
{
    private readonly AppDbContext _db;

    public LecturerParticipationHistoryService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<LecturerParticipationHistoryDto?> GetSemesterHistoryAsync(Guid lecturerId, Guid semesterId)
    {
        var semester = await _db.Semesters.AsNoTracking()
            .Where(item => item.Id == semesterId && !item.IsDeleted)
            .Select(item => new { item.Id, item.Name, item.Term, item.AcademicYear })
            .FirstOrDefaultAsync();

        if (semester == null)
            return null;

        var hasSemesterAccess = await _db.Internships.AsNoTracking()
                .AnyAsync(item => item.LecturerId == lecturerId && item.SemesterId == semesterId && !item.IsDeleted)
            || await _db.SemesterLecturers.AsNoTracking()
                .AnyAsync(item => item.LecturerId == lecturerId && item.SemesterId == semesterId && !item.IsDeleted)
            || await _db.LecturerActivityLogs.AsNoTracking()
                .AnyAsync(item => item.LecturerId == lecturerId && item.SemesterId == semesterId && !item.IsDeleted);
        if (!hasSemesterAccess)
            return null;

        var storedLogs = await _db.LecturerActivityLogs.AsNoTracking()
            .Where(item => item.LecturerId == lecturerId && item.SemesterId == semesterId && !item.IsDeleted)
            .OrderByDescending(item => item.OccurredAt)
            .ToListAsync();
        var logs = storedLogs.Select(item => new LecturerHistoryActivityDto
        {
            Id = item.Id,
            StudentId = item.StudentId,
            StudentName = item.StudentName,
            CompanyName = item.CompanyName,
            ActivityType = item.ActivityType,
            Title = item.Title,
            Detail = item.Detail,
            WeekNumber = item.WeekNumber,
            OccurredAt = item.OccurredAt,
        }).ToList();

        var internships = await _db.Internships.AsNoTracking()
            .Where(item => item.SemesterId == semesterId && !item.IsDeleted
                && item.LecturerId == lecturerId)
            .Include(item => item.Student)
            .Include(item => item.Company)
            .OrderBy(item => item.Student!.StudentCode)
            .ToListAsync();
        var internshipIds = internships.Select(item => item.Id).ToList();

        var reports = await _db.WeeklyReports.AsNoTracking()
            .Where(item => internshipIds.Contains(item.InternshipId) && !item.IsDeleted)
            .Include(item => item.Feedbacks.Where(feedback => !feedback.IsDeleted))
            .ThenInclude(feedback => feedback.Lecturer)
            .Include(item => item.Internship)
                .ThenInclude(internship => internship.Company)
            .ToListAsync();

        foreach (var report in reports)
        {
            var internship = internships.First(item => item.Id == report.InternshipId);
            if (report.SubmittedAt.HasValue && report.Status != WeeklyReportStatus.Draft)
            {
                logs.Add(new LecturerHistoryActivityDto
                {
                    Id = report.Id,
                    StudentId = internship.StudentId,
                    StudentName = internship.Student?.FullName,
                    CompanyName = internship.Company?.CompanyName,
                    ActivityType = "weekly-report-submitted",
                    Title = $"Đã nộp báo cáo tuần {report.WeekNumber}",
                    WeekNumber = report.WeekNumber,
                    OccurredAt = report.SubmittedAt.Value,
                });
            }

            foreach (var feedback in report.Feedbacks.Where(item => item.LecturerId == lecturerId))
            {
                if (storedLogs.Any(item => item.RelatedEntityId == report.Id
                    && item.ActivityType == "weekly-report-review"))
                    continue;

                logs.Add(new LecturerHistoryActivityDto
                {
                    Id = feedback.Id,
                    StudentId = internship.StudentId,
                    StudentName = internship.Student?.FullName,
                    CompanyName = internship.Company?.CompanyName,
                    ActivityType = "weekly-report-feedback",
                    Title = $"Phản hồi báo cáo tuần {report.WeekNumber}",
                    Detail = feedback.Comment,
                    WeekNumber = report.WeekNumber,
                    OccurredAt = feedback.CreatedAt,
                });
            }
        }

        var reviewedCounts = reports
            .Where(report => report.Feedbacks.Any(feedback => feedback.LecturerId == lecturerId)
                || storedLogs.Any(item => item.ActivityType == "weekly-report-review"
                    && item.RelatedEntityId == report.Id))
            .GroupBy(report => report.InternshipId)
            .ToDictionary(group => group.Key, group => group.Count());

        var evaluations = await _db.Evaluations.AsNoTracking()
            .Where(item => internshipIds.Contains(item.InternshipId) && !item.IsDeleted)
            .ToDictionaryAsync(item => item.InternshipId);

        var students = internships.Select(internship =>
        {
            evaluations.TryGetValue(internship.Id, out var evaluation);
            return new LecturerHistoryStudentDto
            {
                InternshipId = internship.Id,
                StudentId = internship.StudentId,
                StudentCode = internship.Student?.StudentCode ?? string.Empty,
                StudentName = internship.Student?.FullName ?? string.Empty,
                ClassName = internship.Student?.Class,
                CompanyName = internship.Company?.CompanyName,
                ReviewedReportCount = reviewedCounts.GetValueOrDefault(internship.Id),
                FinalGrade = evaluation?.IsFinalized == true ? evaluation.FinalGrade : null,
                IsFinalized = evaluation?.IsFinalized == true,
            };
        }).ToList();

        var activities = logs
            .OrderByDescending(item => item.OccurredAt)
            .ThenBy(item => item.Title)
            .ToList();

        return new LecturerParticipationHistoryDto
        {
            SemesterId = semester.Id,
            SemesterName = string.IsNullOrWhiteSpace(semester.Name)
                ? $"{semester.Term} ({semester.AcademicYear})"
                : semester.Name,
            GeneratedAt = DateTime.UtcNow,
            LastActivityAt = activities.FirstOrDefault()?.OccurredAt,
            Students = students,
            Activities = activities,
        };
    }
}
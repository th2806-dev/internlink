using AutoMapper;

using ClosedXML.Excel;

using InternLink.Application.Common;
using InternLink.Application.DTOs;

using InternLink.Application.Interfaces;

using InternLink.Domain.Entities;

using InternLink.Domain.Enums;

using InternLink.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;



namespace InternLink.Infrastructure.Services;



public class LecturerService : ILecturerService

{

    private readonly AppDbContext _db;

    private readonly IMapper _mapper;

    private readonly INotificationService _notificationService;



    public LecturerService(AppDbContext db, IMapper mapper, INotificationService notificationService)
    {
        _db = db;
        _mapper = mapper;
        _notificationService = notificationService;
    }

    public async Task<LecturerOverviewDto?> GetMeAsync(Guid userId)
    {
        var lecturer = await _db.Lecturers
            .FirstOrDefaultAsync(l => l.UserId == userId && !l.IsDeleted);

        if (lecturer == null)
            return null;

        var internships = await _db.Internships
            .Where(i => i.LecturerId == lecturer.Id && !i.IsDeleted)
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

    public async Task<LecturerDashboardStatsDto> GetDashboardStatsAsync(Guid userId, Guid? semesterId = null)
    {
        var lecturerId = await ResolveLecturerIdAsync(userId);
        if (lecturerId == null)
        {
            return new LecturerDashboardStatsDto();
        }

        var query = _db.Internships
            .Where(i => i.LecturerId == lecturerId.Value && !i.IsDeleted)
            .AsQueryable();

        if (semesterId.HasValue)
            query = query.Where(i => i.SemesterId == semesterId.Value);
        var internships = await query
            .Include(i => i.Student)
                .ThenInclude(s => s.User)
            .Include(i => i.Company)
            .Include(i => i.Semester)
            .Include(i => i.Submissions)
            .Include(i => i.WeeklyReports)
            .ToListAsync();

        var internshipIds = internships.Select(i => i.Id).ToList();

        var evaluations = await _db.Evaluations
            .Where(e => !e.IsDeleted && internshipIds.Contains(e.InternshipId))
            .ToListAsync();
        var evalDict = evaluations.ToDictionary(e => e.InternshipId);

        var requiredWeeksBySemester = await LoadRequiredWeeksBySemesterAsync(internships);

        var total = internships.Count;
        var assignedCompanyCount = internships.Count(i => i.CompanyId.HasValue && i.Company != null);
        var interning = internships.Count(i =>
            (i.Status == InternshipStatus.NotStarted && i.CompanyId.HasValue
                ? InternshipStatus.InProgress
                : i.Status) is InternshipStatus.InProgress
                or InternshipStatus.BehindSchedule
                or InternshipStatus.AwaitingFeedback
                or InternshipStatus.RequiresRevision);
        var completed = internships.Count(i =>
        {
            evalDict.TryGetValue(i.Id, out var eval);
            var effectiveStatus = i.Status == InternshipStatus.NotStarted && i.CompanyId.HasValue
                ? InternshipStatus.InProgress
                : i.Status;
            return InternshipProgressCalculator.IsInternshipFinished(effectiveStatus, eval);
        });
        
        var pendingSubmissions = internships.Sum(i => i.Submissions.Count(s => !s.IsDeleted && s.Status == SubmissionStatus.Submitted));
        var pendingReports = internships.Sum(i => i.WeeklyReports.Count(w => !w.IsDeleted && w.Status == WeeklyReportStatus.Submitted));
        var pendingReviews = pendingSubmissions + pendingReports;

        var overdueReports = internships.Sum(i => i.WeeklyReports.Count(w => !w.IsDeleted && w.Status == WeeklyReportStatus.Draft && w.CreatedAt < DateTime.UtcNow.AddDays(-7)));

        var finalizedEvals = evaluations.Where(e => e.IsFinalized).ToList();
        var avgGrade = finalizedEvals.Any() ? Math.Round(finalizedEvals.Average(e => e.FinalGrade), 2) : 0m;

        var statusDict = internships
            .GroupBy(i => (i.Status == InternshipStatus.NotStarted && i.CompanyId.HasValue
                ? InternshipStatus.InProgress
                : i.Status).ToString())
            .ToDictionary(g => g.Key, g => g.Count());

        var averageProgress = total == 0
            ? 0
            : (int)Math.Round(internships.Average(i =>
            {
                evalDict.TryGetValue(i.Id, out var eval);
                if (i.Student == null) return 0;
                requiredWeeksBySemester.TryGetValue(i.SemesterId, out var requiredWeeks);
                var bd = InternshipProgressCalculator.Calculate(
                    i.Student.User,
                    i.Student,
                    i,
                    i.WeeklyReports,
                    eval,
                    i.Semester?.TotalWeeks,
                    requiredWeeks);
                return bd.TotalPercent;
            }));

        return new LecturerDashboardStatsDto
        {
            TotalStudents = total,
            AssignedCompanyCount = assignedCompanyCount,
            InterningCount = interning,
            AverageProgress = averageProgress,
            PendingReviewsCount = pendingReviews,
            CompletedCount = completed,
            OverdueReportsCount = overdueReports,
            AverageGrade = avgGrade,
            EvaluatedCount = evaluations.Count,
            StatusDistribution = statusDict
        };
    }

    public async Task<IEnumerable<LecturerStudentListItemDto>> GetAssignedStudentsAsync(Guid userId, string? search = null, string? status = null, Guid? semesterId = null)
    {
        var lecturerId = await ResolveLecturerIdAsync(userId);
        if (lecturerId == null)
            return Array.Empty<LecturerStudentListItemDto>();

        var query = _db.Internships
            .Where(i => i.LecturerId == lecturerId.Value && !i.IsDeleted)
            .AsQueryable();

        if (semesterId.HasValue)
            query = query.Where(i => i.SemesterId == semesterId.Value);

        query = query
            .Include(i => i.Student)
                .ThenInclude(s => s.User)
            .Include(i => i.Company)
            .Include(i => i.Semester)
            .Include(i => i.Submissions)
            .Include(i => i.WeeklyReports);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(i =>
                (i.Student != null && (i.Student.FullName.ToLower().Contains(s) || i.Student.StudentCode.ToLower().Contains(s) || (i.Student.Class != null && i.Student.Class.ToLower().Contains(s)))) ||
                (i.Company != null && i.Company.CompanyName.ToLower().Contains(s)) ||
                (i.Position != null && i.Position.ToLower().Contains(s)));
        }

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<InternshipStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(i => i.Status == parsedStatus);
        }

        var internships = await query
            .OrderBy(i => i.Student != null ? i.Student.FullName : string.Empty)
            .ToListAsync();

        var internshipIds = internships.Select(i => i.Id).ToList();

        var evaluations = await _db.Evaluations
            .Where(e => !e.IsDeleted && internshipIds.Contains(e.InternshipId))
            .ToDictionaryAsync(e => e.InternshipId);

        var requiredWeeksBySemester = await LoadRequiredWeeksBySemesterAsync(internships);

        var result = new List<LecturerStudentListItemDto>();

        foreach (var i in internships)
        {
            evaluations.TryGetValue(i.Id, out var eval);
            var weeklyCount = i.WeeklyReports?.Count(w => !w.IsDeleted) ?? 0;
            var pendingReportCount = i.WeeklyReports?.Count(w => !w.IsDeleted && w.Status == WeeklyReportStatus.Submitted) ?? 0;
            var submissionCount = i.Submissions?.Count(s => !s.IsDeleted) ?? 0;
            var effectiveStatus = i.Status == InternshipStatus.NotStarted && i.CompanyId.HasValue
                ? InternshipStatus.InProgress
                : i.Status;

            ProgressBreakdownDto? breakdown = null;
            int progressPercent = 0;
            if (i.Student != null)
            {
                requiredWeeksBySemester.TryGetValue(i.SemesterId, out var requiredWeeks);
                breakdown = InternshipProgressCalculator.Calculate(
                    i.Student.User,
                    i.Student,
                    i,
                    i.WeeklyReports,
                    eval,
                    i.Semester?.TotalWeeks,
                    requiredWeeks);
                progressPercent = breakdown.TotalPercent;
            }

            result.Add(new LecturerStudentListItemDto
            {
                StudentId = i.StudentId,
                InternshipId = i.Id,
                StudentCode = i.Student?.StudentCode ?? string.Empty,
                FullName = i.Student?.FullName ?? string.Empty,
                Email = i.Student?.Email,
                Phone = i.Student?.Phone,
                Class = i.Student?.Class,
                Major = i.Student?.Major,
                CompanyId = i.CompanyId,
                CompanyName = i.Company?.CompanyName,
                Position = i.Position,
                InternshipStatus = effectiveStatus.ToString(),
                StartDate = i.StartDate,
                EndDate = i.EndDate,
                WeeklyReportCount = weeklyCount,
                PendingReportCount = pendingReportCount,
                SubmissionCount = submissionCount,
                Notes = i.Notes,
                FinalGrade = eval?.FinalGrade,
                HasEvaluation = eval != null,
                IsEvaluationFinalized = eval?.IsFinalized ?? false,
                ProgressPercent = progressPercent,
                ProgressBreakdown = breakdown
            });
        }

        return result;
    }

    public async Task<IEnumerable<LecturerCompanySummaryDto>> GetAssignedCompaniesAsync(Guid userId, Guid? semesterId = null)
    {
        var lecturerId = await ResolveLecturerIdAsync(userId);
        if (lecturerId == null)
            return Array.Empty<LecturerCompanySummaryDto>();

        var query = _db.Internships
            .Where(i => i.LecturerId == lecturerId.Value && !i.IsDeleted && i.CompanyId != null)
            .AsQueryable();

        if (semesterId.HasValue)
            query = query.Where(i => i.SemesterId == semesterId.Value);

        var internships = await query
            .Include(i => i.Company)
            .ToListAsync();

        var companyGroups = internships
            .Where(i => i.Company != null && !i.Company.IsDeleted)
            .GroupBy(i => i.Company!)
            .Select(g => new LecturerCompanySummaryDto
            {
                Id = g.Key.Id,
                CompanyName = g.Key.CompanyName,
                Industry = g.Key.Industry,
                ContactPerson = g.Key.ContactPerson,
                ContactEmail = g.Key.ContactEmail,
                ContactPhone = g.Key.ContactPhone,
                Address = g.Key.Address,
                AssignedStudentsCount = g.Count()
            })
            .OrderByDescending(c => c.AssignedStudentsCount)
            .ThenBy(c => c.CompanyName)
            .ToList();

        return companyGroups;
    }    public async Task<IEnumerable<InternshipDto>> GetInternshipsAsync(Guid userId, Guid? semesterId = null)
    {
        var lecturerId = await ResolveLecturerIdAsync(userId);
        if (lecturerId == null)
            return Array.Empty<InternshipDto>();

        var query = _db.Internships
            .Where(i => !i.IsDeleted && i.LecturerId == lecturerId)
            .AsQueryable();

        if (semesterId.HasValue)
        {
            query = query.Where(i => i.SemesterId == semesterId.Value);
        }
        else
        {
            // Try Active semester first; if none exists, return all internships
            var hasActive = await _db.Semesters.AnyAsync(s => s.Status == SemesterStatus.Active && !s.IsDeleted);
            if (hasActive)
                query = query.Where(i => i.Semester!.Status == SemesterStatus.Active);
            // else: no filter — return all internships for this lecturer
        }

        var internships = await query
            .Include(i => i.Student)
            .Include(i => i.Company)
            .Include(i => i.Semester)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return _mapper.Map<List<InternshipDto>>(internships);
    }



    public async Task<InternshipDetailDto?> GetInternshipAsync(Guid internshipId, Guid userId)

    {

        var lecturerId = await ResolveLecturerIdAsync(userId);

        if (lecturerId == null)

            return null;



        var internship = await _db.Internships

            .Where(i => !i.IsDeleted && i.LecturerId == lecturerId)

            .Include(i => i.Student)

            .Include(i => i.Company)

            .Include(i => i.Submissions.Where(s => !s.IsDeleted))

                .ThenInclude(s => s.Feedbacks.Where(f => !f.IsDeleted))

                    .ThenInclude(f => f.Lecturer)

            .FirstOrDefaultAsync(i => i.Id == internshipId);



        return internship == null ? null : _mapper.Map<InternshipDetailDto>(internship);

    }



    public async Task<IEnumerable<SubmissionDto>> GetSubmissionsByInternshipAsync(Guid internshipId, Guid userId)

    {

        var lecturerId = await ResolveLecturerIdAsync(userId);

        if (lecturerId == null)

            return Array.Empty<SubmissionDto>();



        var ownsInternship = await _db.Internships

            .AnyAsync(i => i.Id == internshipId && i.LecturerId == lecturerId && !i.IsDeleted);

        if (!ownsInternship)

            return Array.Empty<SubmissionDto>();



        var submissions = await _db.Submissions

            .Where(s => s.InternshipId == internshipId && !s.IsDeleted)

            .Include(s => s.Feedbacks.Where(f => !f.IsDeleted))

                .ThenInclude(f => f.Lecturer)

            .OrderByDescending(s => s.SubmittedAt)

            .ToListAsync();



        return _mapper.Map<List<SubmissionDto>>(submissions);
    }

    public async Task<IEnumerable<SubmissionDto>> GetAssignedSubmissionsAsync(Guid userId, Guid? semesterId = null)
    {
        var lecturerId = await ResolveLecturerIdAsync(userId);
        if (lecturerId == null)
            return Array.Empty<SubmissionDto>();

        var internshipQuery = _db.Internships
            .AsNoTracking()
            .Where(i => i.LecturerId == lecturerId && !i.IsDeleted);

        if (semesterId.HasValue)
            internshipQuery = internshipQuery.Where(i => i.SemesterId == semesterId.Value);

        var internshipIds = await internshipQuery.Select(i => i.Id).ToListAsync();
        if (internshipIds.Count == 0)
            return Array.Empty<SubmissionDto>();

        var submissions = await _db.Submissions
            .AsNoTracking()
            .Where(s => internshipIds.Contains(s.InternshipId) && !s.IsDeleted)
            .Include(s => s.Assets.Where(a => !a.IsDeleted))
            .Include(s => s.Internship)
                .ThenInclude(i => i.Student)
            .Include(s => s.Internship)
                .ThenInclude(i => i.Company)
            .Include(s => s.Feedbacks.Where(f => !f.IsDeleted))
                .ThenInclude(f => f.Lecturer)
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync();

        return _mapper.Map<List<SubmissionDto>>(submissions);
    }

    public async Task<PaginatedResponse<WeeklyReportDto>> GetAssignedWeeklyReportsAsync(Guid userId, WeeklyReportFilterRequest filter)
    {
        var lecturerId = await ResolveLecturerIdAsync(userId);
        if (lecturerId == null)
            return new PaginatedResponse<WeeklyReportDto> { Skip = filter.Skip, Take = filter.Take };

        var internshipQuery = _db.Internships
            .AsNoTracking()
            .Where(i => i.LecturerId == lecturerId && !i.IsDeleted);

        if (filter.SemesterId.HasValue)
            internshipQuery = internshipQuery.Where(i => i.SemesterId == filter.SemesterId.Value);

        var reportQuery = _db.WeeklyReports
            .AsNoTracking()
            .Where(r => internshipQuery.Any(i => i.Id == r.InternshipId) && !r.IsDeleted)
            .Include(r => r.Internship)
                .ThenInclude(i => i.Student)
            .Include(r => r.Feedbacks.Where(f => !f.IsDeleted))
                .ThenInclude(f => f.Lecturer)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Status))
            reportQuery = reportQuery.Where(r => r.Status.ToString() == filter.Status);

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var term = filter.SearchTerm.Trim().ToLower();
            reportQuery = reportQuery.Where(r =>
                r.Title.ToLower().Contains(term) ||
                (r.Internship.Student != null &&
                 (r.Internship.Student.FullName.ToLower().Contains(term) ||
                  r.Internship.Student.StudentCode.ToLower().Contains(term))));
        }

        var total = await reportQuery.CountAsync();
        var reports = await reportQuery
            .OrderByDescending(r => r.CreatedAt)
            .ThenByDescending(r => r.Id)
            .Skip(Math.Max(0, filter.Skip))
            .Take(Math.Clamp(filter.Take, 1, 100))
            .ToListAsync();

        return new PaginatedResponse<WeeklyReportDto>
        {
            Items = _mapper.Map<List<WeeklyReportDto>>(reports),
            Total = total,
            Skip = filter.Skip,
            Take = Math.Clamp(filter.Take, 1, 100),
        };
    }



    public async Task<FeedbackDto?> AddFeedbackAsync(Guid submissionId, Guid authorId, CreateFeedbackRequest request)

    {

        var lecturerId = await ResolveLecturerIdAsync(authorId);



        var submission = await _db.Submissions

            .Include(s => s.Internship)

                .ThenInclude(i => i.Student)

            .FirstOrDefaultAsync(s => s.Id == submissionId && !s.IsDeleted);



        if (submission == null)

            return null;



        if (lecturerId == null || submission.Internship.LecturerId != lecturerId)

            throw new UnauthorizedAccessException("You can only give feedback on internships assigned to you");



        var newStatus = string.IsNullOrWhiteSpace(request.NewStatus)

            ? SubmissionStatus.RevisionRequested

            : Enum.TryParse<SubmissionStatus>(request.NewStatus, true, out var parsed)

                ? parsed

                : throw new InvalidOperationException($"Invalid status: {request.NewStatus}");



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



        await _db.Feedbacks.AddAsync(feedback);

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



    public async Task<byte[]> ExportEndOfTermExcelAsync(Guid userId)

    {

        var lecturerId = await ResolveLecturerIdAsync(userId)

            ?? throw new UnauthorizedAccessException("Lecturer profile not found for current user");



        var lecturer = await _db.Lecturers

            .AsNoTracking()

            .FirstAsync(l => l.Id == lecturerId && !l.IsDeleted);



        var internships = await _db.Internships

            .AsNoTracking()

            .Where(i => !i.IsDeleted && i.LecturerId == lecturerId)

            .Include(i => i.Student)

            .Include(i => i.Company)

            .OrderBy(i => i.Student!.FullName)

            .ToListAsync();



        var internshipIds = internships.Select(i => i.Id).ToList();



        var evaluations = await _db.Evaluations

            .AsNoTracking()

            .Where(e => !e.IsDeleted && internshipIds.Contains(e.InternshipId))

            .ToDictionaryAsync(e => e.InternshipId);



        var weeklyReportCounts = await _db.WeeklyReports

            .AsNoTracking()

            .Where(r => !r.IsDeleted && internshipIds.Contains(r.InternshipId))

            .GroupBy(r => r.InternshipId)

            .Select(g => new { InternshipId = g.Key, Count = g.Count() })

            .ToDictionaryAsync(x => x.InternshipId, x => x.Count);



        var submissionCounts = await _db.Submissions

            .AsNoTracking()

            .Where(s => !s.IsDeleted && internshipIds.Contains(s.InternshipId))

            .GroupBy(s => s.InternshipId)

            .Select(g => new { InternshipId = g.Key, Count = g.Count() })

            .ToDictionaryAsync(x => x.InternshipId, x => x.Count);



        using var workbook = new XLWorkbook();

        var sheet = workbook.Worksheets.Add("TongKetCuoiKy");



        sheet.Cell(1, 1).Value = "InternLink - Bao cao tong ket cuoi ky thuc tap";

        sheet.Cell(2, 1).Value = "Giang vien:";

        sheet.Cell(2, 2).Value = lecturer.FullName;

        sheet.Cell(3, 1).Value = "Ma GV:";

        sheet.Cell(3, 2).Value = lecturer.StaffCode;

        sheet.Cell(4, 1).Value = "Ngay xuat:";

        sheet.Cell(4, 2).Value = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm") + " UTC";



        var headerRow = 6;

        var headers = new[]

        {

            "MSSV", "HoTen", "Lop", "Nganh", "TenDoanhNghiep", "ViTri",

            "NgayBatDau", "NgayKetThuc", "TrangThai", "SoBaoCaoTuan", "SoBaiNop",

            "DiemKyThuat", "DiemGiaoTiep", "DiemTeamwork", "DiemChuDong", "DiemTong",

            "DaChotDiem", "NhanXet"

        };



        for (var col = 0; col < headers.Length; col++)

            sheet.Cell(headerRow, col + 1).Value = headers[col];



        sheet.Row(headerRow).Style.Font.Bold = true;



        var row = headerRow + 1;

        foreach (var internship in internships)

        {

            evaluations.TryGetValue(internship.Id, out var evaluation);

            weeklyReportCounts.TryGetValue(internship.Id, out var weeklyCount);

            submissionCounts.TryGetValue(internship.Id, out var submissionCount);



            sheet.Cell(row, 1).Value = internship.Student?.StudentCode ?? string.Empty;

            sheet.Cell(row, 2).Value = internship.Student?.FullName ?? string.Empty;

            sheet.Cell(row, 3).Value = internship.Student?.Class ?? string.Empty;

            sheet.Cell(row, 4).Value = internship.Student?.Major ?? string.Empty;

            sheet.Cell(row, 5).Value = internship.Company?.CompanyName ?? string.Empty;

            sheet.Cell(row, 6).Value = internship.Position ?? string.Empty;

            sheet.Cell(row, 7).Value = internship.StartDate?.ToString("yyyy-MM-dd") ?? string.Empty;

            sheet.Cell(row, 8).Value = internship.EndDate?.ToString("yyyy-MM-dd") ?? string.Empty;

            sheet.Cell(row, 9).Value = internship.Status.ToString();

            sheet.Cell(row, 10).Value = weeklyCount;

            sheet.Cell(row, 11).Value = submissionCount;



            if (evaluation != null)

            {

                sheet.Cell(row, 12).Value = evaluation.TechnicalScore;

                sheet.Cell(row, 13).Value = evaluation.CommunicationScore;

                sheet.Cell(row, 14).Value = evaluation.TeamworkScore;

                sheet.Cell(row, 15).Value = evaluation.InitiativeScore;

                sheet.Cell(row, 16).Value = evaluation.FinalGrade;

                sheet.Cell(row, 17).Value = evaluation.IsFinalized ? "Co" : "Chua";

                sheet.Cell(row, 18).Value = evaluation.Comments ?? string.Empty;

            }



            row++;

        }



        sheet.Columns().AdjustToContents();

        sheet.SheetView.FreezeRows(headerRow);



        using var stream = new MemoryStream();

        workbook.SaveAs(stream);

        return stream.ToArray();

    }



    /// <summary>
    /// Tuần báo cáo tuần đang bật theo «Cấu hình báo cáo» của từng học kỳ.
    /// </summary>
    private async Task<Dictionary<Guid?, IReadOnlyList<int>>> LoadRequiredWeeksBySemesterAsync(
        IEnumerable<Internship> internships)
    {
        var semesterIds = internships
            .Select(i => i.SemesterId)
            .Distinct()
            .ToList();

        if (semesterIds.Count == 0)
            return new Dictionary<Guid?, IReadOnlyList<int>>();

        var totalWeeksBySemester = internships
            .GroupBy(i => i.SemesterId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(i => i.Semester?.TotalWeeks ?? 0).FirstOrDefault());

        var schedules = await _db.SemesterReportSchedules
            .AsNoTracking()
            .Where(s => semesterIds.Contains(s.SemesterId) && !s.IsDeleted)
            .ToListAsync();

        var schedulesBySemester = schedules
            .GroupBy(s => (Guid?)s.SemesterId)
            .ToDictionary(g => g.Key, g => (IEnumerable<SemesterReportSchedule>)g);

        var result = new Dictionary<Guid?, IReadOnlyList<int>>();
        foreach (var semesterId in semesterIds)
        {
            totalWeeksBySemester.TryGetValue(semesterId, out var totalWeeks);
            schedulesBySemester.TryGetValue(semesterId, out var semesterSchedules);
            result[semesterId] = InternshipProgressCalculator.ResolveRequiredWeekNumbers(
                totalWeeks,
                semesterSchedules);
        }

        return result;
    }

    private async Task<Guid?> ResolveLecturerIdAsync(Guid userId)

    {

        return await _db.Lecturers

            .Where(l => l.UserId == userId && !l.IsDeleted)

            .Select(l => (Guid?)l.Id)

            .FirstOrDefaultAsync();

    }

    public async Task<List<WeeklyTrendDto>> GetWeeklyTrendAsync(Guid userId, Guid? semesterId = null)
    {
        var lecturerId = await ResolveLecturerIdAsync(userId);
        if (lecturerId == null)
            return new List<WeeklyTrendDto>();

        var query = _db.Internships
            .Where(i => i.LecturerId == lecturerId.Value && !i.IsDeleted)
            .Include(i => i.WeeklyReports)
            .Include(i => i.Semester)
            .AsQueryable();

        if (semesterId.HasValue)
            query = query.Where(i => i.SemesterId == semesterId.Value);
        var internships = await query.ToListAsync();
        var totalStudents = internships.Count;
        var totalWeeks = internships
            .Select(i => i.Semester?.TotalWeeks ?? 0)
            .Where(weeks => weeks > 0)
            .DefaultIfEmpty(6)
            .Max();

        // Group weekly reports by week number
        var allReports = internships.SelectMany(i => i.WeeklyReports.Where(wr => !wr.IsDeleted)).ToList();
        var trend = new List<WeeklyTrendDto>();
        for (var week = 1; week <= totalWeeks; week++)
        {
            var weekReports = allReports.Where(r => r.WeekNumber == week).ToList();
            var onTime = weekReports.Count(r => r.Status == WeeklyReportStatus.Approved || r.Status == WeeklyReportStatus.Submitted);
            var late = weekReports.Count(r => r.Status == WeeklyReportStatus.RevisionRequested);
            var missing = totalStudents - weekReports.Count;

            trend.Add(new WeeklyTrendDto
            {
                WeekNumber = week,
                Label = $"Tuần {week}",
                OnTimeCount = onTime,
                LateCount = late,
                MissingCount = Math.Max(0, missing),
                TotalStudents = totalStudents,
                ComplianceRate = totalStudents > 0 ? Math.Round((decimal)onTime / totalStudents * 100, 1) : 0
            });
        }

        return trend;
    }

    public async Task<GradeDistributionDto> GetGradeDistributionAsync(Guid userId, Guid? semesterId = null)
    {
        var lecturerId = await ResolveLecturerIdAsync(userId);
        if (lecturerId == null)
            return new GradeDistributionDto();

        var query = _db.Internships
            .Where(i => i.LecturerId == lecturerId.Value && !i.IsDeleted)
            .AsQueryable();

        if (semesterId.HasValue)
            query = query.Where(i => i.SemesterId == semesterId.Value);

        var internshipIds = await query.Select(i => i.Id).ToListAsync();

        var evaluations = await _db.Evaluations
            .Where(e => !e.IsDeleted && internshipIds.Contains(e.InternshipId))
            .ToListAsync();

        var finalized = evaluations.Where(e => e.IsFinalized).ToList();
        var total = internshipIds.Count;

        return new GradeDistributionDto
        {
            TotalStudents = total,
            ExcellentCount = finalized.Count(e => e.FinalGrade >= 9),
            GoodCount = finalized.Count(e => e.FinalGrade >= 8 && e.FinalGrade < 9),
            FairCount = finalized.Count(e => e.FinalGrade >= 7 && e.FinalGrade < 8),
            AverageCount = finalized.Count(e => e.FinalGrade >= 5.5m && e.FinalGrade < 7),
            FailCount = finalized.Count(e => e.FinalGrade < 5.5m),
            NotYetGradedCount = total - finalized.Count,
            OverallAverage = finalized.Any() ? Math.Round(finalized.Average(e => e.FinalGrade), 2) : 0
        };
    }

    public async Task<List<CompanyStatsDto>> GetCompanyStatsAsync(Guid userId, Guid? semesterId = null)
    {
        var lecturerId = await ResolveLecturerIdAsync(userId);
        if (lecturerId == null)
            return new List<CompanyStatsDto>();

        var query = _db.Internships
            .Where(i => i.LecturerId == lecturerId.Value && !i.IsDeleted && i.CompanyId != null)
            .Include(i => i.Company)
            .AsQueryable();

        if (semesterId.HasValue)
            query = query.Where(i => i.SemesterId == semesterId.Value);

        var internships = await query.ToListAsync();
        var internshipIds = internships.Select(i => i.Id).ToList();

        // Fetch evaluations separately
        var evaluations = await _db.Evaluations
            .Where(e => !e.IsDeleted && e.IsFinalized && internshipIds.Contains(e.InternshipId))
            .ToListAsync();
        var evalByInternship = evaluations.ToDictionary(e => e.InternshipId);

        return internships
            .GroupBy(i => i.CompanyId!.Value)
            .Select(g =>
            {
                var company = g.First().Company;
                var grades = g.Where(i => evalByInternship.ContainsKey(i.Id))
                    .Select(i => evalByInternship[i.Id].FinalGrade)
                    .ToList();
                var positions = g.Where(i => i.Position != null).Select(i => i.Position!).Distinct().ToList();

                return new CompanyStatsDto
                {
                    CompanyName = company?.CompanyName ?? "Unknown",
                    StudentCount = g.Count(),
                    Positions = positions.Any() ? string.Join(", ", positions) : "—",
                    AverageGrade = grades.Any() ? Math.Round(grades.Average(), 1) : 0,
                    PartnershipLevel = (g.Count() >= 5 && grades.Any() && grades.Average() >= 8.0m)
                        ? "Hợp tác Xuất sắc"
                        : (g.Count() >= 3 && grades.Any() && grades.Average() >= 6.5m)
                            ? "Hợp tác Tốt"
                            : "Hợp tác"
                };
            })
            .OrderByDescending(c => c.StudentCount)
            .ToList();
    }

    public async Task<LecturerActivityStatsDto> GetActivityStatsAsync(Guid userId, Guid? semesterId = null)
    {
        var lecturerId = await ResolveLecturerIdAsync(userId);
        if (lecturerId == null)
            return new LecturerActivityStatsDto();

        var query = _db.Internships
            .Where(i => i.LecturerId == lecturerId.Value && !i.IsDeleted)
            .Include(i => i.WeeklyReports)
            .AsQueryable();

        if (semesterId.HasValue)
            query = query.Where(i => i.SemesterId == semesterId.Value);

        var internships = await query.ToListAsync();
        var totalStudents = internships.Count;

        var allReports = internships.SelectMany(i => i.WeeklyReports.Where(wr => !wr.IsDeleted)).ToList();
        var reviewedReports = allReports.Count(r => r.Status == WeeklyReportStatus.Approved || r.Status == WeeklyReportStatus.RevisionRequested);
        var pendingReports = allReports.Count(r => r.Status == WeeklyReportStatus.Submitted);

        var completedStudents = internships.Count(i => i.Status == Domain.Enums.InternshipStatus.Completed || i.Status == Domain.Enums.InternshipStatus.Graded);
        var overdueReports = allReports.Count(r => r.Status == WeeklyReportStatus.Draft && r.CreatedAt < DateTime.UtcNow.AddDays(-7));

        var totalCompliance = totalStudents > 0 ? Math.Round((decimal)(totalStudents - overdueReports) / totalStudents * 100, 1) : 100;

        // Calculate average response days from actual review timestamps
        var reviewedWithTimestamps = allReports
            .Where(r => (r.Status == WeeklyReportStatus.Approved || r.Status == WeeklyReportStatus.RevisionRequested)
                && r.SubmittedAt.HasValue && r.UpdatedAt.HasValue)
            .Select(r => (r.UpdatedAt!.Value - r.SubmittedAt!.Value).TotalDays)
            .Where(d => d >= 0)
            .ToList();
        var avgResponseDays = reviewedWithTimestamps.Any()
            ? Math.Round((decimal)reviewedWithTimestamps.Average(), 1)
            : 0m;

        return new LecturerActivityStatsDto
        {
            ReviewedReportsCount = reviewedReports,
            PendingReportsCount = pendingReports,
            CompletedStudentsCount = completedStudents,
            TotalStudentsCount = totalStudents,
            AverageResponseDays = avgResponseDays,
            ComplianceRate = totalCompliance
        };
    }

    public async Task<CompanyDetailDto?> GetCompanyDetailAsync(Guid companyId, Guid userId, Guid? semesterId = null)
    {
        var lecturerId = await ResolveLecturerIdAsync(userId);
        if (lecturerId == null)
            return null;

        // Authorize the company from the lecturer's full assignment history,
        // then scope the displayed internships to the selected semester.
        var company = await _db.Internships
            .Where(i => i.LecturerId == lecturerId.Value && !i.IsDeleted && i.CompanyId == companyId)
            .Select(i => i.Company)
            .FirstOrDefaultAsync();

        if (company == null || company.IsDeleted)
            return null;

        var internships = _db.Internships
            .Where(i => i.LecturerId == lecturerId.Value && !i.IsDeleted && i.CompanyId == companyId)
            .AsQueryable();

        if (semesterId.HasValue)
            internships = internships.Where(i => i.SemesterId == semesterId.Value);

        internships = internships
            .Include(i => i.Student)
            .Include(i => i.Company)
            .Include(i => i.Submissions)
            .Include(i => i.WeeklyReports);

        var list = await internships.ToListAsync();

        var positionsQuery = _db.CompanyPositions
            .Where(p => p.CompanyId == companyId && !p.IsDeleted);
        if (semesterId.HasValue)
            positionsQuery = positionsQuery.Where(p => p.SemesterId == null || p.SemesterId == semesterId.Value);

        var positions = await positionsQuery
            .OrderByDescending(p => p.IsOpen)
            .ThenByDescending(p => p.CreatedAt)
            .ToListAsync();
        var filledByTitle = await _db.Internships
            .Where(i => !i.IsDeleted && i.CompanyId == companyId && i.Position != null &&
                (!semesterId.HasValue || i.SemesterId == semesterId.Value))
            .GroupBy(i => i.Position!.Trim().ToLower())
            .Select(g => new { Title = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Title, x => x.Count);

        var internshipIds = list.Select(i => i.Id).ToList();
        var totalSubmissions = list.Sum(i => i.Submissions.Count(s => !s.IsDeleted));
        var totalWeeklyReports = list.Sum(i => i.WeeklyReports.Count(w => !w.IsDeleted));
        var pendingReviews = list.Sum(i => i.Submissions.Count(s => !s.IsDeleted && s.Status == SubmissionStatus.Submitted))
                           + list.Sum(i => i.WeeklyReports.Count(w => !w.IsDeleted && w.Status == WeeklyReportStatus.Submitted));

        var items = list.Select(i => new InternshipListItemDto
        {
            Id = i.Id,
            StudentId = i.StudentId,
            StudentName = i.Student?.FullName ?? string.Empty,
            StudentCode = i.Student?.StudentCode,
            CompanyId = i.CompanyId,
            CompanyName = i.Company?.CompanyName,
            StartDate = i.StartDate,
            EndDate = i.EndDate,
            Status = (i.Status == InternshipStatus.NotStarted &&
                (i.CompanyId.HasValue ||
                 i.Submissions.Any(s => !s.IsDeleted) ||
                 i.WeeklyReports.Any(w => !w.IsDeleted))
                ? InternshipStatus.InProgress
                : i.Status).ToString(),
            Position = i.Position,
            SubmissionCount = i.Submissions?.Count(s => !s.IsDeleted) ?? 0,
            CreatedAt = i.CreatedAt
        }).ToList();

        return new CompanyDetailDto
        {
            Id = company.Id,
            CompanyName = company.CompanyName,
            Industry = company.Industry,
            ContactPerson = company.ContactPerson,
            ContactEmail = company.ContactEmail,
            ContactPhone = company.ContactPhone,
            Address = company.Address,
            AssignedStudentsCount = list.Count,
            TotalSubmissions = totalSubmissions,
            TotalWeeklyReports = totalWeeklyReports,
            PendingReviewsCount = pendingReviews,
            Positions = positions.Select(p => new CompanyPositionDto
            {
                Id = p.Id,
                CompanyId = p.CompanyId,
                CompanyName = company.CompanyName,
                SemesterId = p.SemesterId,
                PositionCode = p.PositionCode,
                Title = p.Title,
                Description = p.Description,
                RequiredMajor = p.RequiredMajor,
                RequiredSkills = p.RequiredSkills,
                Location = p.Location,
                Slots = p.Slots,
                FilledSlots = filledByTitle.GetValueOrDefault(p.Title.Trim().ToLower()),
                Stipend = p.Stipend,
                IsOpen = p.IsOpen,
                CreatedAt = p.CreatedAt,
            }),
            Internships = items
        };
    }

    public async Task<bool> UpdateStudentNotesAsync(Guid userId, Guid internshipId, string notes)
    {
        var lecturerId = await ResolveLecturerIdAsync(userId)
            ?? throw new UnauthorizedAccessException("Lecturer profile not found for current user");

        var internship = await _db.Internships
            .FirstOrDefaultAsync(i => i.Id == internshipId && i.LecturerId == lecturerId && !i.IsDeleted);

        if (internship == null)
            return false;

        internship.Notes = notes;
        internship.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<LecturerSemesterSummaryDto?> GetSemesterSummaryAsync(Guid userId, Guid semesterId)
    {
        var lecturerId = await ResolveLecturerIdAsync(userId);
        if (lecturerId == null) return null;

        return await _db.LecturerSemesterSummaries
            .AsNoTracking()
            .Where(x => x.SemesterId == semesterId && x.LecturerId == lecturerId.Value)
            .Select(x => new LecturerSemesterSummaryDto
            {
                SemesterId = x.SemesterId,
                Results = x.Results,
                Difficulties = x.Difficulties,
                Recommendations = x.Recommendations,
                Conclusion = x.Conclusion,
                UpdatedAt = x.UpdatedAt,
            })
            .FirstOrDefaultAsync();
    }

    public async Task<LecturerSemesterSummaryDto?> SaveSemesterSummaryAsync(Guid userId, Guid semesterId, SaveLecturerSemesterSummaryRequest request)
    {
        var lecturerId = await ResolveLecturerIdAsync(userId);
        if (lecturerId == null || !await _db.Semesters.AnyAsync(x => x.Id == semesterId && !x.IsDeleted)) return null;

        var summary = await _db.LecturerSemesterSummaries
            .FirstOrDefaultAsync(x => x.SemesterId == semesterId && x.LecturerId == lecturerId.Value);
        if (summary == null)
        {
            summary = new LecturerSemesterSummary
            {
                Id = Guid.NewGuid(),
                SemesterId = semesterId,
                LecturerId = lecturerId.Value,
                CreatedAt = DateTime.UtcNow,
            };
            _db.LecturerSemesterSummaries.Add(summary);
        }

        summary.Results = request.Results?.Trim() ?? string.Empty;
        summary.Difficulties = request.Difficulties?.Trim() ?? string.Empty;
        summary.Recommendations = request.Recommendations?.Trim() ?? string.Empty;
        summary.Conclusion = request.Conclusion?.Trim() ?? string.Empty;
        summary.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return new LecturerSemesterSummaryDto
        {
            SemesterId = semesterId,
            Results = summary.Results,
            Difficulties = summary.Difficulties,
            Recommendations = summary.Recommendations,
            Conclusion = summary.Conclusion,
            UpdatedAt = summary.UpdatedAt,
        };
    }

    public async Task<int> NotifyAssignedStudentsAsync(Guid userId, string title, string message)
    {
        var lecturerId = await ResolveLecturerIdAsync(userId)
            ?? throw new UnauthorizedAccessException("Lecturer profile not found for current user");

        var internships = await _db.Internships
            .Where(i => i.LecturerId == lecturerId && !i.IsDeleted)
            .Include(i => i.Student)
            .ToListAsync();

        var notifiedCount = 0;
        foreach (var internship in internships)
        {
            var studentUserId = internship.Student?.UserId;
            if (studentUserId == null) continue;

            await _notificationService.CreateAsync(new CreateNotificationRequest
            {
                UserId = studentUserId.Value,
                Title = title,
                Content = message,
                Link = "/student/dashboard"
            });
            notifiedCount++;
        }

        await _db.SaveChangesAsync();
        return notifiedCount;
    }

    public async Task<bool> RemindStudentAsync(Guid userId, Guid studentOrInternshipId, string? title = null, string? message = null)
    {
        var lecturerId = await ResolveLecturerIdAsync(userId)
            ?? throw new UnauthorizedAccessException("Lecturer profile not found for current user");

        var internship = await _db.Internships
            .Include(i => i.Student)
            .FirstOrDefaultAsync(i => (i.Id == studentOrInternshipId || i.StudentId == studentOrInternshipId)
                                     && i.LecturerId == lecturerId
                                     && !i.IsDeleted);

        if (internship == null)
            return false;

        var studentUserId = internship.Student?.UserId;
        if (studentUserId == null)
            return false;

        var notifTitle = string.IsNullOrWhiteSpace(title)
            ? "Nhắc nhở từ Giảng viên hướng dẫn"
            : title.Trim();

        var notifMessage = string.IsNullOrWhiteSpace(message)
            ? "Giảng viên hướng dẫn yêu cầu bạn kiểm tra tiến độ và hoàn thành các nhiệm vụ, báo cáo thực tập theo đúng hạn quy định."
            : message.Trim();

        await _notificationService.CreateAsync(new CreateNotificationRequest
        {
            UserId = studentUserId.Value,
            Title = notifTitle,
            Content = notifMessage,
            Link = "/student/dashboard"
        });

        await _db.SaveChangesAsync();
        return true;
    }
}



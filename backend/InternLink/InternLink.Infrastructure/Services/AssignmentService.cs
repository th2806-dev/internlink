using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public class AssignmentService : IAssignmentService
{
    /// <summary>
    /// Placeholder company for internships awaiting company assignment by lecturer.
    /// </summary>
    public const string UnassignedCompanyName = "Chưa phân công doanh nghiệp";
    public const string AutoAssignNotePrefix = "Phân công tự động";
    public const int DefaultMaxCapacity = 40;

    /// <summary>
    /// Khoảng cách thời gian tối đa giữa hai bản ghi được coi là CÙNG lô phân công
    /// trong lịch sử (AssignedAt chênh nhau <= ngưỡng này và cùng một GV).
    /// </summary>
    internal static readonly TimeSpan HistoryBatchGapThreshold = TimeSpan.FromMinutes(10);

    private readonly AppDbContext _db;
    private readonly INotificationService _notificationService;

    public AssignmentService(AppDbContext db, INotificationService notificationService)
    {
        _db = db;
        _notificationService = notificationService;
    }

    public async Task<BulkAssignResultDto> BulkAssignAsync(BulkAssignRequest request, Guid? departmentId = null)
    {
        var lecturerExists = await _db.Lecturers.AnyAsync(l => l.Id == request.LecturerId && !l.IsDeleted);
        if (!lecturerExists)
            throw new InvalidOperationException(InternLink.Shared.Responses.ErrorMessage.LecturerNotFound);

        // Department scope: DepartmentAdmin may only assign lecturers of their own department.
        if (departmentId.HasValue)
        {
            var lecturerInDept = await _db.Lecturers
                .AnyAsync(l => l.Id == request.LecturerId && !l.IsDeleted && l.DepartmentId == departmentId.Value);
            if (!lecturerInDept)
                throw new InvalidOperationException("Giảng viên không thuộc khoa của bạn");
        }

        // Validate or fallback semester — fallback ƯU TIÊN kỳ thuộc khoa của admin,
        // rồi đến kỳ dùng chung (DepartmentId = null); tránh gán nhầm SV vào kỳ của khoa khác.
        Guid targetSemesterId;
        if (request.SemesterId.HasValue && request.SemesterId.Value != Guid.Empty)
        {
            var semesterExists = await _db.Semesters.AnyAsync(s => s.Id == request.SemesterId.Value && !s.IsDeleted);
            if (!semesterExists)
                throw new InvalidOperationException(InternLink.Shared.Responses.ErrorMessage.SemesterNotFoundById(request.SemesterId.Value));
            targetSemesterId = request.SemesterId.Value;
        }
        else
        {
            var activeSemesterQuery = _db.Semesters.Where(s => s.Status == SemesterStatus.Active && !s.IsDeleted);
            if (departmentId.HasValue)
                activeSemesterQuery = activeSemesterQuery.Where(s => s.DepartmentId == departmentId.Value || s.DepartmentId == null);
            var activeSemester = await activeSemesterQuery
                .OrderBy(s => s.DepartmentId == null) // ưu tiên kỳ riêng của khoa trước kỳ dùng chung
                .FirstOrDefaultAsync()
                ?? (departmentId.HasValue
                    ? null
                    : await _db.Semesters.FirstOrDefaultAsync(s => !s.IsDeleted));

            if (activeSemester == null)
                throw new InvalidOperationException(departmentId.HasValue
                    ? "Khoa của bạn chưa có học kỳ đang hoạt động. Hãy bắt đầu một học kỳ trước khi phân công."
                    : InternLink.Shared.Responses.ErrorMessage.NoActiveSemester);

            targetSemesterId = activeSemester.Id;
        }

        var targetSemesterIsActive = await _db.Semesters
            .AnyAsync(s => s.Id == targetSemesterId && s.Status == SemesterStatus.Active && !s.IsDeleted);

        var result = new BulkAssignResultDto();
        var errors = new List<AssignmentErrorDto>();

        foreach (var studentId in request.StudentIds.Distinct())
        {
            var student = await _db.Students.FirstOrDefaultAsync(s => s.Id == studentId && !s.IsDeleted);
            if (student == null)
            {
                errors.Add(new AssignmentErrorDto
                {
                    StudentId = studentId,
                    Message = InternLink.Shared.Responses.ErrorMessage.StudentNotFound
                });
                continue;
            }

            // Department scope: skip students outside the admin's department.
            if (departmentId.HasValue && student.DepartmentId != departmentId.Value)
            {
                errors.Add(new AssignmentErrorDto
                {
                    StudentId = studentId,
                    Message = "Sinh viên không thuộc khoa của bạn"
                });
                continue;
            }

            // Check for internship in specific semester
            var internship = await _db.Internships
                .FirstOrDefaultAsync(i => 
                    i.StudentId == studentId && 
                    i.SemesterId == targetSemesterId && 
                    !i.IsDeleted);

            if (internship == null)
            {
                internship = new Internship
                {
                    Id = Guid.NewGuid(),
                    StudentId = studentId,
                    SemesterId = targetSemesterId,
                    CompanyId = null,
                    LecturerId = request.LecturerId,
                    AssignedAt = DateTime.UtcNow,
                    Status = targetSemesterIsActive ? InternshipStatus.InProgress : InternshipStatus.NotStarted,
                    Notes = request.Note ?? "Phân công giảng viên — chờ gán doanh nghiệp",
                    CreatedAt = DateTime.UtcNow
                };
                await _db.Internships.AddAsync(internship);
                result.CreatedCount++;
            }
            else
            {
                // Đổi GV (hoặc gán lần đầu) → ghi nhận thời điểm phân công mới.
                if (internship.LecturerId != request.LecturerId)
                    internship.AssignedAt = DateTime.UtcNow;
                internship.LecturerId = request.LecturerId;
                if (!string.IsNullOrWhiteSpace(request.Note))
                    internship.Notes = request.Note;
                internship.UpdatedAt = DateTime.UtcNow;
                result.UpdatedCount++;
            }

            result.AssignedCount++;
        }

        if (result.AssignedCount > 0)
            await _db.SaveChangesAsync();

        // Send notifications to lecturer and students
        if (result.AssignedCount > 0)
        {
            var lecturer = await _db.Lecturers.FirstOrDefaultAsync(l => l.Id == request.LecturerId && !l.IsDeleted);
            var lecturerName = lecturer?.FullName ?? "Giảng viên";

            // Notify the lecturer
            if (lecturer?.UserId != null)
            {
                await _notificationService.CreateAsync(new CreateNotificationRequest
                {
                    UserId = lecturer.UserId!.Value,
                    Title = $"Phân công hướng dẫn: {result.AssignedCount} sinh viên mới",
                    Content = $"Ban quản lý đã phân công {result.AssignedCount} sinh viên cho Thầy/Cô hướng dẫn thực tập.",
                    Link = "/lecturer-students"
                });
            }

            // Notify each assigned student
            var assignedStudentIds = request.StudentIds.Distinct().ToList();
            var assignedStudents = await _db.Students
                .Where(s => assignedStudentIds.Contains(s.Id) && !s.IsDeleted && s.UserId != null)
                .ToListAsync();

            foreach (var student in assignedStudents)
            {
                await _notificationService.CreateAsync(new CreateNotificationRequest
                {
                    UserId = student.UserId!.Value,
                    Title = $"Bạn đã được phân công giảng viên hướng dẫn: {lecturerName}",
                    Content = $"Giảng viên {lecturerName} đã được chỉ định hướng dẫn thực tập cho bạn. Hãy liên hệ để nhận hướng dẫn.",
                    Link = "/student-dashboard"
                });
            }
        }

        result.FailedCount = errors.Count;
        result.Errors = errors;
        return result;
    }

    public async Task<IReadOnlyList<LecturerAssignmentItemDto>> GetByLecturerAsync(Guid lecturerId, Guid? semesterId = null, Guid? departmentId = null)
    {
        var lecturerExists = await _db.Lecturers.AnyAsync(l => l.Id == lecturerId && !l.IsDeleted);
        if (!lecturerExists)
            throw new InvalidOperationException(InternLink.Shared.Responses.ErrorMessage.LecturerNotFound);

        // DepartmentAdmin may only view assignments of lecturers in their own department.
        if (departmentId.HasValue)
        {
            var lecturerInDept = await _db.Lecturers
                .AnyAsync(l => l.Id == lecturerId && !l.IsDeleted && l.DepartmentId == departmentId.Value);
            if (!lecturerInDept)
                throw new InvalidOperationException("Giảng viên không thuộc khoa của bạn");
        }

        var query = _db.Internships
            .Where(i => !i.IsDeleted && i.LecturerId == lecturerId);

        if (semesterId.HasValue && semesterId.Value != Guid.Empty)
        {
            query = query.Where(i => i.SemesterId == semesterId.Value);
        }

        var internships = await query
            .Include(i => i.Student)
            .Include(i => i.Company)
            .OrderBy(i => i.Student!.FullName)
            .ToListAsync();

        return internships.Select(MapAssignmentItem).ToList();
    }

    public async Task<IReadOnlyList<LecturerAssignmentItemDto>> GetAllAssignmentsAsync(Guid? semesterId = null, Guid? departmentId = null)
    {
        var query = _db.Internships
            .AsNoTracking()
            .Where(i => !i.IsDeleted && i.LecturerId != null);

        if (departmentId.HasValue)
        {
            query = query.Where(i => i.Student != null && i.Student.DepartmentId == departmentId.Value);
        }

        if (semesterId.HasValue && semesterId.Value != Guid.Empty)
        {
            query = query.Where(i => i.SemesterId == semesterId.Value);
        }

        var internships = await query
            .Include(i => i.Student)
            .Include(i => i.Company)
            .Include(i => i.Lecturer)
            .OrderBy(i => i.Student!.FullName)
            .ToListAsync();

        return internships.Select(MapAssignmentItem).ToList();
    }

    public async Task<bool> UnassignAsync(UnassignRequest request, Guid? departmentId = null)
    {
        var query = _db.Internships
            .Where(i =>
                !i.IsDeleted &&
                i.LecturerId == request.LecturerId &&
                i.StudentId == request.StudentId);

        if (request.SemesterId.HasValue && request.SemesterId.Value != Guid.Empty)
        {
            query = query.Where(i => i.SemesterId == request.SemesterId.Value);
        }

        // Department scope: DepartmentAdmin cannot unassign pairs outside their department.
        if (departmentId.HasValue)
        {
            query = query.Where(i =>
                (i.Student != null && i.Student.DepartmentId == departmentId.Value) ||
                (i.Lecturer != null && i.Lecturer.DepartmentId == departmentId.Value));
        }

        var internship = await query
            .FirstOrDefaultAsync();

        if (internship == null)
            return false;

        internship.LecturerId = null;
        internship.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<IReadOnlyList<AssignmentHistoryItemDto>> GetHistoryAsync(int limit = 50, Guid? semesterId = null, Guid? departmentId = null)
    {
        IQueryable<Internship> query = _db.Internships
            .AsNoTracking()
            .Where(i => !i.IsDeleted && i.LecturerId != null)
            .Include(i => i.Lecturer)
            .Include(i => i.Student);

        if (semesterId.HasValue && semesterId.Value != Guid.Empty)
        {
            query = query.Where(i => i.SemesterId == semesterId.Value);
        }

        if (departmentId.HasValue)
        {
            query = query.Where(i => i.Student != null && i.Student.DepartmentId == departmentId.Value);
        }

        var internships = await query
            .OrderByDescending(i => i.AssignedAt ?? i.CreatedAt)
            .Take(Math.Min(limit * 20, 1000))
            .ToListAsync();

        // Chia nhóm theo LÔ PHÂN CÔNG (đề xuất P1/P2 — thay bucket theo phút dễ tách nhóm sai):
        // một lô = các bản ghi của CÙNG giảng viên, cách nhau không quá BatchGapThreshold.
        // Quét tuần tự theo thời gian giảm dần: cùng GV và cách mốc đầu lô <= 10 phút → chung lô;
        // khác GV hoặc quá 10 phút → mở lô mới. Tránh trường hợp bulk assign kéo dài vài phút
        // bị cắt thành nhiều dòng lịch sử chỉ vì lệch giây/phút.
        var items = internships
            .Select(i => new { Item = i, LecturerId = i.LecturerId, Assigned = i.AssignedAt ?? i.CreatedAt })
            .OrderByDescending(x => x.Assigned)
            .ToList();

        var batches = new List<List<(Domain.Entities.Internship Item, DateTime Assigned)>>();
        var current = new List<(Domain.Entities.Internship Item, DateTime Assigned)>();
        Guid? currentLecturerId = null;
        DateTime batchStart = default;

        foreach (var x in items)
        {
            var sameBatch = current.Count > 0
                && currentLecturerId == x.LecturerId
                && batchStart - x.Assigned <= HistoryBatchGapThreshold;

            if (!sameBatch)
            {
                if (current.Count > 0)
                    batches.Add(current);
                current = new List<(Domain.Entities.Internship, DateTime)>();
                currentLecturerId = x.LecturerId;
                batchStart = x.Assigned;
            }

            current.Add((x.Item, x.Assigned));
        }
        if (current.Count > 0)
            batches.Add(current);

        return batches
            .Take(limit)
            .Select(batch =>
            {
                var first = batch[0].Item;
                var batchStart2 = batch.Max(x => x.Assigned);
                var isAuto = batch.Any(x =>
                    x.Item.Notes != null &&
                    x.Item.Notes.Contains(AutoAssignNotePrefix, StringComparison.Ordinal));
                return new AssignmentHistoryItemDto
                {
                    Id = $"{first.LecturerId}-{batchStart2:yyyy-MM-dd HH:mm}",
                    LecturerName = first.Lecturer?.FullName,
                    StudentCount = batch.Count,
                    Timestamp = batchStart2,
                    ClassGroups = batch
                        .Select(x => x.Item.Student?.Class)
                        .Where(c => !string.IsNullOrWhiteSpace(c))
                        .Distinct()
                        .Cast<string>()
                        .ToList(),
                    AssignedBy = isAuto ? "Hệ thống Smart Balance" : "Ban quản lý thực tập",
                };
            })
            .ToList();
    }

    public async Task<byte[]> ExportExcelAsync(Guid? semesterId = null, Guid? departmentId = null)
    {
        var studentsQuery = _db.Students
            .AsNoTracking()
            .Where(s => !s.IsDeleted);

        if (departmentId.HasValue)
        {
            studentsQuery = studentsQuery.Where(s => s.DepartmentId == departmentId.Value);
        }

        var students = await studentsQuery
            .OrderBy(s => s.StudentCode)
            .ToListAsync();

        var query = _db.Internships
            .AsNoTracking()
            .Where(i => !i.IsDeleted && i.LecturerId != null);

        if (semesterId.HasValue && semesterId.Value != Guid.Empty)
        {
            query = query.Where(i => i.SemesterId == semesterId.Value);
        }

        var internships = await query
            .Include(i => i.Lecturer)
            .Include(i => i.Company)
            .ToListAsync();

        var byStudent = internships.ToDictionary(i => i.StudentId);

        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("PhanCong");

        sheet.Cell(1, 1).Value = "InternLink - Báo cáo phân công hướng dẫn thực tập";
        sheet.Cell(2, 1).Value = "Ngày xuất:";
        sheet.Cell(2, 2).Value = DateTime.UtcNow.ToString("dd/MM/yyyy HH:mm") + " UTC";

        var headerRow = 4;
        var headers = new[]
        {
            "MSSV", "Họ tên", "Lớp", "Ngành", "Giảng viên", "MSGV",
            "Doanh nghiệp", "Ngày phân công", "Trạng thái"
        };
        for (var col = 0; col < headers.Length; col++)
            sheet.Cell(headerRow, col + 1).Value = headers[col];

        var row = headerRow + 1;
        foreach (var student in students)
        {
            byStudent.TryGetValue(student.Id, out var internship);
            sheet.Cell(row, 1).Value = student.StudentCode;
            sheet.Cell(row, 2).Value = student.FullName;
            sheet.Cell(row, 3).Value = student.Class ?? "";
            sheet.Cell(row, 4).Value = student.Major ?? "";
            sheet.Cell(row, 5).Value = internship?.Lecturer?.FullName ?? "";
            sheet.Cell(row, 6).Value = internship?.Lecturer?.StaffCode ?? "";
            sheet.Cell(row, 7).Value =
                internship?.Company?.CompanyName == UnassignedCompanyName
                    ? "Chưa có DN"
                    : internship?.Company?.CompanyName ?? "";
            // "Ngày phân công" = AssignedAt (đề xuất P2) — UpdatedAt đổi khi sửa bất kỳ trường nào.
            sheet.Cell(row, 8).Value = internship == null
                ? ""
                : (internship.AssignedAt ?? internship.CreatedAt).ToString("dd/MM/yyyy");
            sheet.Cell(row, 9).Value = internship == null
                ? "Chưa phân công"
                : internship.Status.ToString();
            row++;
        }

        sheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    public async Task<AutoAssignResultDto> AutoAssignAsync(AutoAssignRequest request, Guid? departmentId = null)
    {
        var strategy = (request.Strategy ?? "even").Trim().ToLowerInvariant();
        if (strategy is not ("department" or "even" or "random"))
            throw new InvalidOperationException("Strategy must be 'department', 'even', or 'random'");

        var lecturersQuery = _db.Lecturers
            .AsNoTracking()
            .Where(l => !l.IsDeleted);

        if (departmentId.HasValue)
        {
            lecturersQuery = lecturersQuery.Where(l => l.DepartmentId == departmentId.Value);
        }

        var lecturers = await lecturersQuery
            .OrderBy(l => l.FullName)
            .ToListAsync();

        if (lecturers.Count == 0)
            return new AutoAssignResultDto();

        var studentsQuery = _db.Students
            .AsNoTracking()
            .Where(s => !s.IsDeleted);

        if (departmentId.HasValue)
        {
            studentsQuery = studentsQuery.Where(s => s.DepartmentId == departmentId.Value);
        }

        var internshipsQuery = _db.Internships
            .Where(i => !i.IsDeleted);

        if (request.SemesterId.HasValue && request.SemesterId.Value != Guid.Empty)
        {
            internshipsQuery = internshipsQuery.Where(i => i.SemesterId == request.SemesterId.Value);
            studentsQuery = studentsQuery.Where(s => s.Internships.Any(i => !i.IsDeleted && i.SemesterId == request.SemesterId.Value));
        }

        var students = await studentsQuery
            .OrderBy(s => s.StudentCode)
            .ToListAsync();

        var internships = await internshipsQuery.ToListAsync();

        var assignedStudentIds = internships
            .Where(i => i.LecturerId != null)
            .Select(i => i.StudentId)
            .ToHashSet();

        var lecturerCounts = internships
            .Where(i => i.LecturerId != null)
            .GroupBy(i => i.LecturerId!.Value)
            .ToDictionary(g => g.Key, g => g.Count());

        var unassigned = students.Where(s => !assignedStudentIds.Contains(s.Id)).ToList();
        if (unassigned.Count == 0)
            return new AutoAssignResultDto();

        // Fallback ƯU TIÊN kỳ thuộc khoa của admin, rồi đến kỳ dùng chung (DepartmentId = null).
        var activeSemesterQuery = _db.Semesters.AsNoTracking().Where(s => !s.IsDeleted);
        if (request.SemesterId.HasValue && request.SemesterId.Value != Guid.Empty)
        {
            activeSemesterQuery = activeSemesterQuery.Where(s => s.Id == request.SemesterId.Value);
        }
        else
        {
            activeSemesterQuery = activeSemesterQuery.Where(s => s.Status == SemesterStatus.Active);
            if (departmentId.HasValue)
                activeSemesterQuery = activeSemesterQuery.Where(s => s.DepartmentId == departmentId.Value || s.DepartmentId == null);
        }
        var activeSemester = await activeSemesterQuery
            .OrderBy(s => s.DepartmentId == null) // ưu tiên kỳ riêng của khoa trước kỳ dùng chung
            .FirstOrDefaultAsync()
            ?? (request.SemesterId.HasValue
                ? null
                : departmentId.HasValue
                    ? null
                    : await _db.Semesters.FirstOrDefaultAsync(s => !s.IsDeleted));

        if (activeSemester == null)
            throw new InvalidOperationException(departmentId.HasValue
                ? "Khoa của bạn chưa có học kỳ đang hoạt động. Hãy bắt đầu một học kỳ trước khi phân công tự động."
                : "No active semester found for auto assignment");

        // Sức chứa tối đa mỗi GV theo cấu hình của kỳ (fallback 40 nếu cấu hình <= 0).
        var maxPerLecturer = activeSemester.MaxStudentsPerLecturer > 0
            ? activeSemester.MaxStudentsPerLecturer
            : DefaultMaxCapacity;

        var batches = new Dictionary<Guid, List<Guid>>();
        var note = strategy == "department"
            ? $"{AutoAssignNotePrefix} — ghép theo bộ môn"
            : strategy == "random"
                ? $"{AutoAssignNotePrefix} — ngẫu nhiên"
                : $"{AutoAssignNotePrefix} — chia đều";

        var randomLecturers = strategy == "random"
            ? lecturers.OrderBy(_ => Random.Shared.Next()).ToList()
            : lecturers;

        foreach (var student in unassigned)
        {
            var lecturerId = strategy == "department"
                ? PickLecturerByDepartment(student, lecturers, lecturerCounts, maxPerLecturer)
                : strategy == "random"
                    ? PickLecturerRandom(randomLecturers, lecturerCounts, maxPerLecturer)
                    : null;
            lecturerId ??= PickLecturerEven(lecturers, lecturerCounts, maxPerLecturer);
            if (lecturerId == null)
                break;

            if (!batches.TryGetValue(lecturerId.Value, out var list))
            {
                list = new List<Guid>();
                batches[lecturerId.Value] = list;
            }

            list.Add(student.Id);
            lecturerCounts[lecturerId.Value] = lecturerCounts.GetValueOrDefault(lecturerId.Value) + 1;
        }

        var result = new AutoAssignResultDto { LecturersUsed = batches.Count };
        foreach (var (lecturerId, studentIds) in batches)
        {
            var bulk = await BulkAssignAsync(new BulkAssignRequest
            {
                LecturerId = lecturerId,
                SemesterId = activeSemester.Id,
                StudentIds = studentIds,
                Note = note,
            }, departmentId);
            result.TotalAssigned += bulk.AssignedCount;
            result.TotalFailed += bulk.FailedCount;
        }

        return result;
    }

    private static Guid? PickLecturerEven(
        IReadOnlyList<Lecturer> lecturers,
        Dictionary<Guid, int> lecturerCounts,
        int maxPerLecturer)
    {
        return lecturers
            .Select(l => new { l.Id, Count = lecturerCounts.GetValueOrDefault(l.Id) })
            .Where(x => x.Count < maxPerLecturer)
            .OrderBy(x => x.Count)
            .ThenBy(x => x.Id)
            .Select(x => (Guid?)x.Id)
            .FirstOrDefault();
    }

    private static Guid? PickLecturerRandom(
        IReadOnlyList<Lecturer> lecturers,
        Dictionary<Guid, int> lecturerCounts,
        int maxPerLecturer)
    {
        var available = lecturers
            .Where(l => lecturerCounts.GetValueOrDefault(l.Id) < maxPerLecturer)
            .ToList();
        return available.Count == 0 ? null : available[Random.Shared.Next(available.Count)].Id;
    }

    private static Guid? PickLecturerByDepartment(
        Student student,
        IReadOnlyList<Lecturer> lecturers,
        Dictionary<Guid, int> lecturerCounts,
        int maxPerLecturer)
    {
        var major = student.Major?.Trim();
        if (string.IsNullOrWhiteSpace(major))
            return null;

        var match = lecturers
            .Where(l =>
            {
                var dept = l.Department?.Trim();
                if (string.IsNullOrWhiteSpace(dept))
                    return false;
                return major.Contains(dept, StringComparison.OrdinalIgnoreCase)
                    || dept.Contains(major, StringComparison.OrdinalIgnoreCase);
            })
            .Select(l => new { l.Id, Count = lecturerCounts.GetValueOrDefault(l.Id) })
            .Where(x => x.Count < maxPerLecturer)
            .OrderBy(x => x.Count)
            .Select(x => (Guid?)x.Id)
            .FirstOrDefault();

        return match;
    }

    private async Task<Company> EnsureUnassignedCompanyAsync()
    {
        var company = await _db.Companies
            .FirstOrDefaultAsync(c => c.CompanyName == UnassignedCompanyName && !c.IsDeleted);

        if (company != null)
            return company;

        company = new Company
        {
            Id = Guid.NewGuid(),
            CompanyName = UnassignedCompanyName,
            Industry = "Hệ thống",
            ContactPerson = "Ban Quản lý Thực tập",
            IsActive = false,
            CreatedAt = DateTime.UtcNow
        };

        await _db.Companies.AddAsync(company);
        await _db.SaveChangesAsync();
        return company;
    }

    private static LecturerAssignmentItemDto MapAssignmentItem(Internship internship)
    {
        var companyAssigned = internship.Company != null && internship.Company.CompanyName != UnassignedCompanyName;

        return new LecturerAssignmentItemDto
        {
            InternshipId = internship.Id,
            LecturerId = internship.LecturerId,
            LecturerName = internship.Lecturer?.FullName ?? string.Empty,
            StudentId = internship.StudentId,
            StudentCode = internship.Student?.StudentCode ?? string.Empty,
            StudentName = internship.Student?.FullName ?? string.Empty,
            Class = internship.Student?.Class,
            Major = internship.Student?.Major,
            Status = internship.Status.ToString(),
            CompanyId = internship.CompanyId,
            CompanyName = internship.Company?.CompanyName,
            CompanyAssigned = companyAssigned,
            StartDate = internship.StartDate,
            EndDate = internship.EndDate,
            CreatedAt = internship.CreatedAt
        };
    }

    public byte[] GetCompanyAllocationImportTemplate()
    {
        return TemplateHelper.GetTemplateBytes("Mau-danh-sach-SV-thuc-tap-taiDN.xlsx", () =>
        {
            using var workbook = new XLWorkbook();
            var sheet = workbook.Worksheets.Add("PhanBoDoanhNghiep");

            sheet.Cell(1, 1).Value = "STT";
            sheet.Cell(1, 2).Value = "MSSV";
            sheet.Cell(1, 3).Value = "HỌ TÊN";
            sheet.Cell(1, 4).Value = "LỚP";
            sheet.Cell(1, 5).Value = "MÃ DOANH NGHIỆP";
            sheet.Cell(1, 6).Value = "CÔNG TY THỰC TẬP";
            sheet.Cell(1, 7).Value = "MÃ VỊ TRÍ";
            sheet.Cell(1, 8).Value = "VỊ TRÍ THỰC TẬP";

            sheet.Cell(2, 1).Value = 1;
            sheet.Cell(2, 2).Value = "2421160001";
            sheet.Cell(2, 3).Value = "Phạm Thị Hồng Anh";
            sheet.Cell(2, 4).Value = "C23A.TH1";
            sheet.Cell(2, 5).Value = "DN_FPT";
            sheet.Cell(2, 6).Value = "Công ty TNHH FPT Software";
            sheet.Cell(2, 7).Value = "VT_FPT_01";
            sheet.Cell(2, 8).Value = "Backend Developer";

            sheet.Cell(3, 1).Value = 2;
            sheet.Cell(3, 2).Value = "2421160002";
            sheet.Cell(3, 3).Value = "Trần Văn Bảo";
            sheet.Cell(3, 4).Value = "C23A.TH1";
            sheet.Cell(3, 5).Value = "DN_FPT";
            sheet.Cell(3, 6).Value = "Công ty TNHH FPT Software";
            sheet.Cell(3, 7).Value = "VT_FPT_02";
            sheet.Cell(3, 8).Value = "Frontend Developer";

            sheet.Cell(4, 1).Value = 3;
            sheet.Cell(4, 2).Value = "2421160003";
            sheet.Cell(4, 3).Value = "Lê Hoàng Cường";
            sheet.Cell(4, 4).Value = "C23A.TH1";
            sheet.Cell(4, 5).Value = "DN_TMA";
            sheet.Cell(4, 6).Value = "Tập đoàn Công nghệ TMA";
            sheet.Cell(4, 7).Value = "VT_TMA_01";
            sheet.Cell(4, 8).Value = "Fullstack Developer";

            sheet.Cell(5, 1).Value = 4;
            sheet.Cell(5, 2).Value = "2421160004";
            sheet.Cell(5, 3).Value = "Nguyễn Thị Dung";
            sheet.Cell(5, 4).Value = "C23A.TH1";
            sheet.Cell(5, 5).Value = "DN_VNG";
            sheet.Cell(5, 6).Value = "Công ty Cổ phần VNG";
            sheet.Cell(5, 7).Value = "VT_VNG_01";
            sheet.Cell(5, 8).Value = "Data Analyst";

            sheet.Row(1).Style.Font.Bold = true;
            sheet.Row(1).Style.Fill.BackgroundColor = XLColor.FromHtml("#E8F0FE");
            sheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        });
    }

    public async Task<CompanyAllocationImportResultDto> ImportCompanyAllocationsFromExcelAsync(Stream excelStream, Guid? semesterId = null, Guid? departmentId = null)
    {
        if (excelStream == null || !excelStream.CanRead)
            throw new ArgumentException("Excel file stream is required");

        using var workbook = new XLWorkbook(excelStream);
        var worksheet = workbook.Worksheets.FirstOrDefault()
            ?? throw new InvalidOperationException("File Excel không có sheet dữ liệu");

        var usedRange = worksheet.RangeUsed()
            ?? throw new InvalidOperationException("File Excel rỗng");

        var headerRow = TemplateHelper.FindHeaderRow(worksheet, row =>
        {
            var map = BuildCompanyAllocationColumnMap(row);
            return map.ContainsKey(CompanyAllocCol.CompanyName) &&
                   (map.ContainsKey(CompanyAllocCol.FullName) || map.ContainsKey(CompanyAllocCol.StudentCode) || map.ContainsKey(CompanyAllocCol.Ten) || map.ContainsKey(CompanyAllocCol.Ho));
        }) ?? usedRange.FirstRow();

        var colMap = BuildCompanyAllocationColumnMap(headerRow);
        var hasValidStudentIdentifier = colMap.ContainsKey(CompanyAllocCol.FullName) || colMap.ContainsKey(CompanyAllocCol.StudentCode) || colMap.ContainsKey(CompanyAllocCol.Ten);

        if (!colMap.ContainsKey(CompanyAllocCol.CompanyName) || !hasValidStudentIdentifier)
        {
            throw new InvalidOperationException("File Excel cần có cột [Họ Tên / MSSV] và cột [Công Ty Thực Tập]");
        }

        var targetSemesterId = await ResolveTargetSemesterIdAsync(semesterId, departmentId);
        var targetSemesterIsActive = await _db.Semesters
            .AnyAsync(s => s.Id == targetSemesterId && s.Status == SemesterStatus.Active && !s.IsDeleted);

        var studentsQuery = _db.Students.Where(s => !s.IsDeleted);
        if (departmentId.HasValue)
            studentsQuery = studentsQuery.Where(s => s.DepartmentId == departmentId.Value);
        var allStudents = await studentsQuery.ToListAsync();
        var allCompanies = await _db.Companies.Where(c => !c.IsDeleted).ToListAsync();
        var companyIds = allCompanies.Select(c => c.Id).ToList();
        var allCompanyPositions = (await _db.CompanyPositions
            .Where(p => !p.IsDeleted && companyIds.Contains(p.CompanyId))
            .ToListAsync())
            .GroupBy(p => p.CompanyId)
            .ToDictionary(g => g.Key, g => g.ToList());
        var existingInternships = await _db.Internships
            .Where(i => i.SemesterId == targetSemesterId && !i.IsDeleted)
            .Include(i => i.Company)
            .Include(i => i.Lecturer)
            .Include(i => i.Student)
            .ToListAsync();

        var result = new CompanyAllocationImportResultDto();

        foreach (var row in usedRange.RowsUsed())
        {
            if (row.RowNumber() <= headerRow.RowNumber())
                continue;

            var rowNum = row.RowNumber();
            var studentCode = GetCellText(row, colMap, CompanyAllocCol.StudentCode);
            var hoTen = GetCellText(row, colMap, CompanyAllocCol.FullName);
            var ho = GetCellText(row, colMap, CompanyAllocCol.Ho);
            var ten = GetCellText(row, colMap, CompanyAllocCol.Ten);
            var fullName = TemplateHelper.CombineFullName(ho, ten, hoTen);
            var className = GetCellText(row, colMap, CompanyAllocCol.Class);
            var companyName = GetCellText(row, colMap, CompanyAllocCol.CompanyName);
            var companyCode = GetCellText(row, colMap, CompanyAllocCol.CompanyCode);
            var positionCode = GetCellText(row, colMap, CompanyAllocCol.PositionCode);
            var positionTitle = GetCellText(row, colMap, CompanyAllocCol.PositionTitle);

            if (string.IsNullOrWhiteSpace(studentCode) && string.IsNullOrWhiteSpace(fullName) && string.IsNullOrWhiteSpace(companyName) && string.IsNullOrWhiteSpace(companyCode))
                continue;

            result.TotalRows++;

            if (string.IsNullOrWhiteSpace(companyName))
            {
                result.FailedCount++;
                result.Errors.Add(new CompanyAllocationImportErrorDto
                {
                    RowNumber = rowNum,
                    StudentCode = studentCode,
                    StudentName = fullName,
                    ClassName = className,
                    Message = "Dòng thiếu tên công ty thực tập"
                });
                continue;
            }

            if (string.IsNullOrWhiteSpace(studentCode) && string.IsNullOrWhiteSpace(fullName))
            {
                result.FailedCount++;
                result.Errors.Add(new CompanyAllocationImportErrorDto
                {
                    RowNumber = rowNum,
                    CompanyName = companyName,
                    Message = "Dòng thiếu cả Họ tên và Mã số sinh viên"
                });
                continue;
            }

            // 1. Resolve Company — prefer the exact business key (Mã DN) when provided,
            // falling back to normalized name so legacy files keep working.
            Company? matchedCompany = null;
            if (!string.IsNullOrWhiteSpace(companyCode))
            {
                matchedCompany = allCompanies.FirstOrDefault(c =>
                    c.CompanyCode != null &&
                    c.CompanyCode.Equals(companyCode.Trim(), StringComparison.OrdinalIgnoreCase));
            }

            if (matchedCompany == null)
            {
                var normCompany = NormalizeText(companyName);
                matchedCompany = allCompanies.FirstOrDefault(c =>
                    c.CompanyName.Equals(companyName.Trim(), StringComparison.OrdinalIgnoreCase) ||
                    NormalizeText(c.CompanyName) == normCompany ||
                    NormalizeText(c.CompanyName).Contains(normCompany) ||
                    normCompany.Contains(NormalizeText(c.CompanyName)));
            }

            if (matchedCompany == null)
            {
                result.FailedCount++;
                result.Errors.Add(new CompanyAllocationImportErrorDto
                {
                    RowNumber = rowNum,
                    StudentCode = studentCode,
                    StudentName = fullName,
                    ClassName = className,
                    CompanyName = companyName,
                    Message = $"Không tìm thấy doanh nghiệp '{companyName}' trong danh mục đối tác"
                });
                continue;
            }

            // 2. Resolve Student
            Student? matchedStudent = null;
            if (!string.IsNullOrWhiteSpace(studentCode))
            {
                matchedStudent = allStudents.FirstOrDefault(s =>
                    s.StudentCode.Equals(studentCode.Trim(), StringComparison.OrdinalIgnoreCase));
            }

            if (matchedStudent == null && !string.IsNullOrWhiteSpace(fullName))
            {
                var normName = NormalizeText(fullName);
                var normClass = NormalizeText(className);

                var candidates = allStudents.Where(s => NormalizeText(s.FullName) == normName).ToList();
                if (candidates.Count > 1 && !string.IsNullOrWhiteSpace(normClass))
                {
                    candidates = candidates.Where(s => NormalizeText(s.Class) == normClass).ToList();
                }

                if (candidates.Count == 1)
                {
                    matchedStudent = candidates[0];
                }
                else if (candidates.Count > 1)
                {
                    result.FailedCount++;
                    result.Errors.Add(new CompanyAllocationImportErrorDto
                    {
                        RowNumber = rowNum,
                        StudentCode = studentCode,
                        StudentName = fullName,
                        ClassName = className,
                        CompanyName = companyName,
                        Message = $"Tìm thấy nhiều hơn 1 sinh viên có tên '{fullName}', vui lòng cung cấp thêm MSSV"
                    });
                    continue;
                }
            }

            if (matchedStudent == null)
            {
                result.FailedCount++;
                result.Errors.Add(new CompanyAllocationImportErrorDto
                {
                    RowNumber = rowNum,
                    StudentCode = studentCode,
                    StudentName = fullName,
                    ClassName = className,
                    CompanyName = companyName,
                    Message = $"Không tìm thấy sinh viên '{fullName ?? studentCode}' (Lớp: {className ?? "-"}) trong hệ thống"
                });
                continue;
            }

            // 3. Resolve recruitment position (optional column): by Mã Vị Trí first, then title.
            CompanyPosition? matchedPosition = null;
            if (!string.IsNullOrWhiteSpace(positionCode) || !string.IsNullOrWhiteSpace(positionTitle))
            {
                var companyPositions = allCompanyPositions.GetValueOrDefault(matchedCompany.Id)
                    ?? new List<CompanyPosition>();

                if (!string.IsNullOrWhiteSpace(positionCode))
                {
                    matchedPosition = companyPositions.FirstOrDefault(p =>
                        p.PositionCode != null &&
                        p.PositionCode.Equals(positionCode.Trim(), StringComparison.OrdinalIgnoreCase));
                }

                if (matchedPosition == null && !string.IsNullOrWhiteSpace(positionTitle))
                {
                    var normPos = NormalizeText(positionTitle);
                    matchedPosition = companyPositions.FirstOrDefault(p =>
                        NormalizeText(p.Title) == normPos ||
                        NormalizeText(p.Title).Contains(normPos) ||
                        normPos.Contains(NormalizeText(p.Title)));
                }

                if (matchedPosition == null)
                {
                    // Position columns present but no match in the company's roster — report but continue.
                    result.Warnings.Add(new CompanyAllocationImportErrorDto
                    {
                        RowNumber = rowNum,
                        StudentCode = studentCode,
                        StudentName = fullName,
                        CompanyName = matchedCompany.CompanyName,
                        Message = $"Không tìm thấy vị trí '{positionTitle ?? positionCode}' tại '{matchedCompany.CompanyName}' — chỉ gán doanh nghiệp, không gán vị trí"
                    });
                }
            }

            // 4. Match or Create Internship for (Student, Semester)
            var internship = existingInternships.FirstOrDefault(i => i.StudentId == matchedStudent.Id);
            if (internship == null)
            {
                internship = new Internship
                {
                    Id = Guid.NewGuid(),
                    StudentId = matchedStudent.Id,
                    SemesterId = targetSemesterId,
                    CompanyId = matchedCompany.Id,
                    Position = matchedPosition?.Title,
                    Status = targetSemesterIsActive ? InternshipStatus.InProgress : InternshipStatus.NotStarted,
                    Notes = $"Phân bổ doanh nghiệp: {matchedCompany.CompanyName}" +
                            (matchedPosition != null ? $" — vị trí {matchedPosition.Title}" : ""),
                    CreatedAt = DateTime.UtcNow
                };
                await _db.Internships.AddAsync(internship);
                existingInternships.Add(internship);
            }
            else
            {
                internship.CompanyId = matchedCompany.Id;
                if (matchedPosition != null)
                    internship.Position = matchedPosition.Title;
                internship.UpdatedAt = DateTime.UtcNow;
            }

            result.SuccessCount++;
            result.UpdatedAllocations.Add(new CompanyAllocationItemDto
            {
                InternshipId = internship.Id,
                StudentId = matchedStudent.Id,
                StudentCode = matchedStudent.StudentCode,
                StudentName = matchedStudent.FullName,
                Class = matchedStudent.Class,
                Major = matchedStudent.Major,
                CompanyId = matchedCompany.Id,
                CompanyName = matchedCompany.CompanyName,
                LecturerId = internship.LecturerId,
                LecturerName = internship.Lecturer?.FullName,
                Status = internship.Status.ToString(),
                StartDate = internship.StartDate,
                EndDate = internship.EndDate
            });
        }

        if (result.SuccessCount > 0)
        {
            await _db.SaveChangesAsync();
        }

        return result;
    }

    public async Task<IReadOnlyList<CompanyAllocationItemDto>> GetCompanyAllocationsAsync(Guid? semesterId = null, Guid? departmentId = null)
    {
        var internshipsQuery = _db.Internships
            .AsNoTracking()
            .Where(i => !i.IsDeleted);

        if (semesterId.HasValue && semesterId.Value != Guid.Empty)
        {
            internshipsQuery = internshipsQuery.Where(i => i.SemesterId == semesterId.Value);
        }

        if (departmentId.HasValue)
        {
            internshipsQuery = internshipsQuery.Where(i => i.Student != null && i.Student.DepartmentId == departmentId.Value);
        }

        var internships = await internshipsQuery
            .Include(i => i.Student)
            .Include(i => i.Company)
            .Include(i => i.Lecturer)
            .OrderBy(i => i.Student!.FullName)
            .ToListAsync();

        return internships.Select(i => new CompanyAllocationItemDto
        {
            InternshipId = i.Id,
            StudentId = i.StudentId,
            StudentCode = i.Student?.StudentCode ?? string.Empty,
            StudentName = i.Student?.FullName ?? string.Empty,
            Class = i.Student?.Class,
            Major = i.Student?.Major,
            CompanyId = i.CompanyId,
            CompanyName = i.Company?.CompanyName,
            LecturerId = i.LecturerId,
            LecturerName = i.Lecturer?.FullName,
            Status = i.Status.ToString(),
            StartDate = i.StartDate,
            EndDate = i.EndDate
        }).ToList();
    }

    public async Task<byte[]> ExportCompanyAllocationsExcelAsync(Guid? semesterId = null, Guid? departmentId = null)
    {
        var allocations = await GetCompanyAllocationsAsync(semesterId, departmentId);

        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("PhanBoDoanhNghiep");

        sheet.Cell(1, 1).Value = "DANH SÁCH PHÂN BỔ SINH VIÊN THỰC TẬP TẠI DOANH NGHIỆP";
        sheet.Cell(1, 1).Style.Font.Bold = true;
        sheet.Cell(1, 1).Style.Font.FontSize = 14;

        sheet.Cell(2, 1).Value = $"Ngày xuất: {DateTime.UtcNow.AddHours(7):dd/MM/yyyy HH:mm} | Tổng số: {allocations.Count} sinh viên";
        sheet.Cell(2, 1).Style.Font.Italic = true;

        var headers = new[]
        {
            "STT", "MSSV", "HỌ VÀ TÊN", "LỚP", "CHUYÊN NGÀNH",
            "CÔNG TY THỰC TẬP", "GIẢNG VIÊN HƯỚNG DẪN", "TRẠNG THÁI"
        };

        for (int i = 0; i < headers.Length; i++)
        {
            var cell = sheet.Cell(4, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#1E3A8A");
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        }

        int rowIdx = 5;
        int stt = 1;
        foreach (var item in allocations)
        {
            sheet.Cell(rowIdx, 1).Value = stt++;
            sheet.Cell(rowIdx, 2).Value = item.StudentCode;
            sheet.Cell(rowIdx, 3).Value = item.StudentName;
            sheet.Cell(rowIdx, 4).Value = item.Class ?? "-";
            sheet.Cell(rowIdx, 5).Value = item.Major ?? "-";
            sheet.Cell(rowIdx, 6).Value = item.CompanyName ?? "Chưa phân bổ";
            sheet.Cell(rowIdx, 7).Value = item.LecturerName ?? "Chưa phân công";
            sheet.Cell(rowIdx, 8).Value = item.Status;

            if (string.IsNullOrWhiteSpace(item.CompanyName))
            {
                sheet.Cell(rowIdx, 6).Style.Font.FontColor = XLColor.FromHtml("#DC2626");
            }

            rowIdx++;
        }

        sheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    public byte[] GetLecturerAssignmentImportTemplate()
    {
        return TemplateHelper.GetTemplateBytes("Mau-danh-sach-phan-cong-GVHD.xlsx", () =>
        {
            using var workbook = new XLWorkbook();
            var sheet = workbook.Worksheets.Add("PhanCongGiangVien");

            sheet.Cell(1, 1).Value = "STT";
            sheet.Cell(1, 2).Value = "MSSV";
            sheet.Cell(1, 3).Value = "HỌ VÀ TÊN";
            sheet.Cell(1, 4).Value = "LỚP";
            sheet.Cell(1, 5).Value = "MÃ GIẢNG VIÊN";
            sheet.Cell(1, 6).Value = "TÊN GIẢNG VIÊN";

            sheet.Cell(2, 1).Value = 1;
            sheet.Cell(2, 2).Value = "20110101";
            sheet.Cell(2, 3).Value = "Nguyễn Bích Ngọc";
            sheet.Cell(2, 4).Value = "20KTPM1";
            sheet.Cell(2, 5).Value = "GV001";
            sheet.Cell(2, 6).Value = "TS. Nguyễn Văn Phước";

            sheet.Row(1).Style.Font.Bold = true;
            sheet.Row(1).Style.Fill.BackgroundColor = XLColor.FromHtml("#E8F0FE");
            sheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        });
    }

    public async Task<LecturerAssignmentImportResultDto> ImportLecturerAssignmentsFromExcelAsync(Stream excelStream, Guid? semesterId = null, Guid? departmentId = null)
    {
        if (excelStream == null || !excelStream.CanRead)
            throw new ArgumentException("Excel file stream is required");

        using var workbook = new XLWorkbook(excelStream);
        var worksheet = workbook.Worksheets.FirstOrDefault()
            ?? throw new InvalidOperationException("File Excel không có sheet dữ liệu");

        var usedRange = worksheet.RangeUsed()
            ?? throw new InvalidOperationException("File Excel rỗng");

        var headerRow = TemplateHelper.FindHeaderRow(worksheet, row =>
        {
            var map = BuildLecturerAssignmentColumnMap(row);
            return (map.ContainsKey(LecAssignCol.StaffCode) || map.ContainsKey(LecAssignCol.LecturerName)) &&
                   (map.ContainsKey(LecAssignCol.FullName) || map.ContainsKey(LecAssignCol.StudentCode) || map.ContainsKey(LecAssignCol.Ten));
        }) ?? usedRange.FirstRow();

        var colMap = BuildLecturerAssignmentColumnMap(headerRow);
        var hasValidStudentIdentifier = colMap.ContainsKey(LecAssignCol.FullName) || colMap.ContainsKey(LecAssignCol.StudentCode) || colMap.ContainsKey(LecAssignCol.Ten);

        if ((!colMap.ContainsKey(LecAssignCol.StaffCode) && !colMap.ContainsKey(LecAssignCol.LecturerName)) || !hasValidStudentIdentifier)
        {
            throw new InvalidOperationException("File Excel cần có cột [Mã/Tên Giảng Viên] và cột [Họ Tên/MSSV Sinh viên]");
        }

        var targetSemesterId = await ResolveTargetSemesterIdAsync(semesterId, departmentId);
        var targetSemesterIsActive = await _db.Semesters
            .AnyAsync(s => s.Id == targetSemesterId && s.Status == SemesterStatus.Active && !s.IsDeleted);

        var allStudentsQuery = _db.Students.Where(s => !s.IsDeleted);
        var allLecturersQuery = _db.Lecturers.Where(l => !l.IsDeleted);

        // Department scope: imports only match students/lecturers of the admin's department.
        if (departmentId.HasValue)
        {
            allStudentsQuery = allStudentsQuery.Where(s => s.DepartmentId == departmentId.Value);
            allLecturersQuery = allLecturersQuery.Where(l => l.DepartmentId == departmentId.Value);
        }

        var allStudents = await allStudentsQuery.ToListAsync();
        var allLecturers = await allLecturersQuery.ToListAsync();
        var existingInternships = await _db.Internships
            .Where(i => i.SemesterId == targetSemesterId && !i.IsDeleted)
            .ToListAsync();

        var result = new LecturerAssignmentImportResultDto();

        foreach (var row in usedRange.RowsUsed())
        {
            if (row.RowNumber() <= headerRow.RowNumber())
                continue;

            var rowNum = row.RowNumber();
            var studentCode = GetCellText(row, colMap, LecAssignCol.StudentCode);
            var hoTen = GetCellText(row, colMap, LecAssignCol.FullName);
            var ho = GetCellText(row, colMap, LecAssignCol.Ho);
            var ten = GetCellText(row, colMap, LecAssignCol.Ten);
            var fullName = TemplateHelper.CombineFullName(ho, ten, hoTen);
            var className = GetCellText(row, colMap, LecAssignCol.Class);
            var staffCode = GetCellText(row, colMap, LecAssignCol.StaffCode);
            var lecturerName = GetCellText(row, colMap, LecAssignCol.LecturerName);

            if (string.IsNullOrWhiteSpace(studentCode) && string.IsNullOrWhiteSpace(fullName) && string.IsNullOrWhiteSpace(staffCode))
                continue;

            result.TotalRows++;

            // 1. Resolve Lecturer
            Lecturer? matchedLecturer = null;
            if (!string.IsNullOrWhiteSpace(staffCode))
            {
                matchedLecturer = allLecturers.FirstOrDefault(l =>
                    l.StaffCode.Equals(staffCode.Trim(), StringComparison.OrdinalIgnoreCase));
            }

            if (matchedLecturer == null && !string.IsNullOrWhiteSpace(lecturerName))
            {
                var normLec = NormalizeText(lecturerName);
                matchedLecturer = allLecturers.FirstOrDefault(l => NormalizeText(l.FullName) == normLec);
            }

            if (matchedLecturer == null)
            {
                result.FailedCount++;
                result.Errors.Add(new LecturerAssignmentImportErrorDto
                {
                    RowNumber = rowNum,
                    StudentCode = studentCode,
                    StudentName = fullName,
                    StaffCode = staffCode,
                    LecturerName = lecturerName,
                    Message = $"Không tìm thấy giảng viên '{staffCode ?? lecturerName}' trong hệ thống"
                });
                continue;
            }

            // 2. Resolve Student
            Student? matchedStudent = null;
            if (!string.IsNullOrWhiteSpace(studentCode))
            {
                matchedStudent = allStudents.FirstOrDefault(s =>
                    s.StudentCode.Equals(studentCode.Trim(), StringComparison.OrdinalIgnoreCase));
            }

            if (matchedStudent == null && !string.IsNullOrWhiteSpace(fullName))
            {
                var normName = NormalizeText(fullName);
                var candidates = allStudents.Where(s => NormalizeText(s.FullName) == normName).ToList();
                if (candidates.Count == 1) matchedStudent = candidates[0];
            }

            if (matchedStudent == null)
            {
                result.FailedCount++;
                result.Errors.Add(new LecturerAssignmentImportErrorDto
                {
                    RowNumber = rowNum,
                    StudentCode = studentCode,
                    StudentName = fullName,
                    StaffCode = staffCode,
                    LecturerName = lecturerName,
                    Message = $"Không tìm thấy sinh viên '{fullName ?? studentCode}' trong hệ thống"
                });
                continue;
            }

            // 3. Assign to Internship
            var internship = existingInternships.FirstOrDefault(i => i.StudentId == matchedStudent.Id);
            if (internship == null)
            {
                internship = new Internship
                {
                    Id = Guid.NewGuid(),
                    StudentId = matchedStudent.Id,
                    SemesterId = targetSemesterId,
                    LecturerId = matchedLecturer.Id,
                    AssignedAt = DateTime.UtcNow,
                    Status = targetSemesterIsActive ? InternshipStatus.InProgress : InternshipStatus.NotStarted,
                    Notes = $"Phân công GVHD: {matchedLecturer.FullName}",
                    CreatedAt = DateTime.UtcNow
                };
                await _db.Internships.AddAsync(internship);
                existingInternships.Add(internship);
            }
            else
            {
                if (internship.LecturerId != matchedLecturer.Id)
                    internship.AssignedAt = DateTime.UtcNow;
                internship.LecturerId = matchedLecturer.Id;
                internship.UpdatedAt = DateTime.UtcNow;
            }

            result.SuccessCount++;
        }

        if (result.SuccessCount > 0)
        {
            await _db.SaveChangesAsync();
        }

        return result;
    }

    private async Task<Guid> ResolveTargetSemesterIdAsync(Guid? semesterId, Guid? departmentId = null)
    {
        if (semesterId.HasValue && semesterId.Value != Guid.Empty)
        {
            var exists = await _db.Semesters.AnyAsync(s => s.Id == semesterId.Value && !s.IsDeleted);
            if (exists) return semesterId.Value;
        }

        // Prefer an active semester of the caller's department, then a shared (unassigned) semester.
        var activeSemester = await _db.Semesters
            .FirstOrDefaultAsync(s => s.Status == SemesterStatus.Active && !s.IsDeleted && departmentId != null && s.DepartmentId == departmentId)
            ?? await _db.Semesters
            .FirstOrDefaultAsync(s => s.Status == SemesterStatus.Active && !s.IsDeleted && s.DepartmentId == null);

        if (activeSemester == null && departmentId == null)
        {
            // System-wide fallback only makes sense for SuperAdmin.
            activeSemester = await _db.Semesters.FirstOrDefaultAsync(s => !s.IsDeleted);
        }

        if (activeSemester == null)
            throw new InvalidOperationException(departmentId == null
                ? "Không tìm thấy học kỳ hợp lệ trong hệ thống"
                : "Khoa của bạn chưa có học kỳ riêng và chưa có học kỳ dùng chung đang hoạt động");

        return activeSemester.Id;
    }

    private enum CompanyAllocCol { StudentCode, FullName, Ho, Ten, Class, CompanyName, CompanyCode, PositionCode, PositionTitle }
    private enum LecAssignCol { StudentCode, FullName, Ho, Ten, Class, StaffCode, LecturerName }

    private static Dictionary<CompanyAllocCol, int> BuildCompanyAllocationColumnMap(IXLRangeRow headerRow)
    {
        var map = new Dictionary<CompanyAllocCol, int>();
        foreach (var cell in headerRow.CellsUsed())
        {
            var h = NormalizeText(cell.GetString());
            if (string.IsNullOrEmpty(h)) continue;

            if (!map.ContainsKey(CompanyAllocCol.CompanyCode) && (
                h == "ma doanh nghiep" || h == "ma dn" || h == "madn" || h == "companycode" || h == "company code"))
            {
                map[CompanyAllocCol.CompanyCode] = cell.Address.ColumnNumber;
            }
            else if (!map.ContainsKey(CompanyAllocCol.CompanyName) && (
                h.Contains("cong ty thuc tap") || h.Contains("cong ty") || h.Contains("ten cong ty") ||
                h.Contains("doanh nghiep") || h.Contains("ten doanh nghiep") || h.Contains("company") || h == "dn"))
            {
                map[CompanyAllocCol.CompanyName] = cell.Address.ColumnNumber;
            }
            else if (!map.ContainsKey(CompanyAllocCol.PositionCode) && (
                h == "ma vi tri" || h == "mavt" || h == "ma vt" || h == "positioncode" || h == "position code" || h == "ma vi tri tuyen dung"))
            {
                map[CompanyAllocCol.PositionCode] = cell.Address.ColumnNumber;
            }
            else if (!map.ContainsKey(CompanyAllocCol.PositionTitle) && (
                h.Contains("vi tri thuc tap") || h.Contains("vi tri tuyen dung") || h == "vi tri" ||
                h.Contains("position title") || h.Contains("position name")))
            {
                map[CompanyAllocCol.PositionTitle] = cell.Address.ColumnNumber;
            }
            else if (!map.ContainsKey(CompanyAllocCol.StudentCode) && (
                h == "mssv" || h == "ma sv" || h == "masv" || h == "studentcode" || h == "student code" || h == "ma sinh vien"))
            {
                map[CompanyAllocCol.StudentCode] = cell.Address.ColumnNumber;
            }
            else if (!map.ContainsKey(CompanyAllocCol.FullName) && (
                h == "ho ten" || h == "ho va ten" || h == "fullname" || h == "full name" || h == "ten sinh vien"))
            {
                map[CompanyAllocCol.FullName] = cell.Address.ColumnNumber;
            }
            else if (!map.ContainsKey(CompanyAllocCol.Ho) && (
                h == "ho" || h == "ho dem" || h == "ho va ten dem" || h == "last name"))
            {
                map[CompanyAllocCol.Ho] = cell.Address.ColumnNumber;
            }
            else if (!map.ContainsKey(CompanyAllocCol.Ten) && (
                h == "ten" || h == "first name" || h == "firstname"))
            {
                map[CompanyAllocCol.Ten] = cell.Address.ColumnNumber;
            }
            else if (!map.ContainsKey(CompanyAllocCol.Class) && (
                h == "lop" || h == "class" || h == "classname" || h == "lop hoc"))
            {
                map[CompanyAllocCol.Class] = cell.Address.ColumnNumber;
            }
        }
        return map;
    }

    private static Dictionary<LecAssignCol, int> BuildLecturerAssignmentColumnMap(IXLRangeRow headerRow)
    {
        var map = new Dictionary<LecAssignCol, int>();
        foreach (var cell in headerRow.CellsUsed())
        {
            var h = NormalizeText(cell.GetString());
            if (string.IsNullOrEmpty(h)) continue;

            if (!map.ContainsKey(LecAssignCol.StaffCode) && (
                h == "magv" || h == "ma gv" || h == "ma giang vien" || h == "staffcode" || h == "staff code" || h == "msgv"))
            {
                map[LecAssignCol.StaffCode] = cell.Address.ColumnNumber;
            }
            else if (!map.ContainsKey(LecAssignCol.LecturerName) && (
                h.Contains("giang vien") || h.Contains("gvhd") || h.Contains("lecturer")))
            {
                map[LecAssignCol.LecturerName] = cell.Address.ColumnNumber;
            }
            else if (!map.ContainsKey(LecAssignCol.StudentCode) && (
                h == "mssv" || h == "ma sv" || h == "masv" || h == "studentcode" || h == "student code" || h == "ma sinh vien"))
            {
                map[LecAssignCol.StudentCode] = cell.Address.ColumnNumber;
            }
            else if (!map.ContainsKey(LecAssignCol.FullName) && (
                h == "ho ten" || h == "ho va ten" || h == "fullname" || h == "full name" || h == "ten sinh vien"))
            {
                map[LecAssignCol.FullName] = cell.Address.ColumnNumber;
            }
            else if (!map.ContainsKey(LecAssignCol.Ho) && (
                h == "ho" || h == "ho dem" || h == "ho va ten dem" || h == "last name"))
            {
                map[LecAssignCol.Ho] = cell.Address.ColumnNumber;
            }
            else if (!map.ContainsKey(LecAssignCol.Ten) && (
                h == "ten" || h == "first name" || h == "firstname"))
            {
                map[LecAssignCol.Ten] = cell.Address.ColumnNumber;
            }
            else if (!map.ContainsKey(LecAssignCol.Class) && (
                h == "lop" || h == "class" || h == "classname" || h == "lop hoc"))
            {
                map[LecAssignCol.Class] = cell.Address.ColumnNumber;
            }
        }
        return map;
    }

    private static string NormalizeText(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;
        var formD = text.Trim().ToLowerInvariant().Normalize(System.Text.NormalizationForm.FormD);
        var sb = new System.Text.StringBuilder(formD.Length);
        foreach (var ch in formD)
        {
            if (System.Globalization.CharUnicodeInfo.GetUnicodeCategory(ch) != System.Globalization.UnicodeCategory.NonSpacingMark)
                sb.Append(ch);
        }
        var res = sb.ToString().Normalize(System.Text.NormalizationForm.FormC).Replace('đ', 'd').Replace('Đ', 'D');
        return System.Text.RegularExpressions.Regex.Replace(res, @"\s+", " ");
    }

    private static string? GetCellText<TEnum>(IXLRangeRow row, Dictionary<TEnum, int> map, TEnum col) where TEnum : struct
    {
        if (!map.TryGetValue(col, out var colIndex))
            return null;

        var cell = row.Cell(colIndex);
        if (cell.DataType == XLDataType.Number)
            return cell.GetDouble().ToString("0");

        var text = cell.GetString();
        return string.IsNullOrWhiteSpace(text) ? null : text.Trim();
    }
}


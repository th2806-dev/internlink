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

    private readonly AppDbContext _db;
    private readonly INotificationService _notificationService;

    public AssignmentService(AppDbContext db, INotificationService notificationService)
    {
        _db = db;
        _notificationService = notificationService;
    }

    public async Task<BulkAssignResultDto> BulkAssignAsync(BulkAssignRequest request)
    {
        var lecturerExists = await _db.Lecturers.AnyAsync(l => l.Id == request.LecturerId && !l.IsDeleted);
        if (!lecturerExists)
            throw new InvalidOperationException($"Lecturer with ID {request.LecturerId} not found");

        // Validate or fallback semester
        Guid targetSemesterId;
        if (request.SemesterId.HasValue && request.SemesterId.Value != Guid.Empty)
        {
            var semesterExists = await _db.Semesters.AnyAsync(s => s.Id == request.SemesterId.Value && !s.IsDeleted);
            if (!semesterExists)
                throw new InvalidOperationException($"Semester with ID {request.SemesterId.Value} not found");
            targetSemesterId = request.SemesterId.Value;
        }
        else
        {
            var activeSemester = await _db.Semesters
                .FirstOrDefaultAsync(s => s.Status == SemesterStatus.Active && !s.IsDeleted)
                ?? await _db.Semesters.FirstOrDefaultAsync(s => !s.IsDeleted);

            if (activeSemester == null)
                throw new InvalidOperationException("No active semester found for assignment");

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
                    Message = $"Student with ID {studentId} not found"
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
                    Status = targetSemesterIsActive ? InternshipStatus.InProgress : InternshipStatus.NotStarted,
                    Notes = request.Note ?? "Phân công giảng viên — chờ gán doanh nghiệp",
                    CreatedAt = DateTime.UtcNow
                };
                await _db.Internships.AddAsync(internship);
                result.CreatedCount++;
            }
            else
            {
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

    public async Task<IReadOnlyList<LecturerAssignmentItemDto>> GetByLecturerAsync(Guid lecturerId, Guid? semesterId = null)
    {
        var lecturerExists = await _db.Lecturers.AnyAsync(l => l.Id == lecturerId && !l.IsDeleted);
        if (!lecturerExists)
            throw new InvalidOperationException($"Lecturer with ID {lecturerId} not found");

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

    public async Task<bool> UnassignAsync(UnassignRequest request)
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

        var internship = await query
            .FirstOrDefaultAsync();

        if (internship == null)
            return false;

        internship.LecturerId = null;
        internship.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<IReadOnlyList<AssignmentHistoryItemDto>> GetHistoryAsync(int limit = 50, Guid? semesterId = null)
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

        var internships = await query
            .OrderByDescending(i => i.UpdatedAt ?? i.CreatedAt)
            .Take(Math.Min(limit * 20, 1000))
            .ToListAsync();

        return internships
            .GroupBy(i => new
            {
                i.LecturerId,
                LecturerName = i.Lecturer!.FullName,
                Bucket = (i.UpdatedAt ?? i.CreatedAt).ToString("yyyy-MM-dd HH:mm"),
            })
            .OrderByDescending(g => g.Max(x => x.UpdatedAt ?? x.CreatedAt))
            .Take(limit)
            .Select(g =>
            {
                var isAuto = g.Any(x =>
                    x.Notes != null &&
                    x.Notes.Contains(AutoAssignNotePrefix, StringComparison.Ordinal));
                return new AssignmentHistoryItemDto
                {
                    Id = $"{g.Key.LecturerId}-{g.Key.Bucket}",
                    LecturerName = g.Key.LecturerName,
                    StudentCount = g.Count(),
                    Timestamp = g.Max(x => x.UpdatedAt ?? x.CreatedAt),
                    ClassGroups = g
                        .Select(x => x.Student?.Class)
                        .Where(c => !string.IsNullOrWhiteSpace(c))
                        .Distinct()
                        .Cast<string>()
                        .ToList(),
                    AssignedBy = isAuto ? "Hệ thống Smart Balance" : "Ban quản lý thực tập",
                };
            })
            .ToList();
    }

    public async Task<byte[]> ExportExcelAsync(Guid? semesterId = null)
    {
        var students = await _db.Students
            .AsNoTracking()
            .Where(s => !s.IsDeleted)
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
            sheet.Cell(row, 8).Value = internship == null
                ? ""
                : (internship.UpdatedAt ?? internship.CreatedAt).ToString("dd/MM/yyyy");
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

    public async Task<AutoAssignResultDto> AutoAssignAsync(AutoAssignRequest request)
    {
        var strategy = (request.Strategy ?? "even").Trim().ToLowerInvariant();
        if (strategy is not ("department" or "even"))
            throw new InvalidOperationException("Strategy must be 'department' or 'even'");

        var lecturers = await _db.Lecturers
            .AsNoTracking()
            .Where(l => !l.IsDeleted)
            .OrderBy(l => l.FullName)
            .ToListAsync();

        if (lecturers.Count == 0)
            return new AutoAssignResultDto();

        var studentsQuery = _db.Students
            .AsNoTracking()
            .Where(s => !s.IsDeleted);

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

        var batches = new Dictionary<Guid, List<Guid>>();
        var note = strategy == "department"
            ? $"{AutoAssignNotePrefix} — ghép theo bộ môn"
            : $"{AutoAssignNotePrefix} — chia đều";

        foreach (var student in unassigned)
        {
            var lecturerId = strategy == "department"
                ? PickLecturerByDepartment(student, lecturers, lecturerCounts)
                : null;
            lecturerId ??= PickLecturerEven(lecturers, lecturerCounts);
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

        var activeSemester = request.SemesterId.HasValue
            ? await _db.Semesters.FirstOrDefaultAsync(s => s.Id == request.SemesterId.Value && !s.IsDeleted)
            : await _db.Semesters.FirstOrDefaultAsync(s => s.Status == SemesterStatus.Active && !s.IsDeleted)
                ?? await _db.Semesters.FirstOrDefaultAsync(s => !s.IsDeleted);

        if (activeSemester == null)
            throw new InvalidOperationException("No active semester found for auto assignment");

        var result = new AutoAssignResultDto { LecturersUsed = batches.Count };
        foreach (var (lecturerId, studentIds) in batches)
        {
            var bulk = await BulkAssignAsync(new BulkAssignRequest
            {
                LecturerId = lecturerId,
                SemesterId = activeSemester.Id,
                StudentIds = studentIds,
                Note = note,
            });
            result.TotalAssigned += bulk.AssignedCount;
            result.TotalFailed += bulk.FailedCount;
        }

        return result;
    }

    private static Guid? PickLecturerEven(
        IReadOnlyList<Lecturer> lecturers,
        Dictionary<Guid, int> lecturerCounts)
    {
        return lecturers
            .Select(l => new { l.Id, Count = lecturerCounts.GetValueOrDefault(l.Id) })
            .Where(x => x.Count < DefaultMaxCapacity)
            .OrderBy(x => x.Count)
            .ThenBy(x => x.Id)
            .Select(x => (Guid?)x.Id)
            .FirstOrDefault();
    }

    private static Guid? PickLecturerByDepartment(
        Student student,
        IReadOnlyList<Lecturer> lecturers,
        Dictionary<Guid, int> lecturerCounts)
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
            .Where(x => x.Count < DefaultMaxCapacity)
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
            sheet.Cell(1, 2).Value = "HỌ TÊN";
            sheet.Cell(1, 3).Value = "LỚP";
            sheet.Cell(1, 4).Value = "CÔNG TY THỰC TẬP";
            sheet.Cell(1, 5).Value = "MSSV";

            sheet.Cell(2, 1).Value = 1;
            sheet.Cell(2, 2).Value = "Phạm Duy Văn";
            sheet.Cell(2, 3).Value = "C23A.TH2";
            sheet.Cell(2, 4).Value = "Công ty Cổ phần Công nghệ RADA360";
            sheet.Cell(2, 5).Value = "2300001";

            sheet.Cell(3, 1).Value = 2;
            sheet.Cell(3, 2).Value = "Lê Văn Thành Đạt";
            sheet.Cell(3, 3).Value = "C23A.TH1";
            sheet.Cell(3, 4).Value = "Công ty cổ phần EZTEC";
            sheet.Cell(3, 5).Value = "2300002";

            sheet.Cell(4, 1).Value = 3;
            sheet.Cell(4, 2).Value = "Nguyễn Đoàn Thanh Vũ";
            sheet.Cell(4, 3).Value = "C23A.TH2";
            sheet.Cell(4, 4).Value = "Công ty cổ phần EZTEC";
            sheet.Cell(4, 5).Value = "2300003";

            sheet.Row(1).Style.Font.Bold = true;
            sheet.Row(1).Style.Fill.BackgroundColor = XLColor.FromHtml("#E8F0FE");
            sheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        });
    }

    public async Task<CompanyAllocationImportResultDto> ImportCompanyAllocationsFromExcelAsync(Stream excelStream, Guid? semesterId = null)
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

        var targetSemesterId = await ResolveTargetSemesterIdAsync(semesterId);
        var targetSemesterIsActive = await _db.Semesters
            .AnyAsync(s => s.Id == targetSemesterId && s.Status == SemesterStatus.Active && !s.IsDeleted);

        var allStudents = await _db.Students.Where(s => !s.IsDeleted).ToListAsync();
        var allCompanies = await _db.Companies.Where(c => !c.IsDeleted).ToListAsync();
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

            if (string.IsNullOrWhiteSpace(studentCode) && string.IsNullOrWhiteSpace(fullName) && string.IsNullOrWhiteSpace(companyName))
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

            // 1. Resolve Company
            var normCompany = NormalizeText(companyName);
            var matchedCompany = allCompanies.FirstOrDefault(c =>
                c.CompanyName.Equals(companyName.Trim(), StringComparison.OrdinalIgnoreCase) ||
                NormalizeText(c.CompanyName) == normCompany ||
                NormalizeText(c.CompanyName).Contains(normCompany) ||
                normCompany.Contains(NormalizeText(c.CompanyName)));

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

            // 3. Match or Create Internship for (Student, Semester)
            var internship = existingInternships.FirstOrDefault(i => i.StudentId == matchedStudent.Id);
            if (internship == null)
            {
                internship = new Internship
                {
                    Id = Guid.NewGuid(),
                    StudentId = matchedStudent.Id,
                    SemesterId = targetSemesterId,
                    CompanyId = matchedCompany.Id,
                    Status = targetSemesterIsActive ? InternshipStatus.InProgress : InternshipStatus.NotStarted,
                    Notes = $"Phân bổ doanh nghiệp: {matchedCompany.CompanyName}",
                    CreatedAt = DateTime.UtcNow
                };
                await _db.Internships.AddAsync(internship);
                existingInternships.Add(internship);
            }
            else
            {
                internship.CompanyId = matchedCompany.Id;
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

    public async Task<IReadOnlyList<CompanyAllocationItemDto>> GetCompanyAllocationsAsync(Guid? semesterId = null)
    {
        var targetSemesterId = await ResolveTargetSemesterIdAsync(semesterId);

        var internships = await _db.Internships
            .AsNoTracking()
            .Where(i => !i.IsDeleted && i.SemesterId == targetSemesterId)
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

    public async Task<byte[]> ExportCompanyAllocationsExcelAsync(Guid? semesterId = null)
    {
        var allocations = await GetCompanyAllocationsAsync(semesterId);

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

    public async Task<LecturerAssignmentImportResultDto> ImportLecturerAssignmentsFromExcelAsync(Stream excelStream, Guid? semesterId = null)
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

        var targetSemesterId = await ResolveTargetSemesterIdAsync(semesterId);
        var targetSemesterIsActive = await _db.Semesters
            .AnyAsync(s => s.Id == targetSemesterId && s.Status == SemesterStatus.Active && !s.IsDeleted);

        var allStudents = await _db.Students.Where(s => !s.IsDeleted).ToListAsync();
        var allLecturers = await _db.Lecturers.Where(l => !l.IsDeleted).ToListAsync();
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
                    Status = targetSemesterIsActive ? InternshipStatus.InProgress : InternshipStatus.NotStarted,
                    Notes = $"Phân công GVHD: {matchedLecturer.FullName}",
                    CreatedAt = DateTime.UtcNow
                };
                await _db.Internships.AddAsync(internship);
                existingInternships.Add(internship);
            }
            else
            {
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

    private async Task<Guid> ResolveTargetSemesterIdAsync(Guid? semesterId)
    {
        if (semesterId.HasValue && semesterId.Value != Guid.Empty)
        {
            var exists = await _db.Semesters.AnyAsync(s => s.Id == semesterId.Value && !s.IsDeleted);
            if (exists) return semesterId.Value;
        }

        var activeSemester = await _db.Semesters
            .FirstOrDefaultAsync(s => s.Status == SemesterStatus.Active && !s.IsDeleted)
            ?? await _db.Semesters.FirstOrDefaultAsync(s => !s.IsDeleted);

        if (activeSemester == null)
            throw new InvalidOperationException("Không tìm thấy học kỳ hợp lệ trong hệ thống");

        return activeSemester.Id;
    }

    private enum CompanyAllocCol { StudentCode, FullName, Ho, Ten, Class, CompanyName, CompanyCode }
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


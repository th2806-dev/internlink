using System.Globalization;
using System.Net.Mail;
using System.Text;
using ClosedXML.Excel;
using ExcelDataReader;
using InternLink.Application.DTOs;
using InternLink.Domain.Entities;
using InternLink.Domain.Entities.Rbac;
using InternLink.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;

namespace InternLink.Infrastructure.Services;

public sealed partial class SmartExcelImportService
{
    private static readonly IReadOnlyDictionary<string, string[]> TargetFields =
        new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            ["Students"] = ["StudentCode", "FullName", "Email", "PhoneNumber", "Phone", "ClassName", "Class", "MajorName", "Major", "DepartmentId", "DepartmentCode", "DepartmentName", "ClassId"],
            ["Lecturers"] = ["StaffCode", "FullName", "AcademicTitle", "Email", "PhoneNumber", "Phone", "DepartmentId", "DepartmentCode", "DepartmentName", "Username"],
            ["Companies"] = ["CompanyCode", "TaxCode", "CompanyName", "Address", "Website", "Industry", "ContactPerson", "ContactEmail", "ContactPhone", "Capacity", "DepartmentId", "DepartmentCode", "DepartmentName"],
            ["InternshipAssignments"] = ["StudentId", "StudentCode", "CompanyId", "CompanyCode", "LecturerId", "StaffCode", "SemesterId", "Position", "SupervisorName", "SupervisorPhone", "SupervisorEmail", "SupervisorDepartment", "StartDate", "EndDate"],
            ["Internships"] = ["StudentId", "StudentCode", "CompanyId", "CompanyCode", "LecturerId", "StaffCode", "SemesterId", "Position", "SupervisorName", "SupervisorPhone", "SupervisorEmail", "SupervisorDepartment", "StartDate", "EndDate"]
        };

    public async Task<StagedExcelPreviewResponse> StageAndAnalyzeExcelAsync(
        Stream fileStream,
        string fileName,
        string? sheetName,
        string ownerKey,
        Guid? departmentId,
        string? tenantId,
        CancellationToken cancellationToken)
    {
        var fileId = await _fileStore.SaveUploadAsync(
            fileStream, fileName, ownerKey, departmentId, tenantId, cancellationToken);
        try
        {
            var storedFile = await _fileStore.GetUploadAsync(
                fileId, ownerKey, departmentId, tenantId, cancellationToken)
                ?? throw new IOException("The uploaded workbook could not be staged.");
            await using var stream = File.OpenRead(storedFile.FilePath);
            var preview = await AnalyzeExcelAsync(
                stream, storedFile.FileName, sheetName, cancellationToken);
            return new StagedExcelPreviewResponse(fileId, preview);
        }
        catch
        {
            _fileStore.DeleteUpload(fileId, fileName);
            throw;
        }
    }

    public async Task<ExcelValidationResult> ValidateImportAsync(
        ExcelImportRequest request,
        string ownerKey,
        Guid? departmentId,
        string? tenantId,
        CancellationToken cancellationToken)
    {
        request = request with { MappingConfig = ValidateAndNormalizeMapping(request.MappingConfig) };
        ValidateRequest(request.FileId, request.MappingConfig, departmentId, tenantId);
        var file = await GetOwnedUploadAsync(
            request.FileId, ownerKey, departmentId, tenantId, cancellationToken);
        var parsed = await ParseImportWorkbookAsync(
            file.FilePath, request.MappingConfig, cancellationToken);
        var mappedRows = parsed.Rows
            .Select(row => new MappedImportRow(row.RowIndex, MapValues(row, request.MappingConfig.Mappings)))
            .ToArray();
        var rowResults = await ValidateRowsAsync(
            request.MappingConfig, mappedRows, departmentId, cancellationToken);

        var errors = rowResults
            .SelectMany(row => row.Issues.Where(issue => issue.Severity == "Error"))
            .ToArray();
        Guid? reportId = null;
        if (errors.Length > 0)
        {
            await using var reportStream = CreateErrorReport(parsed, rowResults);
            reportId = await _fileStore.SaveErrorReportAsync(
                reportStream, ownerKey, departmentId, tenantId, cancellationToken);
        }

        var errorCount = rowResults.Count(row => row.Status == "Error");
        var warningCount = rowResults.Count(row => row.Status == "Warning");
        return new ExcelValidationResult(
            errorCount == 0,
            rowResults.Length,
            rowResults.Count(row => row.Status == "Valid"),
            warningCount,
            errorCount,
            rowResults,
            errors,
            reportId);
    }

    public async Task<ImportCommitResult> ExecuteImportAsync(
        ExecuteExcelImportRequest request,
        string ownerKey,
        Guid? departmentId,
        string? tenantId,
        string? userName,
        CancellationToken cancellationToken)
    {
        if (!request.ConfirmImport)
            throw new ArgumentException("Import confirmation is required.", nameof(request));

        var validation = await ValidateImportAsync(
            new ExcelImportRequest(request.FileId, request.MappingConfig),
            ownerKey,
            departmentId,
            tenantId,
            cancellationToken);
        if (!validation.IsValid)
            return new ImportCommitResult(validation.TotalRecords, 0, 0, validation.ErrorRecordsCount, validation.ErrorReportId);

        var file = await GetOwnedUploadAsync(
            request.FileId, ownerKey, departmentId, tenantId, cancellationToken);
        var parsed = await ParseImportWorkbookAsync(
            file.FilePath, request.MappingConfig, cancellationToken);
        var rows = parsed.Rows
            .Select(row => new MappedImportRow(row.RowIndex, MapValues(row, request.MappingConfig.Mappings)))
            .ToArray();

        IDbContextTransaction? transaction = null;
        var invitations = new List<PendingInvitation>();
        try
        {
            if (_db.Database.IsRelational())
                transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

            var result = request.MappingConfig.TargetEntity.ToLowerInvariant() switch
            {
                "students" => await ImportStudentsAsync(rows, request.MappingConfig, userName, invitations, cancellationToken),
                "lecturers" => await ImportLecturersAsync(rows, request.MappingConfig, userName, invitations, cancellationToken),
                "companies" => await ImportCompaniesAsync(rows, request.MappingConfig, userName, cancellationToken),
                "internshipassignments" or "internships" => await ImportInternshipsAsync(rows, request.MappingConfig, userName, cancellationToken),
                _ => throw new ArgumentException("TargetEntity is not supported.", nameof(request))
            };

            _db.SysAuditLogs.Add(new SysAuditLog
            {
                TableName = request.MappingConfig.TargetEntity,
                ActionType = "IMPORT_EXCEL",
                RecordId = Guid.NewGuid().ToString(),
                NewValuesJson = System.Text.Json.JsonSerializer.Serialize(new
                {
                    result.SuccessCount,
                    result.UpdatedCount,
                    result.ErrorCount,
                    sourceFileName = file.FileName
                }),
                UserId = Guid.TryParse(ownerKey, out var userId) ? userId : null,
                Username = userName,
                FunctionCode = "SYSTEM.EXCEL.IMPORT",
                CreatedBy = userName,
                CreatedByFunction = "SYSTEM.EXCEL.IMPORT"
            });
            await _db.SaveChangesAsync(cancellationToken);
            if (transaction != null)
                await transaction.CommitAsync(cancellationToken);

            _fileStore.DeleteUpload(request.FileId, file.FileName);
            var invitationWarnings = await SendInvitationsAsync(invitations, cancellationToken);
            return result with { AccountProvisioningWarnings = invitationWarnings };
        }
        catch
        {
            if (transaction != null)
                await transaction.RollbackAsync(cancellationToken);
            throw;
        }
        finally
        {
            if (transaction != null)
                await transaction.DisposeAsync();
        }
    }

    public Task<ExcelErrorReportFile?> GetErrorReportAsync(
        Guid reportId,
        string ownerKey,
        Guid? departmentId,
        string? tenantId,
        CancellationToken cancellationToken) =>
        _fileStore.GetErrorReportAsync(reportId, ownerKey, departmentId, tenantId, cancellationToken);

    private async Task<ExcelValidationRowDto[]> ValidateRowsAsync(
        ExcelImportMappingConfig config,
        IReadOnlyList<MappedImportRow> rows,
        Guid? departmentId,
        CancellationToken cancellationToken)
    {
        var fieldMap = config.Mappings
            .Where(item => !string.IsNullOrWhiteSpace(item.SystemFieldCode))
            .ToDictionary(item => item.SystemFieldCode!.Trim(), StringComparer.OrdinalIgnoreCase);
        var departments = await _db.Departments
            .Where(item => !item.IsDeleted && item.IsActive)
            .ToListAsync(cancellationToken);
        var students = await _db.Students
            .Where(item => !item.IsDeleted)
            .ToListAsync(cancellationToken);
        var lecturers = await _db.Lecturers
            .Where(item => !item.IsDeleted)
            .ToListAsync(cancellationToken);
        var companies = await _db.Companies
            .Where(item => !item.IsDeleted)
            .ToListAsync(cancellationToken);
        var semesters = await _db.Semesters
            .Where(item => !item.IsDeleted)
            .ToListAsync(cancellationToken);
        var userNames = await _db.Users
            .Where(item => !item.IsDeleted)
            .Select(item => new { item.Id, item.Username, item.Email, item.Role })
            .ToListAsync(cancellationToken);

        var selectedDepartmentExists = !departmentId.HasValue
            || departments.Any(item => item.PublicId == departmentId.Value);
        var seenKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var results = new List<ExcelValidationRowDto>(rows.Count);
        foreach (var row in rows)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var issues = new List<ExcelRowValidationError>();
            string Value(string key) => GetMappedValue(row.Values, fieldMap, key);
            void AddError(string field, string message, string rawValue = "") =>
                issues.Add(new ExcelRowValidationError(row.RowIndex, field, message, rawValue, "Error"));
            void AddWarning(string field, string message, string rawValue = "") =>
                issues.Add(new ExcelRowValidationError(row.RowIndex, field, message, rawValue, "Warning"));

            ValidateRequiredFields(config.TargetEntity, Value, AddError);
            ValidateEmailFields(row.RowIndex, row.Values, fieldMap, issues);
            ValidateFieldLengths(config.TargetEntity, Value, AddError);
            if (!selectedDepartmentExists)
                AddError("DepartmentId", "Khoa được chọn không tồn tại hoặc không hoạt động.", departmentId!.Value.ToString());

            var departmentValue = Value("DepartmentId");
            var departmentCode = FirstValue(Value("DepartmentCode"), Value("DepartmentName"));
            Department? rowDepartment = null;
            if (!string.IsNullOrWhiteSpace(departmentValue))
            {
                rowDepartment = Guid.TryParse(departmentValue, out var parsedId)
                    ? departments.FirstOrDefault(item => item.PublicId == parsedId)
                    : null;
                if (rowDepartment == null)
                    AddError("DepartmentId", "Mã khoa không tồn tại hoặc khoa không hoạt động.", departmentValue);
            }
            else if (!string.IsNullOrWhiteSpace(departmentCode))
            {
                rowDepartment = departments.FirstOrDefault(item =>
                    string.Equals(item.Code, departmentCode, StringComparison.OrdinalIgnoreCase)
                    || string.Equals(item.Name, departmentCode, StringComparison.OrdinalIgnoreCase));
                if (rowDepartment == null)
                    AddError("DepartmentCode", "Mã khoa không tồn tại hoặc khoa không hoạt động.", departmentCode);
            }

            if (departmentId.HasValue && rowDepartment != null && rowDepartment.PublicId != departmentId)
                AddError("DepartmentId", "Không thể nhập dữ liệu ngoài khoa đang được phân quyền.", rowDepartment.Code);

            if (fieldMap.ContainsKey("ClassId"))
                AddError("ClassId", "Hệ thống hiện lưu lớp dưới dạng tên, chưa có bảng lớp để tra cứu ClassId.", Value("ClassId"));

            if (config.TargetEntity.Equals("Students", StringComparison.OrdinalIgnoreCase))
            {
                var code = Value("StudentCode");
                var email = Value("Email");
                var existingByCode = students.FirstOrDefault(item =>
                    string.Equals(item.StudentCode, code, StringComparison.OrdinalIgnoreCase));
                var existingByEmail = string.IsNullOrWhiteSpace(email)
                    ? null
                    : students.FirstOrDefault(item => string.Equals(item.Email, email, StringComparison.OrdinalIgnoreCase));
                if (existingByCode != null && existingByEmail != null
                    && existingByCode.PublicId != existingByEmail.PublicId)
                    AddError("Email", "MSSV và email đang thuộc hai hồ sơ khác nhau; cần xử lý trùng lặp trước khi nạp.", email!);
                if (existingByCode != null || existingByEmail != null)
                    AddWarning("StudentCode", "MSSV hoặc email đã tồn tại; dòng này sẽ cập nhật hồ sơ hiện có.", code);
                var matchingStudentUser = userNames.FirstOrDefault(user =>
                    string.Equals(user.Username, code, StringComparison.OrdinalIgnoreCase)
                    || (!string.IsNullOrWhiteSpace(email) && string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase)));
                if (matchingStudentUser != null && matchingStudentUser.Role != Role.Student)
                    AddError("StudentCode", "Mã sinh viên hoặc email đang được tài khoản khác vai trò sử dụng.", code);
                else if (matchingStudentUser != null
                    && students.Any(item => item.UserId == matchingStudentUser.Id
                        && ((existingByCode ?? existingByEmail) == null
                            || item.PublicId != (existingByCode ?? existingByEmail)!.PublicId)))
                    AddError("StudentCode", "Tài khoản sinh viên đã được liên kết với hồ sơ khác.", code);
                var key = !string.IsNullOrWhiteSpace(code) ? "S:" + code : "E:" + email;
                if (!string.IsNullOrWhiteSpace(code) && !seenKeys.Add(key))
                    AddError("StudentCode", "MSSV bị lặp trong tệp; hãy giữ lại một dòng cho mỗi sinh viên.", code);
                if (!string.IsNullOrWhiteSpace(email) && !seenKeys.Add("E:" + email)
                    && existingByCode == null && existingByEmail == null)
                    AddError("Email", "Email bị lặp trong tệp; hãy giữ lại một dòng cho mỗi sinh viên.", email);

                if (userNames.Any(user =>
                        !string.IsNullOrWhiteSpace(email)
                        && string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase)
                        && user.Role != Role.Student))
                    AddError("Email", "Email đã được sử dụng cho một tài khoản không phải sinh viên.", email);
            }
            else if (config.TargetEntity.Equals("Lecturers", StringComparison.OrdinalIgnoreCase))
            {
                var code = Value("StaffCode");
                var email = Value("Email");
                if (lecturers.Any(item => string.Equals(item.StaffCode, code, StringComparison.OrdinalIgnoreCase)))
                    AddWarning("StaffCode", "Mã giảng viên đã tồn tại; hồ sơ sẽ được cập nhật.", code);
                var matchingLecturerUser = userNames.FirstOrDefault(user =>
                    string.Equals(user.Username, code, StringComparison.OrdinalIgnoreCase)
                    || (!string.IsNullOrWhiteSpace(email) && string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase)));
                var existingLecturer = lecturers.FirstOrDefault(item =>
                    string.Equals(item.StaffCode, code, StringComparison.OrdinalIgnoreCase));
                if (matchingLecturerUser != null && matchingLecturerUser.Role != Role.Lecturer)
                    AddError("StaffCode", "Mã giảng viên hoặc email đang được tài khoản khác vai trò sử dụng.", code);
                else if (matchingLecturerUser != null
                    && lecturers.Any(item => item.UserId == matchingLecturerUser.Id
                        && (existingLecturer == null || item.PublicId != existingLecturer.PublicId)))
                    AddError("StaffCode", "Tài khoản giảng viên đã được liên kết với hồ sơ khác.", code);
                if (!string.IsNullOrWhiteSpace(email)
                    && userNames.Any(user => string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase) && user.Role != Role.Lecturer))
                    AddError("Email", "Email đã được sử dụng cho tài khoản không phải giảng viên.", email);
            }
            else if (config.TargetEntity.Equals("Companies", StringComparison.OrdinalIgnoreCase))
            {
                var code = Value("CompanyCode");
                var taxCode = Value("TaxCode");
                var existingByCode = companies.FirstOrDefault(item =>
                    !string.IsNullOrWhiteSpace(code)
                    && string.Equals(item.CompanyCode, code, StringComparison.OrdinalIgnoreCase));
                var existingByTaxCode = companies.FirstOrDefault(item =>
                    !string.IsNullOrWhiteSpace(taxCode)
                    && string.Equals(item.TaxCode, taxCode, StringComparison.OrdinalIgnoreCase));
                if (existingByCode != null && existingByTaxCode != null
                    && existingByCode.PublicId != existingByTaxCode.PublicId)
                    AddError("TaxCode", "Mã doanh nghiệp và mã số thuế đang thuộc hai hồ sơ khác nhau.", taxCode!);
                else if (existingByCode != null)
                    AddWarning("CompanyCode", "Mã doanh nghiệp đã tồn tại; hồ sơ sẽ được cập nhật.", code);
                else if (existingByTaxCode != null)
                    AddWarning("TaxCode", "Mã số thuế đã tồn tại; hồ sơ sẽ được cập nhật.", taxCode);
            }
            else if (config.TargetEntity.Equals("InternshipAssignments", StringComparison.OrdinalIgnoreCase)
                || config.TargetEntity.Equals("Internships", StringComparison.OrdinalIgnoreCase))
            {
                var studentCode = Value("StudentCode");
                var studentId = Value("StudentId");
                var studentExists = students.Any(item =>
                    !string.IsNullOrWhiteSpace(studentId) && Guid.TryParse(studentId, out var parsedId) && item.PublicId == parsedId
                    || !string.IsNullOrWhiteSpace(studentCode) && string.Equals(item.StudentCode, studentCode, StringComparison.OrdinalIgnoreCase));
                if (!studentExists && !string.IsNullOrWhiteSpace(studentCode + studentId))
                    AddError("StudentId", "Không tìm thấy sinh viên theo mã hoặc ID.", FirstValue(studentCode, studentId));

                var companyId = Value("CompanyId");
                var companyCode = Value("CompanyCode");
                if ((!string.IsNullOrWhiteSpace(companyId) || !string.IsNullOrWhiteSpace(companyCode))
                    && !companies.Any(item =>
                        Guid.TryParse(companyId, out var parsedId) && item.PublicId == parsedId
                        || !string.IsNullOrWhiteSpace(companyCode) && string.Equals(item.CompanyCode, companyCode, StringComparison.OrdinalIgnoreCase)))
                    AddError("CompanyId", "Không tìm thấy doanh nghiệp theo mã hoặc ID.", FirstValue(companyCode, companyId));

                var lecturerId = Value("LecturerId");
                var staffCode = Value("StaffCode");
                if ((!string.IsNullOrWhiteSpace(lecturerId) || !string.IsNullOrWhiteSpace(staffCode))
                    && !lecturers.Any(item =>
                        Guid.TryParse(lecturerId, out var parsedId) && item.PublicId == parsedId
                        || !string.IsNullOrWhiteSpace(staffCode) && string.Equals(item.StaffCode, staffCode, StringComparison.OrdinalIgnoreCase)))
                    AddError("LecturerId", "Không tìm thấy giảng viên theo mã hoặc ID.", FirstValue(staffCode, lecturerId));

                var semesterId = Value("SemesterId");
                if (!Guid.TryParse(semesterId, out var parsedSemesterId)
                    || !semesters.Any(item => item.PublicId == parsedSemesterId))
                    AddError("SemesterId", "Học kỳ không tồn tại.", semesterId);
            }

            var status = issues.Any(issue => issue.Severity == "Error")
                ? "Error"
                : issues.Any(issue => issue.Severity == "Warning") ? "Warning" : "Valid";
            results.Add(new ExcelValidationRowDto(row.RowIndex, status, issues));
        }

        return results.ToArray();
    }

    private async Task<ImportCommitResult> ImportStudentsAsync(
        IReadOnlyList<MappedImportRow> rows,
        ExcelImportMappingConfig config,
        string? userName,
        ICollection<PendingInvitation> invitations,
        CancellationToken cancellationToken)
    {
        var existingStudents = await _db.Students.Where(item => !item.IsDeleted).ToListAsync(cancellationToken);
        var existingUsers = await _db.Users.Where(item => !item.IsDeleted).ToListAsync(cancellationToken);
        var roles = await GetRolesAsync(Role.Student, cancellationToken);
        var inserted = 0;
        var updated = 0;
        var seen = new HashSet<Student>();
        foreach (var row in rows)
        {
            var code = GetMappedValue(row.Values, config.Mappings, "StudentCode").Trim();
            var email = NullIfWhiteSpace(GetMappedValue(row.Values, config.Mappings, "Email"));
            var student = existingStudents.FirstOrDefault(item =>
                    string.Equals(item.StudentCode, code, StringComparison.OrdinalIgnoreCase))
                ?? (email == null ? null : existingStudents.FirstOrDefault(item =>
                    string.Equals(item.Email, email, StringComparison.OrdinalIgnoreCase)));
            if (student != null && !seen.Add(student))
                continue;

            var department = await ResolveDepartmentAsync(row.Values, config, cancellationToken);
            if (student == null)
            {
                student = new Student
                {
                    StudentCode = code,
                    CreatedBy = userName,
                    CreatedByFunction = "SYSTEM.EXCEL.IMPORT"
                };
                existingStudents.Add(student);
                _db.Students.Add(student);
                inserted++;
            }
            else
            {
                updated++;
            }

            student.StudentCode = code;
            student.FullName = GetMappedValue(row.Values, config.Mappings, "FullName").Trim();
            student.Email = email;
            student.Phone = NullIfWhiteSpace(GetValue(row.Values, config.Mappings, "PhoneNumber", "Phone"));
            student.Class = NullIfWhiteSpace(GetValue(row.Values, config.Mappings, "ClassName", "Class"));
            student.Major = NullIfWhiteSpace(GetValue(row.Values, config.Mappings, "MajorName", "Major"));
            student.DepartmentId = department?.PublicId ?? config.DepartmentId;
            student.Department = department?.Name;
            student.UpdatedAt = student.AutoId > 0 ? DateTime.UtcNow : null;
            student.UpdatedBy = student.AutoId > 0 ? userName : null;
            if (student.UserId == null)
                student.User = ProvisionUser(
                    existingUsers, student.StudentCode, student.FullName, student.Email,
                    Role.Student, student.DepartmentId, roles, userName, row.RowIndex, invitations);
        }

        await _db.SaveChangesAsync(cancellationToken);
        return new ImportCommitResult(rows.Count, inserted, updated, 0, null);
    }

    private async Task<ImportCommitResult> ImportLecturersAsync(
        IReadOnlyList<MappedImportRow> rows,
        ExcelImportMappingConfig config,
        string? userName,
        ICollection<PendingInvitation> invitations,
        CancellationToken cancellationToken)
    {
        var lecturers = await _db.Lecturers.Where(item => !item.IsDeleted).ToListAsync(cancellationToken);
        var users = await _db.Users.Where(item => !item.IsDeleted).ToListAsync(cancellationToken);
        var roles = await GetRolesAsync(Role.Lecturer, cancellationToken);
        var inserted = 0;
        var updated = 0;
        foreach (var row in rows)
        {
            var code = GetMappedValue(row.Values, config.Mappings, "StaffCode").Trim();
            var lecturer = lecturers.FirstOrDefault(item =>
                string.Equals(item.StaffCode, code, StringComparison.OrdinalIgnoreCase));
            if (lecturer == null)
            {
                lecturer = new Lecturer { StaffCode = code, CreatedBy = userName, CreatedByFunction = "SYSTEM.EXCEL.IMPORT" };
                lecturers.Add(lecturer);
                _db.Lecturers.Add(lecturer);
                inserted++;
            }
            else
                updated++;

            lecturer.FullName = GetMappedValue(row.Values, config.Mappings, "FullName").Trim();
            if (config.Mappings.Any(mapping =>
                    string.Equals(mapping.SystemFieldCode, "AcademicTitle", StringComparison.OrdinalIgnoreCase)))
                lecturer.AcademicTitle = NullIfWhiteSpace(GetMappedValue(row.Values, config.Mappings, "AcademicTitle"));
            lecturer.Email = NullIfWhiteSpace(GetMappedValue(row.Values, config.Mappings, "Email"));
            lecturer.Phone = NullIfWhiteSpace(GetValue(row.Values, config.Mappings, "PhoneNumber", "Phone"));
            var department = await ResolveDepartmentAsync(row.Values, config, cancellationToken);
            lecturer.DepartmentId = department?.PublicId ?? config.DepartmentId;
            lecturer.Department = department?.Name;
            if (lecturer.UserId == null)
                lecturer.User = ProvisionUser(
                    users, lecturer.StaffCode, lecturer.FullName, lecturer.Email,
                    Role.Lecturer, lecturer.DepartmentId, roles, userName, row.RowIndex, invitations);
        }

        await _db.SaveChangesAsync(cancellationToken);
        return new ImportCommitResult(rows.Count, inserted, updated, 0, null);
    }

    private async Task<ImportCommitResult> ImportCompaniesAsync(
        IReadOnlyList<MappedImportRow> rows,
        ExcelImportMappingConfig config,
        string? userName,
        CancellationToken cancellationToken)
    {
        var companies = await _db.Companies.Where(item => !item.IsDeleted).ToListAsync(cancellationToken);
        var inserted = 0;
        var updated = 0;
        foreach (var row in rows)
        {
            var code = NullIfWhiteSpace(GetMappedValue(row.Values, config.Mappings, "CompanyCode"));
            var taxCode = NullIfWhiteSpace(GetMappedValue(row.Values, config.Mappings, "TaxCode"));
            var companyByCode = code == null ? null : companies.FirstOrDefault(item =>
                string.Equals(item.CompanyCode, code, StringComparison.OrdinalIgnoreCase));
            var companyByTaxCode = taxCode == null ? null : companies.FirstOrDefault(item =>
                string.Equals(item.TaxCode, taxCode, StringComparison.OrdinalIgnoreCase));
            var company = companyByCode ?? companyByTaxCode;
            if (company == null)
            {
                company = new Company { CompanyCode = code, CreatedBy = userName, CreatedByFunction = "SYSTEM.EXCEL.IMPORT" };
                companies.Add(company);
                _db.Companies.Add(company);
                inserted++;
            }
            else
                updated++;

            if (config.Mappings.Any(mapping =>
                    string.Equals(mapping.SystemFieldCode, "TaxCode", StringComparison.OrdinalIgnoreCase)))
                company.TaxCode = taxCode;
            company.CompanyName = GetMappedValue(row.Values, config.Mappings, "CompanyName").Trim();
            company.Address = NullIfWhiteSpace(GetMappedValue(row.Values, config.Mappings, "Address"));
            company.Website = NullIfWhiteSpace(GetMappedValue(row.Values, config.Mappings, "Website"));
            company.Industry = NullIfWhiteSpace(GetMappedValue(row.Values, config.Mappings, "Industry"));
            company.ContactPerson = NullIfWhiteSpace(GetMappedValue(row.Values, config.Mappings, "ContactPerson"));
            company.ContactEmail = NullIfWhiteSpace(GetMappedValue(row.Values, config.Mappings, "ContactEmail"));
            company.ContactPhone = NullIfWhiteSpace(GetMappedValue(row.Values, config.Mappings, "ContactPhone"));
            var capacity = GetMappedValue(row.Values, config.Mappings, "Capacity");
            if (!string.IsNullOrWhiteSpace(capacity))
                company.Capacity = int.TryParse(capacity, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedCapacity)
                    ? parsedCapacity
                    : null;
            var department = await ResolveDepartmentAsync(row.Values, config, cancellationToken);
            company.DepartmentId = department?.PublicId ?? config.DepartmentId;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return new ImportCommitResult(rows.Count, inserted, updated, 0, null);
    }

    private async Task<ImportCommitResult> ImportInternshipsAsync(
        IReadOnlyList<MappedImportRow> rows,
        ExcelImportMappingConfig config,
        string? userName,
        CancellationToken cancellationToken)
    {
        var students = await _db.Students.Where(item => !item.IsDeleted).ToListAsync(cancellationToken);
        var companies = await _db.Companies.Where(item => !item.IsDeleted).ToListAsync(cancellationToken);
        var lecturers = await _db.Lecturers.Where(item => !item.IsDeleted).ToListAsync(cancellationToken);
        var internships = await _db.Internships.Where(item => !item.IsDeleted).ToListAsync(cancellationToken);
        var inserted = 0;
        var updated = 0;
        foreach (var row in rows)
        {
            var studentKey = GetValue(row.Values, config.Mappings, "StudentId", "StudentCode");
            var student = Guid.TryParse(studentKey, out var studentId)
                ? students.FirstOrDefault(item => item.PublicId == studentId)
                : students.FirstOrDefault(item => string.Equals(item.StudentCode, studentKey, StringComparison.OrdinalIgnoreCase));
            if (student == null)
                throw new InvalidOperationException($"Student lookup changed after validation at row {row.RowIndex}.");

            var semesterKey = GetMappedValue(row.Values, config.Mappings, "SemesterId");
            if (!Guid.TryParse(semesterKey, out var semesterId))
                throw new InvalidOperationException($"Semester lookup changed after validation at row {row.RowIndex}.");
            var internship = internships.FirstOrDefault(item => item.StudentId == student.PublicId && item.SemesterId == semesterId);
            if (internship == null)
            {
                internship = new Internship
                {
                    StudentId = student.PublicId,
                    SemesterId = semesterId,
                    CreatedBy = userName,
                    CreatedByFunction = "SYSTEM.EXCEL.IMPORT"
                };
                internships.Add(internship);
                _db.Internships.Add(internship);
                inserted++;
            }
            else
                updated++;

            var companyKey = GetValue(row.Values, config.Mappings, "CompanyId", "CompanyCode");
            if (!string.IsNullOrWhiteSpace(companyKey))
            {
                var company = Guid.TryParse(companyKey, out var companyId)
                    ? companies.FirstOrDefault(item => item.PublicId == companyId)
                    : companies.FirstOrDefault(item => string.Equals(item.CompanyCode, companyKey, StringComparison.OrdinalIgnoreCase));
                internship.CompanyId = company?.PublicId;
            }

            var lecturerKey = GetValue(row.Values, config.Mappings, "LecturerId", "StaffCode");
            if (!string.IsNullOrWhiteSpace(lecturerKey))
            {
                var lecturer = Guid.TryParse(lecturerKey, out var lecturerId)
                    ? lecturers.FirstOrDefault(item => item.PublicId == lecturerId)
                    : lecturers.FirstOrDefault(item => string.Equals(item.StaffCode, lecturerKey, StringComparison.OrdinalIgnoreCase));
                internship.LecturerId = lecturer?.PublicId;
            }

            internship.Position = NullIfWhiteSpace(GetMappedValue(row.Values, config.Mappings, "Position"));
            internship.SupervisorName = NullIfWhiteSpace(GetMappedValue(row.Values, config.Mappings, "SupervisorName"));
            internship.SupervisorPhone = NullIfWhiteSpace(GetMappedValue(row.Values, config.Mappings, "SupervisorPhone"));
            internship.SupervisorEmail = NullIfWhiteSpace(GetMappedValue(row.Values, config.Mappings, "SupervisorEmail"));
            internship.SupervisorDepartment = NullIfWhiteSpace(GetMappedValue(row.Values, config.Mappings, "SupervisorDepartment"));
            if (DateTime.TryParse(GetMappedValue(row.Values, config.Mappings, "StartDate"), CultureInfo.InvariantCulture, out var startDate))
                internship.StartDate = startDate;
            if (DateTime.TryParse(GetMappedValue(row.Values, config.Mappings, "EndDate"), CultureInfo.InvariantCulture, out var endDate))
                internship.EndDate = endDate;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return new ImportCommitResult(rows.Count, inserted, updated, 0, null);
    }

    private User? ProvisionUser(
        ICollection<User> existingUsers,
        string username,
        string fullName,
        string? email,
        Role role,
        Guid? departmentId,
        IReadOnlyDictionary<string, SysRole> roles,
        string? createdBy,
        int rowIndex,
        ICollection<PendingInvitation> invitations)
    {
        var existing = existingUsers.FirstOrDefault(user =>
            string.Equals(user.Username, username, StringComparison.OrdinalIgnoreCase)
            || (!string.IsNullOrWhiteSpace(email) && string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase)));
        if (existing != null)
        {
            if (existing.Role != role)
                throw new InvalidOperationException($"The account for '{username}' has a conflicting role.");
            return existing;
        }

        var temporaryPassword = InternLink.Infrastructure.Identity.PasswordGenerator.GenerateTemporaryPassword();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = username,
            FullName = fullName,
            Email = email,
            Role = role,
            DepartmentId = departmentId,
            IsActive = true,
            MustChangePassword = true,
            CreatedBy = createdBy,
            CreatedByFunction = "SYSTEM.EXCEL.IMPORT"
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, temporaryPassword);
        invitations.Add(new PendingInvitation(rowIndex, email, fullName, username, temporaryPassword, role));
        if (!roles.TryGetValue(role.ToString(), out var sysRole))
            throw new InvalidOperationException($"The system role '{role}' is not configured.");

        var sysUser = new SysUser
        {
            PublicId = user.PublicId,
            UserName = user.Username,
            DisplayName = user.FullName,
            IsActive = true,
            LegacyUser = user,
            Roles = { new SysUserRole { Role = sysRole, AssignedAt = DateTime.UtcNow } }
        };
        _db.Users.Add(user);
        _db.SysUsers.Add(sysUser);
        existingUsers.Add(user);
        return user;
    }

    private async Task<IReadOnlyList<string>> SendInvitationsAsync(
        IReadOnlyList<PendingInvitation> invitations,
        CancellationToken cancellationToken)
    {
        var warnings = new List<string>();
        foreach (var invitation in invitations)
        {
            if (string.IsNullOrWhiteSpace(invitation.Email))
            {
                warnings.Add($"Dòng {invitation.RowIndex}: tài khoản {invitation.Username} đã tạo nhưng không có email để gửi mật khẩu tạm.");
                continue;
            }
            if (_emailService == null)
            {
                warnings.Add($"Dòng {invitation.RowIndex}: tài khoản {invitation.Username} đã tạo nhưng dịch vụ email chưa được cấu hình.");
                continue;
            }

            try
            {
                var result = await _emailService.SendInvitationAsync(new InvitationEmailRequest
                {
                    ToEmail = invitation.Email,
                    FullName = invitation.FullName,
                    Role = invitation.Role == Role.Student ? InvitationRole.Student : InvitationRole.Lecturer,
                    Username = invitation.Username,
                    TemporaryPassword = invitation.TemporaryPassword
                }, cancellationToken);
                if (!result.Success)
                {
                    _logger?.LogWarning(
                        "Could not send imported account invitation for row {RowIndex} to {Email}: {Message}",
                        invitation.RowIndex,
                        invitation.Email,
                        result.Message);
                    warnings.Add($"Dòng {invitation.RowIndex}: tài khoản đã tạo nhưng email mời chưa gửi được.");
                }
            }
            catch (Exception exception)
            {
                _logger?.LogError(
                    exception,
                    "Could not send imported account invitation for row {RowIndex} to {Email}",
                    invitation.RowIndex,
                    invitation.Email);
                warnings.Add($"Dòng {invitation.RowIndex}: tài khoản đã tạo nhưng email mời chưa gửi được.");
            }
        }
        return warnings;
    }

    private async Task<IReadOnlyDictionary<string, SysRole>> GetRolesAsync(
        Role role,
        CancellationToken cancellationToken)
    {
        var roles = await _db.SysRoles
            .Where(item => item.Code == role.ToString() && item.IsActive && !item.IsDeleted)
            .ToListAsync(cancellationToken);
        return roles.ToDictionary(item => item.Code, StringComparer.OrdinalIgnoreCase);
    }

    private async Task<Department?> ResolveDepartmentAsync(
        IReadOnlyDictionary<string, string> values,
        ExcelImportMappingConfig config,
        CancellationToken cancellationToken)
    {
        var departmentId = GetMappedValue(values, config.Mappings, "DepartmentId");
        if (Guid.TryParse(departmentId, out var id))
            return await _db.Departments.FirstOrDefaultAsync(item =>
                item.PublicId == id && item.IsActive && !item.IsDeleted, cancellationToken);
        var departmentCode = FirstValue(
            GetMappedValue(values, config.Mappings, "DepartmentCode"),
            GetMappedValue(values, config.Mappings, "DepartmentName"));
        if (!string.IsNullOrWhiteSpace(departmentCode))
            return await _db.Departments.FirstOrDefaultAsync(item =>
                (item.Code == departmentCode || item.Name == departmentCode)
                && item.IsActive && !item.IsDeleted, cancellationToken);
        return null;
    }

    private async Task<StoredExcelFile> GetOwnedUploadAsync(
        Guid fileId,
        string ownerKey,
        Guid? departmentId,
        string? tenantId,
        CancellationToken cancellationToken) =>
        await _fileStore.GetUploadAsync(fileId, ownerKey, departmentId, tenantId, cancellationToken)
        ?? throw new KeyNotFoundException("The uploaded workbook is missing, expired, or not available to this account.");

    private static void ValidateRequest(
        Guid fileId,
        ExcelImportMappingConfig config,
        Guid? effectiveDepartmentId,
        string? effectiveTenantId)
    {
        if (fileId == Guid.Empty)
            throw new ArgumentException("A valid FileId is required.", nameof(fileId));
        ArgumentNullException.ThrowIfNull(config);
        var targetEntity = config.TargetEntity?.Trim();
        if (string.IsNullOrEmpty(targetEntity)
            || !TargetFields.TryGetValue(targetEntity, out var allowedFields))
            throw new ArgumentException("TargetEntity is not supported.", nameof(config));
        if (config.StartRowIndex < 1 || config.Mappings == null || config.Mappings.Count == 0 || config.Mappings.Count > 500)
            throw new ArgumentException("MappingConfig has invalid row or mapping values.", nameof(config));
        if (config.DepartmentId != effectiveDepartmentId
            || !string.Equals(config.TenantId, effectiveTenantId, StringComparison.Ordinal))
            throw new ArgumentException("Mapping scope does not match the authorized department and tenant.", nameof(config));

        var mappedFields = config.Mappings
            .Where(item => !string.IsNullOrWhiteSpace(item.SystemFieldCode))
            .Select(item => item.SystemFieldCode!.Trim())
            .ToArray();
        if (mappedFields.Length != config.Mappings.Count
            || mappedFields.Any(field => !allowedFields.Contains(field, StringComparer.OrdinalIgnoreCase))
            || mappedFields.Distinct(StringComparer.OrdinalIgnoreCase).Count() != mappedFields.Length
            || config.Mappings.Any(item => item.ExcelColumnIndex < 0))
            throw new ArgumentException("One or more column mappings are invalid for this target entity.", nameof(config));

        var requiredFields = targetEntity.ToLowerInvariant() switch
        {
            "students" => new[] { "StudentCode", "FullName" },
            "lecturers" => new[] { "StaffCode", "FullName" },
            "companies" => new[] { "CompanyName" },
            "internshipassignments" or "internships" => new[] { "StudentCode", "SemesterId" },
            _ => Array.Empty<string>()
        };
        if (requiredFields.Any(field => !mappedFields.Contains(field, StringComparer.OrdinalIgnoreCase)))
            throw new ArgumentException("MappingConfig is missing one or more required system fields.", nameof(config));
        if (effectiveDepartmentId.HasValue && config.DepartmentId != effectiveDepartmentId)
            throw new ArgumentException("MappingConfig cannot change the active department scope.", nameof(config));
    }

    private static async Task<ParsedImportWorkbook> ParseImportWorkbookAsync(
        string filePath,
        ExcelImportMappingConfig config,
        CancellationToken cancellationToken)
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
        await using var stream = File.OpenRead(filePath);
        using var reader = ExcelReaderFactory.CreateReader(stream);
        do
        {
            if (!string.IsNullOrWhiteSpace(config.SheetName)
                && !string.Equals(reader.Name, config.SheetName, StringComparison.OrdinalIgnoreCase))
                continue;

            var rawRows = new List<RawImportRow>();
            var leadingRows = new List<string[]>();
            var worksheetRow = 0;
            while (leadingRows.Count < HeaderSearchLimit && reader.Read())
            {
                cancellationToken.ThrowIfCancellationRequested();
                worksheetRow++;
                var values = ReadValues(reader);
                leadingRows.Add(values);
                rawRows.Add(new RawImportRow(worksheetRow, values));
            }

            var headerOffset = ExcelHeaderDetector.FindHeaderRow(leadingRows);
            if (headerOffset < 0)
                throw new InvalidDataException("The selected worksheet does not contain a detectable header.");

            var headers = ExcelHeaderDetector.MakeUniqueHeaders(leadingRows[headerOffset]);
            var importRows = new List<RawImportRow>();
            for (var index = headerOffset + 1; index < leadingRows.Count; index++)
            {
                var row = rawRows[index];
                if (row.RowIndex >= config.StartRowIndex && HasMappedSourceData(row, config.Mappings))
                    importRows.Add(row);
            }

            while (reader.Read())
            {
                cancellationToken.ThrowIfCancellationRequested();
                worksheetRow++;
                var values = ReadValues(reader);
                var row = new RawImportRow(worksheetRow, values);
                rawRows.Add(row);
                if (worksheetRow >= config.StartRowIndex && HasMappedSourceData(row, config.Mappings))
                    importRows.Add(row);
                if (importRows.Count > MaxDataRows)
                    throw new InvalidDataException($"Workbook exceeds {MaxDataRows} data rows.");
            }

            if (importRows.Count == 0)
                throw new InvalidDataException("No data rows were found at or after StartRowIndex.");
            return new ParsedImportWorkbook(reader.Name, headerOffset + 1, headers, rawRows, importRows);
        }
        while (reader.NextResult());

        throw new KeyNotFoundException("The selected worksheet does not exist in this workbook.");
    }

    private static bool HasMappedSourceData(
        RawImportRow row,
        IReadOnlyList<ExcelColumnMappingDto> mappings) =>
        mappings.Any(mapping =>
            mapping.ExcelColumnIndex < row.Values.Length
            && !string.IsNullOrWhiteSpace(row.Values[mapping.ExcelColumnIndex]));

    private static IReadOnlyDictionary<string, string> MapValues(
        RawImportRow row,
        IReadOnlyList<ExcelColumnMappingDto> mappings)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var mapping in mappings)
        {
            if (string.IsNullOrWhiteSpace(mapping.SystemFieldCode))
                continue;
            var value = mapping.ExcelColumnIndex < row.Values.Length
                ? row.Values[mapping.ExcelColumnIndex]
                : string.Empty;
            if (string.IsNullOrWhiteSpace(value))
                value = mapping.DefaultValue ?? string.Empty;
            value = (mapping.TransformRule ?? string.Empty).Trim().ToUpperInvariant() switch
            {
                "" or "TRIM" => value.Trim(),
                "UPPER" => value.Trim().ToUpperInvariant(),
                "LOWER" => value.Trim().ToLowerInvariant(),
                _ => throw new ArgumentException($"Unsupported transform rule '{mapping.TransformRule}'.")
            };
            result[mapping.SystemFieldCode.Trim()] = value;
        }
        return result;
    }

    private static ExcelImportMappingConfig ValidateAndNormalizeMapping(ExcelImportMappingConfig config)
    {
        ArgumentNullException.ThrowIfNull(config);
        ArgumentNullException.ThrowIfNull(config.Mappings);
        var targetEntity = config.TargetEntity?.Trim();
        if (string.IsNullOrWhiteSpace(targetEntity))
            throw new ArgumentException("TargetEntity is required.", nameof(config));
        foreach (var mapping in config.Mappings)
        {
            var transform = mapping.TransformRule?.Trim();
            if (!string.IsNullOrEmpty(transform)
                && !new[] { "TRIM", "UPPER", "LOWER" }.Contains(transform, StringComparer.OrdinalIgnoreCase))
                throw new ArgumentException($"Unsupported transform rule '{transform}'.");
        }
        return config with { TargetEntity = targetEntity };
    }

    private static void ValidateRequiredFields(
        string target,
        Func<string, string> value,
        Action<string, string, string> addError)
    {
        var fields = target.ToLowerInvariant() switch
        {
            "students" => new[] { ("StudentCode", "Mã sinh viên"), ("FullName", "Họ tên") },
            "lecturers" => new[] { ("StaffCode", "Mã giảng viên"), ("FullName", "Họ tên") },
            "companies" => new[] { ("CompanyName", "Tên doanh nghiệp") },
            "internshipassignments" or "internships" => new[] { ("StudentCode", "Mã sinh viên"), ("SemesterId", "Học kỳ") },
            _ => Array.Empty<(string, string)>()
        };
        foreach (var (field, label) in fields)
        {
            var raw = value(field);
            if (string.IsNullOrWhiteSpace(raw))
                addError(field, $"{label} không được để trống.", raw);
        }
    }

    private static void ValidateEmailFields(
        int rowIndex,
        IReadOnlyDictionary<string, string> values,
        IReadOnlyDictionary<string, ExcelColumnMappingDto> mappings,
        ICollection<ExcelRowValidationError> issues)
    {
        foreach (var field in new[] { "Email", "ContactEmail", "SupervisorEmail" })
        {
            var email = GetMappedValue(values, mappings, field);
            if (string.IsNullOrWhiteSpace(email))
                continue;
            if (!MailAddress.TryCreate(email, out var parsed)
                || !string.Equals(parsed.Address, email, StringComparison.OrdinalIgnoreCase))
                issues.Add(new ExcelRowValidationError(rowIndex, field, "Email không đúng định dạng.", email));
        }
    }

    private static void ValidateFieldLengths(
        string target,
        Func<string, string> value,
        Action<string, string, string> addError)
    {
        var maxLengths = target.ToLowerInvariant() switch
        {
            "students" => new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                ["StudentCode"] = 50, ["FullName"] = 200, ["Email"] = 200, ["PhoneNumber"] = 50, ["Phone"] = 50, ["ClassName"] = 100, ["Class"] = 100, ["MajorName"] = 150, ["Major"] = 150
            },
            "lecturers" => new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                ["StaffCode"] = 50, ["FullName"] = 200, ["AcademicTitle"] = 150, ["Email"] = 200, ["PhoneNumber"] = 50, ["Phone"] = 50
            },
            "companies" => new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                ["CompanyCode"] = 50, ["TaxCode"] = 50, ["CompanyName"] = 250, ["Address"] = 500, ["Website"] = 250, ["Industry"] = 150, ["ContactPerson"] = 200, ["ContactEmail"] = 200, ["ContactPhone"] = 50
            },
            _ => new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                ["SupervisorName"] = 200, ["SupervisorPhone"] = 50, ["SupervisorEmail"] = 200, ["SupervisorDepartment"] = 200, ["Position"] = 200
            }
        };
        foreach (var (field, max) in maxLengths)
        {
            var raw = value(field);
            if (raw.Length > max)
                addError(field, $"Trường {field} không được vượt quá {max} ký tự.", raw);
        }
    }

    private static MemoryStream CreateErrorReport(
        ParsedImportWorkbook parsed,
        IReadOnlyList<ExcelValidationRowDto> validationRows)
    {
        var issueByRow = validationRows.ToDictionary(
            row => row.RowIndex,
            row => row.Status == "Valid"
                ? "Hợp lệ"
                : string.Join("; ", row.Issues.Select(issue => $"{issue.FieldCode}: {issue.ErrorMessage}")));
        var workbook = new XLWorkbook();
        var sheet = workbook.AddWorksheet(parsed.SheetName);
        var lastColumn = Math.Max(1, parsed.RawRows.Select(row => row.Values.Length).DefaultIfEmpty(1).Max());
        foreach (var row in parsed.RawRows)
        {
            for (var column = 0; column < row.Values.Length; column++)
                sheet.Cell(row.RowIndex, column + 1).Value = row.Values[column];
            if (issueByRow.TryGetValue(row.RowIndex, out var message))
                sheet.Cell(row.RowIndex, lastColumn + 1).Value = message;
        }

        sheet.Cell(parsed.HeaderRowIndex, lastColumn + 1).Value = "Kết quả";
        sheet.Columns().AdjustToContents();
        sheet.SheetView.FreezeRows(parsed.HeaderRowIndex);
        var stream = new MemoryStream();
        workbook.SaveAs(stream);
        workbook.Dispose();
        stream.Position = 0;
        return stream;
    }

    private static string GetMappedValue(
        IReadOnlyDictionary<string, string> values,
        IReadOnlyDictionary<string, ExcelColumnMappingDto> mapping,
        string field) =>
        values.TryGetValue(field, out var value) ? value : string.Empty;

    private static string GetMappedValue(
        IReadOnlyDictionary<string, string> values,
        IReadOnlyList<ExcelColumnMappingDto> mappings,
        string field) =>
        values.TryGetValue(field, out var value) ? value : string.Empty;

    private static string GetValue(
        IReadOnlyDictionary<string, string> values,
        IReadOnlyList<ExcelColumnMappingDto> mappings,
        params string[] fields)
    {
        foreach (var field in fields)
        {
            var match = mappings.FirstOrDefault(item =>
                string.Equals(item.SystemFieldCode, field, StringComparison.OrdinalIgnoreCase));
            if (match != null && values.TryGetValue(match.SystemFieldCode!, out var value) && !string.IsNullOrWhiteSpace(value))
                return value;
        }
        return string.Empty;
    }

    private static string FirstValue(params string[] values) =>
        values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value)) ?? string.Empty;

    private static string? NullIfWhiteSpace(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private sealed record RawImportRow(int RowIndex, string[] Values);
    private sealed record MappedImportRow(int RowIndex, IReadOnlyDictionary<string, string> Values);
    private sealed record ParsedImportWorkbook(
        string SheetName,
        int HeaderRowIndex,
        string[] Headers,
        IReadOnlyList<RawImportRow> RawRows,
        IReadOnlyList<RawImportRow> Rows);
    private sealed record PendingInvitation(
        int RowIndex,
        string? Email,
        string FullName,
        string Username,
        string TemporaryPassword,
        Role Role);
}

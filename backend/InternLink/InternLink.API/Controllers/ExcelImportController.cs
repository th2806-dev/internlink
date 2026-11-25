using System.Net.Mail;
using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using InternLink.API.Authorization;
using InternLink.API.Extensions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Entities.Rbac;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using InternLink.Shared.Authorization;
using ExcelDataReader;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InternLink.API.Controllers;

[ApiController]
[Route("api/v1/system/excel")]
[Authorize(Policy = AdminPolicies.DepartmentAdmin)]
[RequirePermission(SystemPermissionCodes.ExcelImport)]
[RequestSizeLimit(MaxFileBytes)]
public sealed class ExcelImportController : ControllerBase
{
    private const long MaxFileBytes = 10 * 1024 * 1024;
    private const int MaxDataRows = 50000;
    private const int BatchSize = 500;
    private readonly AppDbContext _db;
    private readonly IDepartmentScopeService _departmentScope;
    private readonly ISmartExcelImportService _smartExcelImportService;

    public ExcelImportController(
        AppDbContext db,
        IDepartmentScopeService departmentScope,
        ISmartExcelImportService smartExcelImportService)
    {
        _db = db;
        _departmentScope = departmentScope;
        _smartExcelImportService = smartExcelImportService;
    }

    [HttpPost("preview")]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxFileBytes)]
    public async Task<IActionResult> Preview(
        IFormFile? file,
        [FromForm] string? mapping,
        [FromForm] string? sheetName,
        [FromForm] Guid? departmentId,
        [FromForm] string? tenantId,
        CancellationToken cancellationToken)
    {
        if (!TryValidateFile(file, out var error))
            return BadRequest(new { message = error });

        if (!string.IsNullOrWhiteSpace(mapping))
        {
            if (!TryParseMapping(mapping, out var columnMap))
                return BadRequest(new { message = "Cấu hình ánh xạ cột không hợp lệ." });

            SpreadsheetData legacySpreadsheet;
            try
            {
                using var inputStream = file!.OpenReadStream();
                legacySpreadsheet = ReadSpreadsheet(inputStream, sheetName);
            }
            catch (Exception exception) when (IsSpreadsheetException(exception))
            {
                return BadRequest(new { message = "Không đọc được tệp Excel. Hãy kiểm tra định dạng và thử lại." });
            }

            var legacyRows = MapRows(legacySpreadsheet, columnMap);
            var legacyErrors = await ValidateRowsAsync(legacyRows, cancellationToken);
            return Ok(new
            {
                headers = legacySpreadsheet.Headers.Select(header => new
                {
                    column = header.Column,
                    title = header.Title
                }),
                sampleRows = legacySpreadsheet.Rows.Take(5).Select(row => row.Values).ToList(),
                validationErrors = legacyErrors,
                dataRowCount = legacySpreadsheet.Rows.Count,
                headerRowIndex = legacySpreadsheet.HeaderRowIndex
            });
        }

        if (!TryResolveTenantId(tenantId, out var effectiveTenantId))
            return Forbid();
        var effectiveDepartmentId = _departmentScope.ResolveEffectiveDepartmentId(User, departmentId);

        try
        {
            using var inputStream = file!.OpenReadStream();
            var staged = await _smartExcelImportService.StageAndAnalyzeExcelAsync(
                inputStream,
                file.FileName,
                sheetName,
                GetOwnerKey(),
                effectiveDepartmentId,
                effectiveTenantId,
                cancellationToken);
            var preview = staged.Preview;
            var headerColumns = preview.Columns
                .Select(column => new
                {
                    column = ToColumnLetter(column.ExcelColumnIndex + 1),
                    title = column.ExcelColumnName
                })
                .ToArray();
            var sampleRows = preview.SampleRows
                .Select(row => preview.Columns
                    .Select(column => row[column.ExcelColumnName])
                    .ToArray())
                .ToArray();
            return Ok(new
            {
                fileId = staged.FileId,
                headers = headerColumns,
                sampleRows,
                validationErrors = Array.Empty<ImportRowError>(),
                dataRowCount = preview.TotalRows,
                preview.FileName,
                preview.SheetNames,
                preview.SelectedSheetName,
                preview.HeaderRowIndex,
                preview.Columns
            });
        }
        catch (InvalidDataException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (Exception exception) when (IsSpreadsheetException(exception))
        {
            return BadRequest(new { message = "Không đọc được tệp Excel hoặc không tìm thấy dòng tiêu đề phù hợp." });
        }
    }

    [HttpPost("validate")]
    public async Task<ActionResult<ExcelValidationResult>> ValidateImport(
        [FromBody] ExcelImportRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryResolveTenantId(request.MappingConfig.TenantId, out var effectiveTenantId))
            return Forbid();
        var effectiveDepartmentId = _departmentScope.ResolveEffectiveDepartmentId(
            User, request.MappingConfig.DepartmentId);
        var scopedRequest = request with
        {
            MappingConfig = request.MappingConfig with
            {
                DepartmentId = effectiveDepartmentId,
                TenantId = effectiveTenantId
            }
        };
        try
        {
            var result = await _smartExcelImportService.ValidateImportAsync(
                scopedRequest, GetOwnerKey(), effectiveDepartmentId, effectiveTenantId, cancellationToken);
            return Ok(result with
            {
                ErrorReportUrl = result.ErrorReportId.HasValue
                    ? CreateErrorReportUrl(result.ErrorReportId.Value, effectiveDepartmentId, effectiveTenantId)
                    : null
            });
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (InvalidDataException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
    }

    [HttpPost("execute-import")]
    [HttpPost("~/api/v1/admin/excel/import")]
    public async Task<ActionResult<ImportCommitResult>> ExecuteImport(
        [FromBody] ExecuteExcelImportRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryResolveTenantId(request.MappingConfig.TenantId, out var effectiveTenantId))
            return Forbid();
        var effectiveDepartmentId = _departmentScope.ResolveEffectiveDepartmentId(
            User, request.MappingConfig.DepartmentId);
        var scopedRequest = request with
        {
            MappingConfig = request.MappingConfig with
            {
                DepartmentId = effectiveDepartmentId,
                TenantId = effectiveTenantId
            }
        };
        try
        {
            var result = await _smartExcelImportService.ExecuteImportAsync(
                scopedRequest,
                GetOwnerKey(),
                effectiveDepartmentId,
                effectiveTenantId,
                User.Identity?.Name,
                cancellationToken);
            return Ok(result with
            {
                ErrorReportUrl = result.ErrorReportId.HasValue
                    ? CreateErrorReportUrl(result.ErrorReportId.Value, effectiveDepartmentId, effectiveTenantId)
                    : null
            });
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(new { message = exception.Message });
        }
    }

    [HttpGet("error-reports/{id:guid}")]
    public async Task<IActionResult> DownloadErrorReport(
        Guid id,
        [FromQuery] string? tenantId,
        [FromQuery] Guid? departmentId,
        CancellationToken cancellationToken)
    {
        if (!TryResolveTenantId(tenantId, out var effectiveTenantId))
            return Forbid();
        var effectiveDepartmentId = _departmentScope.ResolveEffectiveDepartmentId(User, departmentId);
        var report = await _smartExcelImportService.GetErrorReportAsync(
            id, GetOwnerKey(), effectiveDepartmentId, effectiveTenantId, cancellationToken);
        if (report == null)
            return NotFound();
        return PhysicalFile(
            report.FilePath,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            report.FileName);
    }

    [HttpGet("mappings")]
    public async Task<ActionResult<IReadOnlyList<ExcelMappingPresetDto>>> GetPresets(
        [FromQuery] Guid? departmentId,
        [FromQuery] string? tenantId,
        CancellationToken cancellationToken)
    {
        if (!TryResolveTenantId(tenantId, out var effectiveTenantId))
            return Forbid();

        var effectiveDepartmentId = _departmentScope.ResolveEffectiveDepartmentId(User, departmentId);
        var presets = await _smartExcelImportService.GetPresetsAsync(
            effectiveDepartmentId, effectiveTenantId, cancellationToken);
        return Ok(presets);
    }

    [HttpGet("mappings/{id:guid}")]
    public async Task<ActionResult<ExcelMappingPresetDto>> GetPreset(
        Guid id,
        [FromQuery] Guid? departmentId,
        [FromQuery] string? tenantId,
        CancellationToken cancellationToken)
    {
        if (!TryResolveTenantId(tenantId, out var effectiveTenantId))
            return Forbid();

        var effectiveDepartmentId = _departmentScope.ResolveEffectiveDepartmentId(User, departmentId);
        var preset = await _smartExcelImportService.GetPresetAsync(
            id, effectiveDepartmentId, effectiveTenantId, cancellationToken);
        return preset == null ? NotFound() : Ok(preset);
    }

    [HttpPost("mappings")]
    public async Task<ActionResult<ExcelMappingPresetDto>> SavePreset(
        [FromBody] SaveExcelPresetRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryResolveTenantId(request.TenantId, out var effectiveTenantId))
            return Forbid();

        var effectiveDepartmentId = _departmentScope.ResolveEffectiveDepartmentId(User, request.DepartmentId);
        try
        {
            var preset = await _smartExcelImportService.SavePresetAsync(
                request,
                effectiveDepartmentId,
                effectiveTenantId,
                User.Identity?.Name,
                cancellationToken);
            return CreatedAtAction(
                nameof(GetPreset),
                new { id = preset.Id, departmentId = effectiveDepartmentId, tenantId = effectiveTenantId },
                preset);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(new { message = exception.Message });
        }
    }

    [HttpPost("import-students")]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxFileBytes)]
    public async Task<IActionResult> ImportStudents(
        IFormFile? file,
        [FromForm] string? mapping,
        [FromForm] Guid? departmentId,
        [FromForm] string? sheetName,
        CancellationToken cancellationToken)
    {
        if (!TryValidateFile(file, out var error))
            return BadRequest(new { message = error });
        if (string.IsNullOrWhiteSpace(mapping) || !TryParseMapping(mapping, out var columnMap))
            return BadRequest(new { message = "Vui lòng cấu hình cột MSSV, họ tên và các trường cần nhập." });

        var effectiveDepartmentId = _departmentScope.ResolveEffectiveDepartmentId(User, departmentId);
        var departmentName = effectiveDepartmentId.HasValue
            ? await _db.Departments
                .Where(item => item.PublicId == effectiveDepartmentId.Value)
                .Select(item => item.Name)
                .FirstOrDefaultAsync(cancellationToken)
            : null;
        if (effectiveDepartmentId.HasValue && departmentName == null)
            return BadRequest(new { message = "Khoa được chọn không tồn tại." });

        List<MappedStudentRow> parsedRows;
        try
        {
            using var fileStream = file!.OpenReadStream();
            parsedRows = MapRows(ReadSpreadsheet(fileStream, sheetName), columnMap);
        }
        catch (Exception exception) when (IsSpreadsheetException(exception))
        {
            return BadRequest(new { message = "Không đọc được tệp Excel. Hãy kiểm tra định dạng và thử lại." });
        }

        if (parsedRows.Count > MaxDataRows)
            return BadRequest(new { message = $"Tệp vượt quá giới hạn {MaxDataRows:N0} dòng dữ liệu." });

        var errors = await ValidateRowsAsync(parsedRows, cancellationToken);
        var invalidRows = errors.Select(item => item.RowNumber).ToHashSet();
        var validRows = parsedRows.Where(row => !invalidRows.Contains(row.RowNumber)).ToList();
        var insertedCount = 0;

        foreach (var batch in validRows.Chunk(BatchSize))
        {
            var students = batch.Select(row => new Student
            {
                StudentCode = row.StudentCode.Trim(),
                FullName = row.FullName.Trim(),
                Class = NullIfWhiteSpace(row.Class),
                Email = NullIfWhiteSpace(row.Email),
                Phone = NullIfWhiteSpace(row.Phone),
                DepartmentId = effectiveDepartmentId,
                Department = departmentName,
                CreatedBy = User.Identity?.Name,
                CreatedByFunction = "IMPORT_EXCEL"
            }).ToList();
            await _db.Students.AddRangeAsync(students, cancellationToken);
            insertedCount += await _db.SaveChangesAsync(cancellationToken);
        }

        _db.SysAuditLogs.Add(new SysAuditLog
        {
            TableName = "Students",
            ActionType = "IMPORT_EXCEL",
            RecordId = Guid.NewGuid().ToString(),
            NewValuesJson = JsonSerializer.Serialize(new
            {
                insertedCount,
                errorCount = errors.Count,
                sourceFileName = Path.GetFileName(file!.FileName)
            }),
            UserId = User.GetUserId(),
            Username = User.Identity?.Name,
            FunctionCode = "SYSTEM.EXCEL.IMPORT",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            CreatedBy = User.Identity?.Name,
            CreatedByFunction = "SYSTEM.EXCEL.IMPORT"
        });
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new { successCount = insertedCount, errors });
    }

    private async Task<List<ImportRowError>> ValidateRowsAsync(
        IReadOnlyList<MappedStudentRow> rows,
        CancellationToken cancellationToken)
    {
        var errors = new List<ImportRowError>();
        var seenCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var candidateCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var row in rows)
        {
            if (string.IsNullOrWhiteSpace(row.StudentCode))
                errors.Add(new(row.RowNumber, "mssv", "MSSV không được để trống."));
            else
            {
                var code = row.StudentCode.Trim();
                if (code.Length > 50)
                    errors.Add(new(row.RowNumber, "mssv", "MSSV không được vượt quá 50 ký tự."));
                else if (!seenCodes.Add(code))
                    errors.Add(new(row.RowNumber, "mssv", "MSSV bị trùng trong tệp."));
                else
                    candidateCodes.Add(code);
            }

            if (string.IsNullOrWhiteSpace(row.FullName))
                errors.Add(new(row.RowNumber, "name", "Họ tên không được để trống."));
            else if (row.FullName.Trim().Length > 200)
                errors.Add(new(row.RowNumber, "name", "Họ tên không được vượt quá 200 ký tự."));

            if (!string.IsNullOrWhiteSpace(row.Email)
                && (!MailAddress.TryCreate(row.Email.Trim(), out var parsedEmail)
                    || !string.Equals(parsedEmail.Address, row.Email.Trim(), StringComparison.OrdinalIgnoreCase)))
                errors.Add(new(row.RowNumber, "email", "Email không đúng định dạng."));
        }

        foreach (var codeBatch in candidateCodes.Chunk(BatchSize))
        {
            var existing = await _db.Students
                .Where(student => codeBatch.Contains(student.StudentCode))
                .Select(student => student.StudentCode)
                .ToListAsync(cancellationToken);
            var existingSet = existing.ToHashSet(StringComparer.OrdinalIgnoreCase);
            foreach (var row in rows.Where(row => !string.IsNullOrWhiteSpace(row.StudentCode)
                && codeBatch.Contains(row.StudentCode.Trim())
                && existingSet.Contains(row.StudentCode.Trim())))
                errors.Add(new(row.RowNumber, "mssv", "MSSV đã tồn tại trong hệ thống."));
        }

        return errors;
    }

    private static SpreadsheetData ReadSpreadsheet(Stream stream, string? sheetName = null)
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
        using var reader = ExcelReaderFactory.CreateReader(stream);
        do
        {
            if (string.IsNullOrWhiteSpace(sheetName)
                || string.Equals(reader.Name, sheetName.Trim(), StringComparison.Ordinal))
                return ReadSpreadsheetSheet(reader);
        }
        while (reader.NextResult());

        throw new KeyNotFoundException("Không tìm thấy trang tính được chọn trong tệp Excel.");
    }

    private static SpreadsheetData ReadSpreadsheetSheet(IExcelDataReader reader)
    {
        var leadingRows = new List<string[]>();
        while (leadingRows.Count < 20 && reader.Read())
            leadingRows.Add(Enumerable.Range(0, reader.FieldCount)
                .Select(index => FormatCellValue(reader, index))
                .ToArray());
        var headerRowIndex = ExcelHeaderDetector.FindHeaderRow(leadingRows);
        if (headerRowIndex < 0)
            return new([], [], -1);

        var headerNames = ExcelHeaderDetector.MakeUniqueHeaders(leadingRows[headerRowIndex]);
        var headers = headerNames
            .Select((name, index) => new ImportHeader(ToColumnLetter(index + 1), name))
            .ToList();
        var rows = new List<SpreadsheetRow>();
        var rowNumber = headerRowIndex + 1;
        for (var index = headerRowIndex + 1; index < leadingRows.Count; index++)
        {
            rowNumber++;
            AddSpreadsheetRow(leadingRows[index], rowNumber, rows);
        }

        while (reader.Read())
        {
            rowNumber++;
            var values = Enumerable.Range(0, reader.FieldCount)
                .Select(index => FormatCellValue(reader, index))
                .ToArray();
            AddSpreadsheetRow(values, rowNumber, rows);
        }

        if (rows.Count > MaxDataRows)
            throw new InvalidDataException($"Workbook exceeds {MaxDataRows} data rows.");
        return new SpreadsheetData(headers, rows, headerRowIndex);
    }

    private static void AddSpreadsheetRow(IReadOnlyList<string> values, int rowNumber, ICollection<SpreadsheetRow> rows)
    {
        if (values.All(string.IsNullOrWhiteSpace))
            return;
        if (rows.Count >= MaxDataRows)
            throw new InvalidDataException($"Workbook exceeds {MaxDataRows} data rows.");
        rows.Add(new SpreadsheetRow(rowNumber, values.ToArray()));
    }

    private static string FormatCellValue(IExcelDataReader reader, int columnIndex)
    {
        var value = reader.GetValue(columnIndex);
        if (value == null)
            return "";
        if (value is DateTime dateTime)
            return dateTime.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        if (value is double number)
        {
            var numberFormat = reader.GetNumberFormatString(columnIndex);
            if (!string.IsNullOrEmpty(numberFormat) && numberFormat.All(character => character == '0'))
                return number.ToString(new string('0', numberFormat.Length), CultureInfo.InvariantCulture);
            return number.ToString("0.################", CultureInfo.InvariantCulture);
        }
        return Convert.ToString(value, CultureInfo.InvariantCulture)?.Trim() ?? "";
    }

    private static List<MappedStudentRow> MapRows(
        SpreadsheetData spreadsheet,
        IReadOnlyDictionary<string, int> columnMap)
    {
        var rows = new List<MappedStudentRow>();
        foreach (var row in spreadsheet.Rows)
        {
            var mapped = new MappedStudentRow(
                row.RowNumber,
                GetCellValue(row, columnMap["mssv"]),
                GetCellValue(row, columnMap["name"]),
                GetOptionalValue(row, columnMap, "class"),
                GetOptionalValue(row, columnMap, "email"),
                GetOptionalValue(row, columnMap, "phone"));
            if (string.IsNullOrWhiteSpace(mapped.StudentCode)
                && string.IsNullOrWhiteSpace(mapped.FullName)
                && string.IsNullOrWhiteSpace(mapped.Class)
                && string.IsNullOrWhiteSpace(mapped.Email)
                && string.IsNullOrWhiteSpace(mapped.Phone))
                continue;
            rows.Add(mapped);
        }

        return rows;
    }

    private static string GetOptionalValue(
        SpreadsheetRow row,
        IReadOnlyDictionary<string, int> columnMap,
        string field) =>
        columnMap.TryGetValue(field, out var column)
            ? GetCellValue(row, column)
            : "";

    private static string GetCellValue(SpreadsheetRow row, int column) =>
        column >= 0 && column < row.Values.Length
            ? row.Values[column].Trim()
            : "";

    private static bool IsSpreadsheetException(Exception exception) =>
        exception is IOException
            or ArgumentException
            or ExcelDataReader.Exceptions.ExcelReaderException
            or ExcelDataReader.Exceptions.InvalidPasswordException
            or KeyNotFoundException;

    private static bool TryParseMapping(string json, out Dictionary<string, int> mapping)
    {
        mapping = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        try
        {
            var request = JsonSerializer.Deserialize<Dictionary<string, string>>(json);
            if (request == null)
                return false;
            foreach (var (field, column) in request)
            {
                if (!new[] { "mssv", "name", "class", "email", "phone" }.Contains(field, StringComparer.OrdinalIgnoreCase))
                    return false;
                var letter = column.Trim().ToUpperInvariant();
                if (letter.Length is < 1 or > 3 || letter.Any(character => character is < 'A' or > 'Z'))
                    return false;
                var index = letter.Aggregate(0, (current, character) => current * 26 + character - 'A' + 1) - 1;
                mapping[field] = index;
            }

            return mapping.ContainsKey("mssv") && mapping.ContainsKey("name");
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static bool TryValidateFile(IFormFile? file, out string message)
    {
        if (file == null || file.Length == 0)
        {
            message = "Vui lòng chọn tệp Excel.";
            return false;
        }
        if (file.Length > MaxFileBytes)
        {
            message = "Tệp Excel vượt quá giới hạn 10 MB.";
            return false;
        }
        var extension = Path.GetExtension(file.FileName);
        if (!string.Equals(extension, ".xlsx", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(extension, ".xls", StringComparison.OrdinalIgnoreCase))
        {
            message = "Chỉ hỗ trợ tệp .xlsx hoặc .xls.";
            return false;
        }

        message = "";
        return true;
    }

    private bool TryResolveTenantId(string? requestedTenantId, out string? effectiveTenantId)
    {
        var claimedTenantId = User.FindFirst("TenantId")?.Value;
        if (User.IsInRole("SuperAdmin"))
        {
            effectiveTenantId = string.IsNullOrWhiteSpace(requestedTenantId)
                ? claimedTenantId
                : requestedTenantId.Trim();
            return effectiveTenantId == null || effectiveTenantId.Length <= 50;
        }

        effectiveTenantId = claimedTenantId;
        return requestedTenantId == null
            || string.Equals(requestedTenantId.Trim(), claimedTenantId, StringComparison.Ordinal);
    }

    private string GetOwnerKey() =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? User.Identity?.Name
        ?? throw new UnauthorizedAccessException("The authenticated user identity is missing.");

    private static string CreateErrorReportUrl(Guid reportId, Guid? departmentId, string? tenantId)
    {
        var query = new List<string>();
        if (departmentId.HasValue)
            query.Add($"departmentId={departmentId.Value}");
        if (!string.IsNullOrWhiteSpace(tenantId))
            query.Add($"tenantId={Uri.EscapeDataString(tenantId)}");
        var path = $"/api/v1/system/excel/error-reports/{reportId}";
        return query.Count == 0 ? path : $"{path}?{string.Join("&", query)}";
    }

    private static string ToColumnLetter(int column)
    {
        var result = "";
        while (column > 0)
        {
            column--;
            result = (char)('A' + column % 26) + result;
            column /= 26;
        }

        return result;
    }

    private static string? NullIfWhiteSpace(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private sealed record MappedStudentRow(
        int RowNumber,
        string StudentCode,
        string FullName,
        string Class,
        string Email,
        string Phone);

    private sealed record ImportHeader(string Column, string Title);
    private sealed record SpreadsheetRow(int RowNumber, string[] Values);
    private sealed record SpreadsheetData(List<ImportHeader> Headers, List<SpreadsheetRow> Rows, int HeaderRowIndex);
    private sealed record ImportRowError(int RowNumber, string Field, string Message);
}

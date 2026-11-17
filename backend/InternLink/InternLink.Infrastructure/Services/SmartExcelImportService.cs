using System.Globalization;
using System.Text;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities.Rbac;
using InternLink.Infrastructure.Persistence;
using ExcelDataReader;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public sealed class SmartExcelImportService : ISmartExcelImportService
{
    private const int HeaderSearchLimit = 20;
    private const int SampleRowLimit = 5;
    private const int MaxDataRows = 50000;
    private readonly AppDbContext _db;

    public SmartExcelImportService(AppDbContext db) => _db = db;

    public Task<ExcelPreviewResponse> AnalyzeExcelAsync(
        Stream fileStream,
        string fileName,
        string? sheetName,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(fileStream);
        cancellationToken.ThrowIfCancellationRequested();
        ValidateFileName(fileName);
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

        using var reader = ExcelReaderFactory.CreateReader(fileStream);
        var sheets = new List<SheetPreview>();
        do
        {
            cancellationToken.ThrowIfCancellationRequested();
            sheets.Add(ReadSheet(reader, cancellationToken));
        }
        while (reader.NextResult());

        var selectedSheet = string.IsNullOrWhiteSpace(sheetName)
            ? sheets.FirstOrDefault(sheet => sheet.Headers.Length > 0)
            : sheets.FirstOrDefault(sheet => string.Equals(
                sheet.Name, sheetName.Trim(), StringComparison.OrdinalIgnoreCase));
        if (selectedSheet == null)
        {
            if (string.IsNullOrWhiteSpace(sheetName))
                throw new InvalidDataException("Workbook does not contain a sheet with a detectable header.");
            throw new KeyNotFoundException("The requested worksheet does not exist in this workbook.");
        }
        if (selectedSheet.Headers.Length == 0)
            throw new InvalidDataException("The selected worksheet does not contain a detectable header.");

        var columns = selectedSheet.Headers
            .Select((header, index) => new ExcelColumnMappingDto(
                null,
                header,
                index,
                false,
                null,
                null,
                selectedSheet.SampleRows.Select(row => row[index]).ToArray()))
            .ToArray();
        var sampleRows = selectedSheet.SampleRows
            .Select(row => (IReadOnlyDictionary<string, string>)columns
                .Select((column, index) => new KeyValuePair<string, string>(column.ExcelColumnName, row[index]))
                .ToDictionary(item => item.Key, item => item.Value, StringComparer.Ordinal))
            .ToArray();

        return Task.FromResult(new ExcelPreviewResponse(
            Path.GetFileName(fileName),
            sheets.Select(sheet => sheet.Name).ToArray(),
            selectedSheet.Name,
            selectedSheet.HeaderRowIndex,
            selectedSheet.TotalRows,
            columns,
            sampleRows));
    }

    public async Task<IReadOnlyList<ExcelMappingPresetDto>> GetPresetsAsync(
        Guid? departmentId,
        string? tenantId,
        CancellationToken cancellationToken)
    {
        var query = _db.SysExcelMappings
            .AsNoTracking()
            .Include(mapping => mapping.Details)
            .Where(mapping => !mapping.IsDeleted && mapping.TenantId == tenantId);
        if (departmentId.HasValue)
            query = query.Where(mapping => mapping.DepartmentId == null || mapping.DepartmentId == departmentId);

        var mappings = await query
            .OrderBy(mapping => mapping.MappingName)
            .ThenBy(mapping => mapping.MappingCode)
            .ToListAsync(cancellationToken);
        return mappings.Select(ToDto).ToArray();
    }

    public async Task<ExcelMappingPresetDto?> GetPresetAsync(
        Guid id,
        Guid? departmentId,
        string? tenantId,
        CancellationToken cancellationToken)
    {
        var query = _db.SysExcelMappings
            .AsNoTracking()
            .Include(mapping => mapping.Details)
            .Where(mapping => !mapping.IsDeleted
                && mapping.PublicId == id
                && mapping.TenantId == tenantId);
        if (departmentId.HasValue)
            query = query.Where(mapping => mapping.DepartmentId == null || mapping.DepartmentId == departmentId);

        var mapping = await query.FirstOrDefaultAsync(cancellationToken);
        return mapping == null ? null : ToDto(mapping);
    }

    public async Task<ExcelMappingPresetDto> SavePresetAsync(
        SaveExcelPresetRequest request,
        Guid? effectiveDepartmentId,
        string? tenantId,
        string? userName,
        CancellationToken cancellationToken)
    {
        ValidatePreset(request, tenantId);
        var mappingCode = request.MappingCode.Trim().ToUpperInvariant();
        var normalizedTenantId = Normalize(tenantId);
        if (effectiveDepartmentId.HasValue
            && !await _db.Departments.AnyAsync(
                department => department.PublicId == effectiveDepartmentId
                    && department.IsActive
                    && !department.IsDeleted,
                cancellationToken))
            throw new KeyNotFoundException("The selected department does not exist or is inactive.");

        var exists = await _db.SysExcelMappings.AnyAsync(mapping =>
            !mapping.IsDeleted
            && mapping.MappingCode == mappingCode
            && mapping.TenantId == normalizedTenantId
            && mapping.DepartmentId == effectiveDepartmentId,
            cancellationToken);
        if (exists)
            throw new InvalidOperationException("A preset with this code already exists in the selected scope.");

        var entity = new SysExcelMapping
        {
            MappingCode = mappingCode,
            MappingName = request.MappingName.Trim(),
            TargetEntity = request.TargetEntity.Trim(),
            StartRowIndex = request.StartRowIndex,
            TenantId = normalizedTenantId,
            DepartmentId = effectiveDepartmentId,
            Notes = Normalize(request.Notes),
            CreatedBy = Normalize(userName),
            CreatedByFunction = "SYSTEM.EXCEL.MAPPINGS",
            Details = request.Mappings.Select(item => new SysExcelMappingDetail
            {
                SystemFieldCode = item.SystemFieldCode?.Trim() ?? string.Empty,
                ExcelColumnName = item.ExcelColumnName.Trim(),
                ExcelColumnIndex = item.ExcelColumnIndex,
                IsRequired = item.IsRequired,
                DefaultValue = Normalize(item.DefaultValue),
                TransformRule = Normalize(item.TransformRule),
                CreatedBy = Normalize(userName),
                CreatedByFunction = "SYSTEM.EXCEL.MAPPINGS"
            }).ToList()
        };
        _db.SysExcelMappings.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return ToDto(entity);
    }

    private static SheetPreview ReadSheet(IExcelDataReader reader, CancellationToken cancellationToken)
    {
        var name = reader.Name;
        var leadingRows = new List<string[]>();
        while (leadingRows.Count < HeaderSearchLimit && reader.Read())
        {
            cancellationToken.ThrowIfCancellationRequested();
            leadingRows.Add(ReadValues(reader));
        }

        var headerOffset = ExcelHeaderDetector.FindHeaderRow(leadingRows);
        if (headerOffset < 0)
            return new SheetPreview(name, -1, [], 0, []);

        var rawHeaders = leadingRows[headerOffset];
        var headers = ExcelHeaderDetector.MakeUniqueHeaders(rawHeaders);
        var samples = new List<string[]>();
        var totalRows = 0;
        for (var index = headerOffset + 1; index < leadingRows.Count; index++)
            AddDataRow(leadingRows[index], headers.Length, samples, ref totalRows);

        while (reader.Read())
        {
            cancellationToken.ThrowIfCancellationRequested();
            AddDataRow(ReadValues(reader), headers.Length, samples, ref totalRows);
            if (totalRows > MaxDataRows)
                throw new InvalidDataException($"Workbook exceeds {MaxDataRows} data rows.");
        }

        if (totalRows > MaxDataRows)
            throw new InvalidDataException($"Workbook exceeds {MaxDataRows} data rows.");
        return new SheetPreview(name, headerOffset, headers, totalRows, samples);
    }

    private static void AddDataRow(
        IReadOnlyList<string> values,
        int columnCount,
        ICollection<string[]> samples,
        ref int totalRows)
    {
        var row = Enumerable.Range(0, columnCount)
            .Select(index => index < values.Count ? values[index] : string.Empty)
            .ToArray();
        if (row.All(string.IsNullOrWhiteSpace))
            return;

        totalRows++;
        if (samples.Count < SampleRowLimit)
            samples.Add(row);
    }

    private static string[] ReadValues(IExcelDataReader reader) =>
        Enumerable.Range(0, reader.FieldCount)
            .Select(index => FormatCellValue(reader, index))
            .ToArray();

    private static string FormatCellValue(IExcelDataReader reader, int columnIndex)
    {
        var value = reader.GetValue(columnIndex);
        if (value == null)
            return string.Empty;
        if (value is DateTime dateTime)
            return dateTime.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        if (value is double number)
        {
            var numberFormat = reader.GetNumberFormatString(columnIndex);
            if (!string.IsNullOrEmpty(numberFormat) && numberFormat.All(character => character == '0'))
                return number.ToString(new string('0', numberFormat.Length), CultureInfo.InvariantCulture);
            return number.ToString("0.################", CultureInfo.InvariantCulture);
        }

        return Convert.ToString(value, CultureInfo.InvariantCulture)?.Trim() ?? string.Empty;
    }

    private static void ValidatePreset(SaveExcelPresetRequest request, string? tenantId)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (string.IsNullOrWhiteSpace(request.MappingCode)
            || request.MappingCode.Trim().Length > 50
            || string.IsNullOrWhiteSpace(request.MappingName)
            || request.MappingName.Trim().Length > 200
            || string.IsNullOrWhiteSpace(request.TargetEntity)
            || request.TargetEntity.Trim().Length > 100
            || request.StartRowIndex < 1
            || request.Notes?.Length > 1000
            || tenantId?.Length > 50)
            throw new ArgumentException("The mapping preset fields are invalid.", nameof(request));
        if (request.Mappings == null || request.Mappings.Count is < 1 or > 500)
            throw new ArgumentException("A preset must contain between 1 and 500 column mappings.", nameof(request));
        if (request.Mappings.Any(mapping => mapping == null
                || string.IsNullOrWhiteSpace(mapping.SystemFieldCode)
                || mapping.SystemFieldCode.Trim().Length > 50
                || string.IsNullOrWhiteSpace(mapping.ExcelColumnName)
                || mapping.ExcelColumnName.Trim().Length > 100
                || mapping.ExcelColumnIndex < 0
                || mapping.DefaultValue?.Length > 250
                || mapping.TransformRule?.Length > 100))
            throw new ArgumentException("One or more column mappings are invalid.", nameof(request));
        if (request.Mappings.Select(mapping => mapping.SystemFieldCode?.Trim() ?? string.Empty)
                .Distinct(StringComparer.OrdinalIgnoreCase).Count() != request.Mappings.Count
            || request.Mappings.Select(mapping => mapping.ExcelColumnIndex).Distinct().Count() != request.Mappings.Count)
            throw new ArgumentException("Target fields and Excel column indexes must be unique.", nameof(request));
    }

    private static void ValidateFileName(string fileName)
    {
        var extension = Path.GetExtension(fileName);
        if (!string.Equals(extension, ".xlsx", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(extension, ".xls", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Only .xlsx and .xls files are supported.", nameof(fileName));
    }

    private static ExcelMappingPresetDto ToDto(SysExcelMapping mapping) =>
        new(
            mapping.PublicId,
            mapping.MappingCode,
            mapping.MappingName,
            mapping.TargetEntity,
            mapping.StartRowIndex,
            mapping.TenantId,
            mapping.DepartmentId,
            mapping.Notes,
            mapping.Details
                .OrderBy(detail => detail.ExcelColumnIndex)
                .Select(detail => new ExcelColumnMappingDto(
                    detail.SystemFieldCode,
                    detail.ExcelColumnName,
                    detail.ExcelColumnIndex,
                    detail.IsRequired,
                    detail.DefaultValue,
                    detail.TransformRule))
                .ToArray());

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private sealed record SheetPreview(
        string Name,
        int HeaderRowIndex,
        string[] Headers,
        int TotalRows,
        List<string[]> SampleRows);
}

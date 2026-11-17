using System.ComponentModel.DataAnnotations;

namespace InternLink.Application.DTOs;

/// <summary>One source column and its optional target-field mapping.</summary>
public sealed record ExcelColumnMappingDto(
    string? SystemFieldCode,
    string ExcelColumnName,
    int ExcelColumnIndex,
    bool IsRequired,
    string? DefaultValue,
    string? TransformRule,
    IReadOnlyList<string>? SampleValues = null);

/// <summary>Workbook sheet names, detected header, columns, and sample data.</summary>
public sealed record ExcelPreviewResponse(
    string FileName,
    IReadOnlyList<string> SheetNames,
    string SelectedSheetName,
    int HeaderRowIndex,
    int TotalRows,
    IReadOnlyList<ExcelColumnMappingDto> Columns,
    IReadOnlyList<IReadOnlyDictionary<string, string>> SampleRows);

/// <summary>Row-level issue found while validating an Excel import.</summary>
public sealed record ExcelRowValidationError(
    int RowIndex,
    string FieldCode,
    string ErrorMessage,
    string RawValue,
    string Severity = "Error");

/// <summary>Summary of validation results for an Excel import.</summary>
public sealed record ExcelValidationResult(
    bool IsValid,
    int TotalRecords,
    int ValidRecordsCount,
    int WarningRecordsCount,
    int ErrorRecordsCount,
    IReadOnlyList<ExcelValidationRowDto> Rows,
    IReadOnlyList<ExcelRowValidationError> Errors,
    Guid? ErrorReportId,
    string? ErrorReportUrl = null);

/// <summary>Validation status and issues for a single source row.</summary>
public sealed record ExcelValidationRowDto(
    int RowIndex,
    string Status,
    IReadOnlyList<ExcelRowValidationError> Issues);

/// <summary>Import mapping, file, and department scope submitted for validation.</summary>
public sealed record ExcelImportMappingConfig(
    string TargetEntity,
    int StartRowIndex,
    Guid? DepartmentId,
    string? TenantId,
    string? SheetName,
    IReadOnlyList<ExcelColumnMappingDto> Mappings);

/// <summary>Request to validate a previously uploaded workbook.</summary>
public sealed record ExcelImportRequest(
    Guid FileId,
    ExcelImportMappingConfig MappingConfig);

/// <summary>Request to commit a previously validated workbook.</summary>
public sealed record ExecuteExcelImportRequest(
    Guid FileId,
    ExcelImportMappingConfig MappingConfig,
    bool ConfirmImport);

/// <summary>Result of importing rows into the target entities.</summary>
public sealed record ImportCommitResult(
    int TotalProcessed,
    int SuccessCount,
    int UpdatedCount,
    int ErrorCount,
    Guid? ErrorReportId,
    string? ErrorReportUrl = null,
    IReadOnlyList<string>? AccountProvisioningWarnings = null);

/// <summary>Workbook preview and its opaque, short-lived server-side file identifier.</summary>
public sealed record StagedExcelPreviewResponse(
    Guid FileId,
    ExcelPreviewResponse Preview);

/// <summary>Authorized file path and download name for an import error report.</summary>
public sealed record ExcelErrorReportFile(
    string FilePath,
    string FileName);

/// <summary>Payload for saving a reusable Excel column-mapping preset.</summary>
public sealed record SaveExcelPresetRequest
{
    [Required, MaxLength(50)]
    public required string MappingCode { get; init; }

    [Required, MaxLength(200)]
    public required string MappingName { get; init; }

    [Required, MaxLength(100)]
    public required string TargetEntity { get; init; }

    [Range(1, int.MaxValue)]
    public int StartRowIndex { get; init; } = 2;

    [MaxLength(50)]
    public string? TenantId { get; init; }

    public Guid? DepartmentId { get; init; }

    [MaxLength(1000)]
    public string? Notes { get; init; }

    [Required, MinLength(1), MaxLength(500)]
    public required IReadOnlyList<ExcelColumnMappingDto> Mappings { get; init; }
}

/// <summary>A saved Excel mapping preset and its column definitions.</summary>
public sealed record ExcelMappingPresetDto(
    Guid Id,
    string MappingCode,
    string MappingName,
    string TargetEntity,
    int StartRowIndex,
    string? TenantId,
    Guid? DepartmentId,
    string? Notes,
    IReadOnlyList<ExcelColumnMappingDto> Mappings);

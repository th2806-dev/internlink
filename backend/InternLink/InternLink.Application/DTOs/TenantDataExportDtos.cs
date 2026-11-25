namespace InternLink.Application.DTOs;

/// <summary>A tenant archive stream and its download filename.</summary>
public sealed record TenantDataExportArchive(Stream Content, string FileName);

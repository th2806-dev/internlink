using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

/// <summary>
/// Service interface for Document management operations
/// </summary>
public interface IDocumentService
{
    /// <summary>
    /// Get all documents with pagination
    /// </summary>
    Task<IEnumerable<DocumentListItemDto>> GetAllDocumentsAsync(int skip = 0, int take = 100, Guid? userId = null, bool isLecturerOrAdmin = false);

    /// <summary>
    /// Get documents with filtering, sorting, and pagination
    /// </summary>
    Task<PaginatedResponse<DocumentListItemDto>> GetDocumentsWithFilterAsync(DocumentFilterRequest filter, Guid? userId = null, bool isLecturerOrAdmin = false);

    /// <summary>
    /// Get a specific document by ID
    /// </summary>
    Task<DocumentDetailDto?> GetDocumentByIdAsync(Guid id);
    Task<DocumentDetailDto?> GetDocumentByIdAsync(Guid id, Guid userId, bool isLecturerOrAdmin);

    /// <summary>
    /// Get all documents for a specific internship
    /// </summary>
    Task<IEnumerable<DocumentListItemDto>> GetDocumentsByInternshipAsync(Guid internshipId, int skip = 0, int take = 100, Guid? userId = null, bool isLecturerOrAdmin = false);

    /// <summary>
    /// Create a new document (metadata only). Prefer UploadDocumentAsync for file uploads.
    /// </summary>
    Task<DocumentDetailDto> CreateDocumentAsync(CreateDocumentRequest request, Guid uploadedById);

    /// <summary>
    /// Atomically save file then create a complete Document row (no placeholder metadata).
    /// </summary>
    Task<DocumentDetailDto> UploadDocumentAsync(CreateDocumentRequest request, Stream fileStream, string fileName, Guid uploadedById);

    /// <summary>
    /// Update document metadata
    /// </summary>
    Task<DocumentDetailDto?> UpdateDocumentAsync(Guid id, UpdateDocumentRequest request, Guid? actorUserId = null);

    /// <summary>
    /// Update document with file information after upload
    /// </summary>
    Task<DocumentDetailDto?> UpdateDocumentWithFileAsync(Guid id, string fileName, string filePath, long fileSize, string mimeType);

    /// <summary>
    /// Download document file content
    /// </summary>
    Task<DocumentDownloadDto?> DownloadDocumentAsync(Guid id);
    Task<DocumentDownloadDto?> DownloadDocumentAsync(Guid id, Guid userId, bool isLecturerOrAdmin);

    /// <summary>
    /// Delete a document (soft delete if supported)
    /// </summary>
    Task<bool> DeleteDocumentAsync(Guid id, Guid? actorUserId = null);

    /// <summary>
    /// Save file to disk and return file path
    /// </summary>
    Task<(string FilePath, long FileSize, string MimeType)> SaveFileAsync(Stream fileStream, string originalFileName, Guid internshipId);

    /// <summary>
    /// Delete file from disk
    /// </summary>
    Task<bool> DeleteFileAsync(string filePath);

    /// <summary>
    /// Get document count for an internship
    /// </summary>
    Task<int> GetDocumentCountByInternshipAsync(Guid internshipId, Guid? userId = null, bool isLecturerOrAdmin = false);

    /// <summary>
    /// Get official templates with filtering for Admin, Lecturer, or Student
    /// </summary>
    Task<IEnumerable<DocumentListItemDto>> GetTemplatesAsync(Guid? semesterId = null, string? department = null, string? category = null, bool? isPublishedOnly = null);

    /// <summary>
    /// Get template statistics for Admin dashboard
    /// </summary>
    Task<TemplateStatsDto> GetTemplateStatsAsync();

    /// <summary>
    /// Create an official template (Admin upload)
    /// </summary>
    Task<DocumentDetailDto> CreateTemplateAsync(CreateTemplateRequest request, Guid uploadedByUserId);

    /// <summary>
    /// Update an official template (Admin edit / publish / archive / update file)
    /// </summary>
    Task<DocumentDetailDto?> UpdateTemplateAsync(Guid id, UpdateTemplateRequest request, Guid adminUserId);

    /// <summary>
    /// Increment download count when a template is downloaded
    /// </summary>
    Task IncrementDownloadCountAsync(Guid id);

    /// <summary>
    /// Seed default system templates if not already present
    /// </summary>
    Task SeedDefaultTemplatesAsync();

    /// <summary>
    /// Get version history for a document
    /// </summary>
    Task<IReadOnlyList<DocumentVersionDto>> GetDocumentVersionsAsync(Guid documentId);

    /// <summary>
    /// Download a specific historical version of a document
    /// </summary>
    Task<DocumentDownloadDto?> DownloadDocumentVersionAsync(Guid versionId);
}

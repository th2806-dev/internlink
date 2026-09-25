using AutoMapper;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace InternLink.Infrastructure.Services;

/// <summary>
/// Service for managing Document entities and file operations
/// </summary>
public class DocumentService : IDocumentService
{
    private readonly AppDbContext _db;
    private readonly IMapper _mapper;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<DocumentService> _logger;
    private readonly IGoogleDriveService? _googleDrive;

    private const string UploadFolder = "uploads/documents";
    private static readonly string[] AllowedExtensions =
    {
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt",
        ".jpg", ".jpeg", ".png", ".gif"
    };

    public DocumentService(
        AppDbContext db,
        IMapper mapper,
        IWebHostEnvironment env,
        ILogger<DocumentService>? logger = null)
    {
        _db = db;
        _mapper = mapper;
        _env = env;
        _logger = logger ?? NullLogger<DocumentService>.Instance;
    }

    public DocumentService(
        AppDbContext db,
        IMapper mapper,
        IWebHostEnvironment env,
        IGoogleDriveService googleDrive,
        ILogger<DocumentService>? logger = null)
        : this(db, mapper, env, logger)
    {
        _googleDrive = googleDrive;
    }


    public async Task<IEnumerable<DocumentListItemDto>> GetAllDocumentsAsync(int skip = 0, int take = 100)
    {
        return await GetAllDocumentsAsync(skip, take, null, isLecturerOrAdmin: true);
    }

    public async Task<IEnumerable<DocumentListItemDto>> GetAllDocumentsAsync(int skip = 0, int take = 100, Guid? userId = null, bool isLecturerOrAdmin = false)
    {
        var query = _db.Documents
            .Where(d => !d.IsDeleted)
            .Include(d => d.UploadedBy)
            .Include(d => d.Internship)
                .ThenInclude(i => i.Student)
            .Include(d => d.Internship)
                .ThenInclude(i => i.Lecturer)
            .AsQueryable();

        if (userId.HasValue)
        {
            var isSuperAdmin = await _db.Users
                .AnyAsync(u => u.Id == userId.Value && u.Role == Domain.Enums.Role.SuperAdmin && !u.IsDeleted);

            if (!isSuperAdmin)
            {
                if (isLecturerOrAdmin)
                {
                    query = query.Where(d => d.Internship.Lecturer.UserId == userId.Value || d.UploadedBy.UserId == userId.Value);
                }
                else
                {
                    // Published templates are shared with students; internship-specific access is
                    // still enforced by GetDocumentsByInternshipAsync for private documents.
                    query = query.Where(d => d.IsPublished);
                }
            }
        }

        var documents = await query
            .OrderByDescending(d => d.UploadedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return _mapper.Map<IEnumerable<DocumentListItemDto>>(documents);
    }

    public async Task<PaginatedResponse<DocumentListItemDto>> GetDocumentsWithFilterAsync(DocumentFilterRequest filter)
    {
        return await GetDocumentsWithFilterAsync(filter, null, isLecturerOrAdmin: true);
    }

    public async Task<PaginatedResponse<DocumentListItemDto>> GetDocumentsWithFilterAsync(DocumentFilterRequest filter, Guid? userId = null, bool isLecturerOrAdmin = false)
    {
        var query = _db.Documents
            .Where(d => !d.IsDeleted)
            .Include(d => d.UploadedBy)
            .Include(d => d.Internship)
                .ThenInclude(i => i.Student)
            .Include(d => d.Internship)
                .ThenInclude(i => i.Lecturer)
            .AsQueryable();

        if (userId.HasValue)
        {
            var isSuperAdmin = await _db.Users
                .AnyAsync(u => u.Id == userId.Value && u.Role == Domain.Enums.Role.SuperAdmin && !u.IsDeleted);

            if (!isSuperAdmin)
            {
                if (isLecturerOrAdmin)
                {
                    query = query.Where(d => d.Internship.Lecturer.UserId == userId.Value || d.UploadedBy.UserId == userId.Value);
                }
                else
                {
                    query = query.Where(d => d.Internship.Student.UserId == userId.Value);
                }
            }
        }

        // Apply filters
        if (filter.InternshipId.HasValue)
            query = query.Where(d => d.InternshipId == filter.InternshipId);

        if (!string.IsNullOrWhiteSpace(filter.Category))
            query = query.Where(d => d.Category == filter.Category);

        if (filter.IsRequired.HasValue)
            query = query.Where(d => d.IsRequired == filter.IsRequired.Value);

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var searchLower = filter.SearchTerm.ToLower();
            query = query.Where(d =>
                d.Title.ToLower().Contains(searchLower) ||
                (d.Description != null && d.Description.ToLower().Contains(searchLower)));
        }

        if (filter.UploadedFrom.HasValue)
            query = query.Where(d => d.UploadedAt >= filter.UploadedFrom.Value);

        if (filter.UploadedTo.HasValue)
            query = query.Where(d => d.UploadedAt <= filter.UploadedTo.Value);

        // Apply sorting
        query = ApplySorting(query, filter.SortBy, filter.SortOrder);

        // Get total count
        var totalCount = await query.CountAsync();

        // Apply pagination
        var documents = await query
            .Skip(filter.Skip)
            .Take(filter.Take)
            .ToListAsync();

        var items = _mapper.Map<IEnumerable<DocumentListItemDto>>(documents);

        return new PaginatedResponse<DocumentListItemDto>
        {
            Items = items,
            Total = totalCount,
            Skip = filter.Skip,
            Take = filter.Take
        };
    }

    public async Task<DocumentDetailDto?> GetDocumentByIdAsync(Guid id)
    {
        var document = await _db.Documents
            .Include(d => d.UploadedBy)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

        return document != null ? _mapper.Map<DocumentDetailDto>(document) : null;
    }

    public async Task<DocumentDetailDto?> GetDocumentByIdAsync(Guid id, Guid userId, bool isLecturerOrAdmin)
    {
        var document = await _db.Documents
            .Include(d => d.UploadedBy)
            .Include(d => d.Internship)
                .ThenInclude(i => i.Student)
            .Include(d => d.Internship)
                .ThenInclude(i => i.Lecturer)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

        if (document == null)
            return null;

        if (document.InternshipId == Guid.Empty || document.Internship == null)
            return _mapper.Map<DocumentDetailDto>(document);

        var ownsInternship = document.Internship?.Student?.UserId == userId;
        var isAssignedLecturer = document.Internship?.Lecturer?.UserId == userId;
        var isUploader = document.UploadedBy?.UserId == userId;

        if (!isLecturerOrAdmin && !ownsInternship)
            throw new UnauthorizedAccessException("You do not have access to this document");

        if (isLecturerOrAdmin && !isAssignedLecturer && !isUploader && !ownsInternship)
        {
            var isSuperAdmin = await _db.Users
                .AnyAsync(u => u.Id == userId && u.Role == Domain.Enums.Role.SuperAdmin && !u.IsDeleted);
            if (!isSuperAdmin)
                throw new UnauthorizedAccessException("You do not have access to this document");
        }

        return _mapper.Map<DocumentDetailDto>(document);
    }

    public async Task<IEnumerable<DocumentListItemDto>> GetDocumentsByInternshipAsync(Guid internshipId, int skip = 0, int take = 100, Guid? userId = null, bool isLecturerOrAdmin = false)
    {
        if (userId.HasValue)
        {
            var isSuperAdmin = await _db.Users
                .AnyAsync(u => u.Id == userId.Value && u.Role == Domain.Enums.Role.SuperAdmin && !u.IsDeleted);

            if (!isSuperAdmin)
            {
                var internship = await _db.Internships
                    .Include(i => i.Student)
                    .Include(i => i.Lecturer)
                    .FirstOrDefaultAsync(i => i.Id == internshipId && !i.IsDeleted);

                if (internship == null)
                    return Enumerable.Empty<DocumentListItemDto>();

                var owns = internship.Student?.UserId == userId.Value;
                var assigned = internship.Lecturer?.UserId == userId.Value;

                if (!isLecturerOrAdmin && !owns)
                    throw new UnauthorizedAccessException("You do not have access to documents for this internship");

                if (isLecturerOrAdmin && !assigned && !owns)
                    throw new UnauthorizedAccessException("You do not have access to documents for this internship");
            }
        }

        var documents = await _db.Documents
            .Where(d => d.InternshipId == internshipId && !d.IsDeleted)
            .Include(d => d.UploadedBy)
            .OrderByDescending(d => d.UploadedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return _mapper.Map<IEnumerable<DocumentListItemDto>>(documents);
    }

    public async Task<DocumentDetailDto> CreateDocumentAsync(CreateDocumentRequest request, Guid uploadedById)
    {
        throw new InvalidOperationException(
            "CreateDocumentAsync without a file is not supported. Use UploadDocumentAsync to create a document with file metadata in one step.");
    }

    public async Task<DocumentDetailDto> UploadDocumentAsync(CreateDocumentRequest request, Stream fileStream, string fileName, Guid userId)
    {
        var internship = await _db.Internships
            .Include(i => i.Lecturer)
            .FirstOrDefaultAsync(i => i.Id == request.InternshipId && !i.IsDeleted);
        if (internship == null)
            throw new InvalidOperationException($"Internship with ID {request.InternshipId} not found");

        var isAssignedLecturer = internship.Lecturer?.UserId == userId;
        var isSuperAdmin = await _db.Users.AnyAsync(u => u.Id == userId && u.Role == Domain.Enums.Role.SuperAdmin && !u.IsDeleted);
        if (!isAssignedLecturer && !isSuperAdmin)
            throw new UnauthorizedAccessException("You can only upload documents for internships assigned to you");

        var lecturerId = await _db.Lecturers
            .Where(l => l.UserId == userId && !l.IsDeleted)
            .Select(l => (Guid?)l.Id)
            .FirstOrDefaultAsync();

        var uploaded = _googleDrive != null
            ? await _googleDrive.UploadAsync(fileStream, fileName, GetMimeType(Path.GetExtension(fileName)))
            : null;
        var filePath = uploaded?.WebViewLink ?? "";
        var fileSize = uploaded?.Size ?? fileStream.Length;
        var mimeType = uploaded?.ContentType ?? GetMimeType(Path.GetExtension(fileName));

        var document = new Document
        {
            Id = Guid.NewGuid(),
            InternshipId = request.InternshipId,
            UploadedById = lecturerId,
            Title = request.Title,
            Description = request.Description,
            Category = request.Category,
            IsRequired = request.IsRequired,
            FileName = fileName,
            FilePath = filePath,
            GoogleDriveFileId = uploaded?.FileId,
            MimeType = mimeType,
            FileSize = fileSize,
            UploadedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        _db.Documents.Add(document);

        var version = new DocumentVersion
        {
            Id = Guid.NewGuid(),
            DocumentId = document.Id,
            VersionNumber = 1,
            FileName = fileName,
            FilePath = filePath,
            GoogleDriveFileId = uploaded?.FileId,
            FileSize = fileSize,
            MimeType = mimeType,
            UploadedById = lecturerId,
            UploadedAt = DateTime.UtcNow,
            ChangeNote = "Tải lên lần đầu",
            CreatedAt = DateTime.UtcNow
        };
        _db.DocumentVersions.Add(version);

        await _db.SaveChangesAsync();

        var created = await _db.Documents
            .Include(d => d.UploadedBy)
            .FirstOrDefaultAsync(d => d.Id == document.Id);

        return _mapper.Map<DocumentDetailDto>(created!);
    }

    public async Task<DocumentDetailDto?> UpdateDocumentAsync(Guid id, UpdateDocumentRequest request, Guid? actorUserId = null)
    {
        var document = await _db.Documents
            .Include(d => d.Internship)
                .ThenInclude(i => i.Lecturer)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);
        if (document == null)
            return null;

        if (actorUserId.HasValue)
        {
            var isAssigned = document.Internship?.Lecturer?.UserId == actorUserId.Value;
            var isSuperAdmin = await _db.Users.AnyAsync(u => u.Id == actorUserId.Value && u.Role == Domain.Enums.Role.SuperAdmin && !u.IsDeleted);
            if (!isAssigned && !isSuperAdmin)
                throw new UnauthorizedAccessException("You do not have permission to update this document");
        }

        if (!string.IsNullOrWhiteSpace(request.Title))
            document.Title = request.Title;

        if (request.Description != null)
            document.Description = request.Description;

        if (!string.IsNullOrWhiteSpace(request.Category))
            document.Category = request.Category;

        if (request.IsRequired.HasValue)
            document.IsRequired = request.IsRequired.Value;

        if (request.IsPublished.HasValue)
        {
            document.IsPublished = request.IsPublished.Value;
            document.ArchiveReason = request.IsPublished.Value ? null : request.ArchiveReason;
            document.ArchivedAt = request.IsPublished.Value ? null : DateTime.UtcNow;
            document.ArchivedBy = request.IsPublished.Value ? null : "Giảng viên";
        }

        document.UpdatedAt = DateTime.UtcNow;

        _db.Documents.Update(document);
        await _db.SaveChangesAsync();

        var updated = await _db.Documents
            .Include(d => d.UploadedBy)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

        return _mapper.Map<DocumentDetailDto>(updated);
    }

    public async Task<DocumentDetailDto?> UpdateDocumentWithFileAsync(Guid id, string fileName, string filePath, long fileSize, string mimeType)
    {
        var document = await _db.Documents.FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);
        if (document == null)
            return null;

        document.FileName = fileName;
        document.FilePath = filePath;
        document.FileSize = fileSize;
        document.MimeType = mimeType;
        document.UpdatedAt = DateTime.UtcNow;

        _db.Documents.Update(document);

        var lastVersionNumber = await _db.DocumentVersions
            .Where(v => v.DocumentId == id)
            .MaxAsync(v => (int?)v.VersionNumber) ?? 0;

        var newVersion = new DocumentVersion
        {
            Id = Guid.NewGuid(),
            DocumentId = document.Id,
            VersionNumber = lastVersionNumber + 1,
            FileName = fileName,
            FilePath = filePath,
            FileSize = fileSize,
            MimeType = mimeType,
            UploadedById = document.UploadedById,
            UploadedAt = DateTime.UtcNow,
            ChangeNote = $"Cập nhật tệp phiên bản {lastVersionNumber + 1}",
            CreatedAt = DateTime.UtcNow
        };
        _db.DocumentVersions.Add(newVersion);

        await _db.SaveChangesAsync();

        var updated = await _db.Documents
            .Include(d => d.UploadedBy)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

        return _mapper.Map<DocumentDetailDto>(updated);
    }

    public async Task<DocumentDownloadDto?> DownloadDocumentAsync(Guid id)
    {
        return await DownloadDocumentAsync(id, Guid.Empty, isLecturerOrAdmin: true);
    }

    public async Task<DocumentDownloadDto?> DownloadDocumentAsync(Guid id, Guid userId, bool isLecturerOrAdmin)
    {
        var document = await _db.Documents
            .Include(d => d.Internship)
                .ThenInclude(i => i.Student)
            .Include(d => d.Internship)
                .ThenInclude(i => i.Lecturer)
            .Include(d => d.UploadedBy)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

        if (document == null)
            return null;

        if (userId != Guid.Empty)
        {
            if (document.InternshipId == null)
            {
                if (!isLecturerOrAdmin && !document.IsPublished)
                    throw new UnauthorizedAccessException("Biểu mẫu này chưa được ban hành hoặc đã bị thu hồi.");
            }
            else
            {
                var ownsInternship = document.Internship?.Student?.UserId == userId;
                var isAssignedLecturer = document.Internship?.Lecturer?.UserId == userId;
                var isUploader = document.UploadedBy?.UserId == userId;

                if (!isLecturerOrAdmin && !ownsInternship)
                    throw new UnauthorizedAccessException("You do not have access to this document");

                if (isLecturerOrAdmin && !isAssignedLecturer && !isUploader && !ownsInternship)
                {
                    var isSuperAdmin = await _db.Users
                        .AnyAsync(u => u.Id == userId && u.Role == Domain.Enums.Role.SuperAdmin && !u.IsDeleted);
                    if (!isSuperAdmin)
                        throw new UnauthorizedAccessException("You do not have access to this document");
                }
            }
        }

        if (_googleDrive != null && document.FilePath.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            var content = await _googleDrive.DownloadAsync(document.FilePath);
            document.DownloadCount++;
            document.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return new DocumentDownloadDto { FileContent = content, FileName = document.FileName, MimeType = document.MimeType };
        }

        var normalizedPath = document.FilePath
            .Replace('/', Path.DirectorySeparatorChar)
            .Replace('\\', Path.DirectorySeparatorChar)
            .TrimStart(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);

        string? existingFullPath = null;
        var roots = new[] { GetUploadRoot(), _env.ContentRootPath }
            .Where(r => !string.IsNullOrWhiteSpace(r))
            .Distinct(StringComparer.OrdinalIgnoreCase);

        foreach (var root in roots)
        {
            var p = Path.Combine(root, normalizedPath);
            if (File.Exists(p))
            {
                existingFullPath = p;
                break;
            }
        }

        if (existingFullPath == null)
            return null;

        var fileContent = await File.ReadAllBytesAsync(existingFullPath);
        document.DownloadCount++;
        document.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return new DocumentDownloadDto
        {
            FileContent = fileContent,
            FileName = document.FileName,
            MimeType = document.MimeType
        };
    }

    public async Task<bool> DeleteDocumentAsync(Guid id)
    {
        return await DeleteDocumentAsync(id, null);
    }

    /// <summary>
    /// Kiểm tra người dùng là DepartmentAdmin của khoa sở hữu document/template này.
    /// So khớp qua Department.Code (Document.Department lưu mã khoa dạng string);
    /// template không gắn khoa (null) → chỉ SuperAdmin xóa được (handled by caller).
    /// </summary>
    private async Task<bool> IsDepartmentAdminAllowedAsync(Guid actorUserId, string? documentDepartment)
    {
        if (string.IsNullOrWhiteSpace(documentDepartment))
            return false;

        var adminDeptId = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == actorUserId && u.Role == Domain.Enums.Role.DepartmentAdmin && !u.IsDeleted)
            .Select(u => u.DepartmentId)
            .FirstOrDefaultAsync();
        if (adminDeptId == null)
            return false;

        return await _db.Departments
            .AsNoTracking()
            .AnyAsync(d => d.Id == adminDeptId.Value && !d.IsDeleted && d.Code == documentDepartment.Trim());
    }

    public async Task<bool> DeleteDocumentAsync(Guid id, Guid? actorUserId = null)
    {
        var document = await _db.Documents
            .Include(d => d.Internship)
                .ThenInclude(i => i.Lecturer)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);
        if (document == null)
            return false;

        if (actorUserId.HasValue)
        {
            var isSuperAdmin = await _db.Users.AnyAsync(u => u.Id == actorUserId.Value && u.Role == Domain.Enums.Role.SuperAdmin && !u.IsDeleted);
            if (!isSuperAdmin)
            {
                var isAssigned = document.Internship?.Lecturer?.UserId == actorUserId.Value;

                // DepartmentAdmin được xóa template trong phạm vi khoa của mình — kể cả template
                // do đồng nghiệp cùng khoa tạo (đề xuất P1/P2: sở hữu thuộc về KHOA, không phải cá nhân).
                // Template không gắn khoa (legacy, Department = null) chỉ SuperAdmin xóa được.
                var adminAllowed = await IsDepartmentAdminAllowedAsync(actorUserId.Value, document.Department);

                if (!isAssigned && !adminAllowed)
                    throw new UnauthorizedAccessException("You do not have permission to delete this document");
            }
        }

        document.IsDeleted = true;
        document.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Best-effort: also remove the physical file from disk.
        if (!string.IsNullOrWhiteSpace(document.FilePath))
        {
            try
            {
                await DeleteFileAsync(document.FilePath);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete physical file for document {DocumentId} ({FilePath})", id, document.FilePath);
            }
        }

        return true;
    }

    public async Task<(string FilePath, long FileSize, string MimeType)> SaveFileAsync(Stream fileStream, string originalFileName, Guid internshipId)
    {
        if (fileStream == null || fileStream.Length == 0)
            throw new ArgumentException("File is required and must not be empty");

        // Validate file extension
        var extension = Path.GetExtension(originalFileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
            throw new InvalidOperationException($"File type '{extension}' is not allowed");

        // Create upload directory
        var uploadPath = Path.Combine(GetUploadRoot(), UploadFolder, internshipId.ToString());
        Directory.CreateDirectory(uploadPath);

        // Generate unique filename
        var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileNameWithoutExtension(originalFileName)}{extension}";
        var fullPath = Path.Combine(uploadPath, uniqueFileName);
        var relativePath = Path.Combine(UploadFolder, internshipId.ToString(), uniqueFileName).Replace("\\", "/");

        // Save file
        long fileSize;
        using (var stream = new FileStream(fullPath, FileMode.Create))
        {
            await fileStream.CopyToAsync(stream);
            fileSize = stream.Length;
        }

        // Determine MIME type
        var mimeType = GetMimeType(extension);

        return (relativePath, fileSize, mimeType);
    }

    public async Task<bool> DeleteFileAsync(string filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath))
            return false;

        try
        {
            var normalizedPath = filePath
                .Replace('/', Path.DirectorySeparatorChar)
                .Replace('\\', Path.DirectorySeparatorChar)
                .TrimStart(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);

            var roots = new[] { GetUploadRoot(), _env.ContentRootPath }
                .Where(root => !string.IsNullOrWhiteSpace(root))
                .Distinct(StringComparer.OrdinalIgnoreCase);

            foreach (var root in roots)
            {
                var fullRoot = Path.GetFullPath(root);
                var fullPath = Path.GetFullPath(Path.Combine(fullRoot, normalizedPath));
                if (!fullPath.StartsWith(fullRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
                    continue;

                if (!File.Exists(fullPath))
                    continue;

                File.Delete(fullPath);
                return true;
            }

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete physical file {FilePath}", filePath);
            return false;
        }
    }

    public async Task<int> GetDocumentCountByInternshipAsync(Guid internshipId)
    {
        return await GetDocumentCountByInternshipAsync(internshipId, null, isLecturerOrAdmin: true);
    }

    public async Task<int> GetDocumentCountByInternshipAsync(Guid internshipId, Guid? userId = null, bool isLecturerOrAdmin = false)
    {
        if (userId.HasValue)
        {
            var isSuperAdmin = await _db.Users
                .AnyAsync(u => u.Id == userId.Value && u.Role == Domain.Enums.Role.SuperAdmin && !u.IsDeleted);

            if (!isSuperAdmin)
            {
                var internship = await _db.Internships
                    .Include(i => i.Student)
                    .Include(i => i.Lecturer)
                    .FirstOrDefaultAsync(i => i.Id == internshipId && !i.IsDeleted);

                if (internship == null)
                    return 0;

                var owns = internship.Student?.UserId == userId.Value;
                var assigned = internship.Lecturer?.UserId == userId.Value;

                if (!isLecturerOrAdmin && !owns)
                    throw new UnauthorizedAccessException("You do not have access to documents for this internship");

                if (isLecturerOrAdmin && !assigned && !owns)
                    throw new UnauthorizedAccessException("You do not have access to documents for this internship");
            }
        }

        return await _db.Documents
            .Where(d => d.InternshipId == internshipId && !d.IsDeleted)
            .CountAsync();
    }

    private IQueryable<Document> ApplySorting(IQueryable<Document> query, string? sortBy, string? sortOrder)
    {
        var isDescending = sortOrder?.Equals("desc", StringComparison.OrdinalIgnoreCase) ?? true;

        return (sortBy?.ToLowerInvariant()) switch
        {
            "title" => isDescending ? query.OrderByDescending(d => d.Title) : query.OrderBy(d => d.Title),
            "filesize" => isDescending ? query.OrderByDescending(d => d.FileSize) : query.OrderBy(d => d.FileSize),
            _ => isDescending ? query.OrderByDescending(d => d.UploadedAt) : query.OrderBy(d => d.UploadedAt)
        };
    }

    private string GetUploadRoot() =>
        string.IsNullOrEmpty(_env.WebRootPath) ? _env.ContentRootPath : _env.WebRootPath;

    private string GetMimeType(string extension)
    {
        return extension.ToLowerInvariant() switch
        {
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls" => "application/vnd.ms-excel",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".ppt" => "application/vnd.ms-powerpoint",
            ".pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ".txt" => "text/plain",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            _ => "application/octet-stream"
        };
    }

    public async Task<IEnumerable<DocumentListItemDto>> GetTemplatesAsync(Guid? semesterId = null, string? department = null, string? category = null, bool? isPublishedOnly = null)
    {
        var query = _db.Documents
            .Where(d => !d.IsDeleted && d.InternshipId == null)
            .Include(d => d.Semester)
            .Include(d => d.UploadedBy)
            .AsQueryable();

        if (semesterId.HasValue)
            query = query.Where(d => d.SemesterId == semesterId.Value);

        if (!string.IsNullOrWhiteSpace(department))
            query = query.Where(d => d.Department == null || d.Department == department.Trim());

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(d => d.Category == category.Trim());

        if (isPublishedOnly == true)
            query = query.Where(d => d.IsPublished);

        var docs = await query
            .OrderByDescending(d => d.UploadedAt)
            .ToListAsync();

        return _mapper.Map<IEnumerable<DocumentListItemDto>>(docs);
    }

    public async Task<TemplateStatsDto> GetTemplateStatsAsync()
    {
        var templates = await _db.Documents
            .Where(d => !d.IsDeleted && d.InternshipId == null)
            .ToListAsync();

        return new TemplateStatsDto
        {
            TotalTemplates = templates.Count,
            PublishedCount = templates.Count(t => t.IsPublished),
            ArchivedCount = templates.Count(t => !t.IsPublished),
            TotalDownloads = templates.Sum(t => t.DownloadCount)
        };
    }

    public async Task<DocumentDetailDto> CreateTemplateAsync(CreateTemplateRequest request, Guid uploadedByUserId)
    {
        if (request.File == null || request.File.Length == 0)
            throw new ArgumentException("File is required");

        var lecturer = await _db.Lecturers.FirstOrDefaultAsync(l => l.UserId == uploadedByUserId && !l.IsDeleted);
        Guid? lecturerId = lecturer?.Id;

        using var stream = request.File.OpenReadStream();
        var (filePath, fileSize, mimeType, fileId) = await SaveTemplateFileAsync(stream, request.File.FileName, request.Department);

        var template = new Document
        {
            Id = Guid.NewGuid(),
            InternshipId = null,
            SemesterId = request.SemesterId,
            Department = string.IsNullOrWhiteSpace(request.Department) ? null : request.Department.Trim(),
            Title = string.IsNullOrWhiteSpace(request.Title) ? Path.GetFileNameWithoutExtension(request.File.FileName) : request.Title.Trim(),
            Description = request.Description,
            Category = request.Category,
            Version = string.IsNullOrWhiteSpace(request.Version) ? "1.0" : request.Version.Trim(),
            FileName = request.File.FileName,
            FilePath = filePath,
            GoogleDriveFileId = fileId,
            FileSize = fileSize,
            MimeType = mimeType,
            IsPublished = request.IsPublished,
            PublishedAt = request.IsPublished ? DateTime.UtcNow : null,
            IsRequired = request.IsRequired,
            UploadedById = lecturerId,
            UploadedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        _db.Documents.Add(template);

        var version = new DocumentVersion
        {
            Id = Guid.NewGuid(),
            DocumentId = template.Id,
            VersionNumber = 1,
            FileName = request.File.FileName,
            FilePath = filePath,
            GoogleDriveFileId = fileId,
            FileSize = fileSize,
            MimeType = mimeType,
            UploadedById = lecturerId,
            UploadedAt = DateTime.UtcNow,
            ChangeNote = "Phiên bản biểu mẫu ban đầu",
            CreatedAt = DateTime.UtcNow
        };
        _db.DocumentVersions.Add(version);

        await _db.SaveChangesAsync();

        if (template.SemesterId.HasValue)
        {
            await _db.Entry(template).Reference(t => t.Semester).LoadAsync();
        }
        if (template.UploadedById.HasValue)
        {
            await _db.Entry(template).Reference(t => t.UploadedBy).LoadAsync();
        }

        return _mapper.Map<DocumentDetailDto>(template);
    }

    public async Task<DocumentDetailDto?> UpdateTemplateAsync(Guid id, UpdateTemplateRequest request, Guid adminUserId)
    {
        var template = await _db.Documents
            .Include(d => d.Semester)
            .Include(d => d.UploadedBy)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted && d.InternshipId == null);

        if (template == null)
            return null;

        if (request.SemesterId.HasValue)
            template.SemesterId = request.SemesterId;

        if (request.Department != null)
            template.Department = string.IsNullOrWhiteSpace(request.Department) ? null : request.Department.Trim();

        if (!string.IsNullOrWhiteSpace(request.Title))
            template.Title = request.Title.Trim();

        if (request.Description != null)
            template.Description = request.Description;

        if (request.Category != null)
            template.Category = request.Category;

        if (!string.IsNullOrWhiteSpace(request.Version))
            template.Version = request.Version.Trim();

        if (request.IsRequired.HasValue)
            template.IsRequired = request.IsRequired.Value;

        if (request.IsPublished.HasValue)
        {
            var wasPublished = template.IsPublished;
            template.IsPublished = request.IsPublished.Value;
            if (!wasPublished && template.IsPublished)
            {
                template.PublishedAt = DateTime.UtcNow;
                template.ArchiveReason = null;
                template.ArchivedAt = null;
                template.ArchivedBy = null;
            }
            else if (wasPublished && !template.IsPublished)
            {
                template.ArchiveReason = request.ArchiveReason ?? "Thu hồi / Lưu trữ biểu mẫu";
                template.ArchivedAt = DateTime.UtcNow;
                template.ArchivedBy = adminUserId.ToString();
            }
        }

        if (request.File != null && request.File.Length > 0)
        {
            using var stream = request.File.OpenReadStream();
            var (filePath, fileSize, mimeType, fileId) = await SaveTemplateFileAsync(stream, request.File.FileName, template.Department);
            template.FilePath = filePath;
            template.GoogleDriveFileId = fileId;
            template.FileName = request.File.FileName;
            template.FileSize = fileSize;
            template.MimeType = mimeType;

            var lastVersionNumber = await _db.DocumentVersions
                .Where(v => v.DocumentId == id)
                .MaxAsync(v => (int?)v.VersionNumber) ?? 0;

            var newVersion = new DocumentVersion
            {
                Id = Guid.NewGuid(),
                DocumentId = template.Id,
                VersionNumber = lastVersionNumber + 1,
                FileName = request.File.FileName,
                FilePath = filePath,
                GoogleDriveFileId = fileId,
                FileSize = fileSize,
                MimeType = mimeType,
                UploadedById = template.UploadedById,
                UploadedAt = DateTime.UtcNow,
                ChangeNote = string.IsNullOrWhiteSpace(request.Version) ? $"Cập nhật biểu mẫu phiên bản {lastVersionNumber + 1}" : $"Cập nhật phiên bản {request.Version}",
                CreatedAt = DateTime.UtcNow
            };
            _db.DocumentVersions.Add(newVersion);
        }

        template.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return _mapper.Map<DocumentDetailDto>(template);
    }

    public async Task IncrementDownloadCountAsync(Guid id)
    {
        var doc = await _db.Documents.FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);
        if (doc != null)
        {
            doc.DownloadCount++;
            await _db.SaveChangesAsync();
        }
    }

    private async Task<(string FilePath, long FileSize, string MimeType, string? FileId)> SaveTemplateFileAsync(Stream fileStream, string originalFileName, string? department = null)
    {
        if (fileStream == null || fileStream.Length == 0)
            throw new ArgumentException("File is required and must not be empty");

        var extension = Path.GetExtension(originalFileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
            throw new InvalidOperationException($"File type '{extension}' is not allowed");

        var mimeType = GetMimeType(extension);
        if (_googleDrive != null)
        {
            var uploaded = await _googleDrive.UploadAsync(fileStream, originalFileName, mimeType);
            return (uploaded.WebViewLink, uploaded.Size, uploaded.ContentType, uploaded.FileId);
        }

        var deptFolder = string.IsNullOrWhiteSpace(department) ? "general" : department.Trim().ToLowerInvariant();
        var uploadPath = Path.Combine(GetUploadRoot(), UploadFolder, "templates", deptFolder);
        Directory.CreateDirectory(uploadPath);
        var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileNameWithoutExtension(originalFileName)}{extension}";
        var fullPath = Path.Combine(uploadPath, uniqueFileName);
        var relativePath = Path.Combine(UploadFolder, "templates", deptFolder, uniqueFileName).Replace("\\", "/");
        long fileSize;
        using (var stream = new FileStream(fullPath, FileMode.Create))
        {
            await fileStream.CopyToAsync(stream);
            fileSize = stream.Length;
        }
        return (relativePath, fileSize, mimeType, null);
    }

    public async Task<IReadOnlyList<DocumentVersionDto>> GetDocumentVersionsAsync(Guid documentId)
    {
        var versions = await _db.DocumentVersions
            .Where(v => v.DocumentId == documentId && !v.IsDeleted)
            .OrderByDescending(v => v.VersionNumber)
            .ToListAsync();

        return _mapper.Map<IReadOnlyList<DocumentVersionDto>>(versions);
    }

    public async Task<DocumentDownloadDto?> DownloadDocumentVersionAsync(Guid versionId)
    {
        var version = await _db.DocumentVersions
            .FirstOrDefaultAsync(v => v.Id == versionId && !v.IsDeleted);

        if (version == null)
            return null;

        if (_googleDrive != null && version.FilePath.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            return new DocumentDownloadDto
            {
                FileContent = await _googleDrive.DownloadAsync(version.FilePath),
                FileName = version.FileName,
                MimeType = version.MimeType
            };
        }

        var normalizedPath = version.FilePath
            .Replace('/', Path.DirectorySeparatorChar)
            .Replace('\\', Path.DirectorySeparatorChar)
            .TrimStart(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);

        string? existingFullPath = null;
        var roots = new[] { GetUploadRoot(), _env.ContentRootPath }
            .Where(r => !string.IsNullOrWhiteSpace(r))
            .Distinct(StringComparer.OrdinalIgnoreCase);

        foreach (var root in roots)
        {
            var p = Path.Combine(root, normalizedPath);
            if (File.Exists(p))
            {
                existingFullPath = p;
                break;
            }
        }

        if (existingFullPath == null)
            return null;

        var fileContent = await File.ReadAllBytesAsync(existingFullPath);
        return new DocumentDownloadDto
        {
            FileContent = fileContent,
            FileName = version.FileName,
            MimeType = version.MimeType
        };
    }
}

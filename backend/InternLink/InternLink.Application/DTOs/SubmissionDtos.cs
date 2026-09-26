namespace InternLink.Application.DTOs;

using Microsoft.AspNetCore.Http;

public sealed class CreateSubmissionRequest
{
    public Guid InternshipId { get; set; }
    public string Type { get; set; } = null!;
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? FileName { get; set; }
    public string? FileUrl { get; set; }
}

public sealed class UpdateSubmissionStatusRequest
{
    public string Status { get; set; } = null!;
}

public sealed class ResubmitRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? FileName { get; set; }
    public string? FileUrl { get; set; }
}

public sealed class UpdateFeedbackRequest
{
    public string Comment { get; set; } = null!;
}

public sealed class StudentReplyRequest
{
    public string Comment { get; set; } = null!;
}

/// <summary>Multipart form for student product submission with file.</summary>
public sealed class UploadSubmissionFormRequest
{
    public Guid InternshipId { get; set; }
    public string Type { get; set; } = null!;
    public string? Title { get; set; }
    public string? Description { get; set; }
    public IFormFile? File { get; set; }
}

public sealed class UploadSubmissionBundleFormRequest
{
    public Guid InternshipId { get; set; }
    public string Type { get; set; } = null!;
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? LinksJson { get; set; }
    public List<IFormFile> Files { get; set; } = new();
}

public sealed class SubmissionAssetInput
{
    public string? Label { get; set; }
    public string Url { get; set; } = null!;
}

/// <summary>Multipart form for resubmitting with a new file.</summary>
public sealed class ResubmitSubmissionFormRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public IFormFile? File { get; set; }
}

public sealed class SubmissionFileDownloadDto
{
    public byte[] FileContent { get; set; } = null!;
    public string FileName { get; set; } = null!;
    public string MimeType { get; set; } = "application/octet-stream";
}

public sealed class DownloadSubmissionsZipRequest
{
    public List<Guid> SubmissionIds { get; set; } = new();
}

public sealed class SubmissionZipDownloadDto
{
    public byte[] FileContent { get; set; } = null!;
    public string FileName { get; set; } = "submissions.zip";
}

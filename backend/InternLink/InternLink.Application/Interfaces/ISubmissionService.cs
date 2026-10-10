using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface ISubmissionService
{
    Task<SubmissionDto?> GetByIdAsync(Guid id);
    Task<SubmissionDto?> GetByIdAsync(Guid id, Guid userId, bool isLecturerOrAdmin);
    Task<IEnumerable<SubmissionDto>> GetByInternshipAsync(Guid internshipId);
    Task<IEnumerable<SubmissionDto>> GetByInternshipAsync(Guid internshipId, Guid userId, bool isLecturerOrAdmin);
    Task<IEnumerable<SubmissionDto>> GetMineAsync(Guid userId);
    Task<SubmissionDto> CreateAsync(Guid userId, CreateSubmissionRequest request);
    Task<SubmissionDto> CreateWithFileAsync(Guid userId, CreateSubmissionRequest request, Stream fileStream, string originalFileName);
    Task<SubmissionDto> CreateBundleAsync(Guid userId, CreateSubmissionRequest request, IEnumerable<(Stream Stream, string FileName, long Length, string? ContentType)> files, IEnumerable<SubmissionAssetInput> links);
    Task<SubmissionDto?> ResubmitAsync(Guid id, Guid userId, ResubmitRequest request);
    Task<SubmissionDto?> ResubmitWithFileAsync(Guid id, Guid userId, ResubmitRequest request, Stream fileStream, string originalFileName);
    Task<SubmissionFileDownloadDto?> DownloadFileAsync(Guid submissionId, Guid userId, bool isLecturerOrAdmin);
    Task<SubmissionFileDownloadDto?> DownloadAssetAsync(Guid submissionId, Guid assetId, Guid userId, bool isLecturerOrAdmin);
    Task<SubmissionZipDownloadDto?> DownloadZipAsync(IEnumerable<Guid> submissionIds, Guid userId);
    Task<SubmissionZipDownloadDto?> DownloadInternshipZipAsync(Guid internshipId, Guid userId);
    Task<SubmissionDto?> UpdateStatusAsync(Guid id, UpdateSubmissionStatusRequest request, Guid? actorUserId = null);
    Task<bool> SoftDeleteAsync(Guid id, Guid? actorUserId = null);
    Task<bool> CancelAsync(Guid id, Guid studentUserId);

    Task<IEnumerable<FeedbackDto>> GetFeedbacksAsync(Guid submissionId, Guid userId, bool isLecturer);
    Task<FeedbackDto?> AddFeedbackAsync(Guid submissionId, Guid authorId, CreateFeedbackRequest request);
    Task<FeedbackDto?> UpdateFeedbackAsync(Guid feedbackId, Guid authorId, UpdateFeedbackRequest request);
    Task<FeedbackDto?> AddStudentReplyAsync(Guid submissionId, Guid studentUserId, string comment);
    Task<bool> MarkFeedbacksReadAsync(Guid submissionId, Guid userId, bool isLecturer);
}

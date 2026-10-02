namespace InternLink.Domain.Entities;

public sealed class LecturerActivityLog : BaseEntity
{
    public Guid LecturerId { get; set; }
    public Guid SemesterId { get; set; }
    public Guid? InternshipId { get; set; }
    public Guid? RelatedEntityId { get; set; }
    public Guid? StudentId { get; set; }
    public int? WeekNumber { get; set; }
    public string? StudentCode { get; set; }
    public string? StudentName { get; set; }
    public string? CompanyName { get; set; }
    public string ActivityType { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? Detail { get; set; }
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}
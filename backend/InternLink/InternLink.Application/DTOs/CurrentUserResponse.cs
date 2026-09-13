namespace InternLink.Application.DTOs;

public sealed class CurrentUserResponse
{
    public Guid Id { get; set; }
    public string Username { get; set; } = null!;
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? AvatarUrl { get; set; }
    public string Role { get; set; } = null!;
    public bool IsActive { get; set; }
    public bool MustChangePassword { get; set; }
    public Guid? DepartmentId { get; set; }
}

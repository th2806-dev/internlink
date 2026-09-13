namespace InternLink.Application.DTOs;

public sealed class LoginResponse
{
    public string Token { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiresAt { get; set; }
    public string Role { get; set; } = null!;
    public bool MustChangePassword { get; set; }

    /// <summary>
    /// Department ID for the user. Null for SuperAdmin (sees all departments).
    /// </summary>
    public Guid? DepartmentId { get; set; }
}

using InternLink.Domain.Common;
using InternLink.Domain.Enums;

namespace InternLink.Domain.Entities;

public class User : BaseEntity, IDepartmentScoped
{
    public string Username { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? AvatarUrl { get; set; }
    public Role Role { get; set; }
    public bool IsActive { get; set; } = true;
    public bool MustChangePassword { get; set; }
    public DateTime? LastLoginAt { get; set; }

    /// <summary>
    /// Department this user belongs to.
    /// SuperAdmin → null (sees all departments).
    /// DepartmentAdmin/Lecturer/Student → scoped to this department.
    /// </summary>
    public Guid? DepartmentId { get; set; }
    public Department? Department { get; set; }

    public virtual ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}

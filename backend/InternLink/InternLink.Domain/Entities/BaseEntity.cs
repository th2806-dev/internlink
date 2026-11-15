using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InternLink.Domain.Entities;

public abstract class BaseEntity
{
    [Column("Auto_ID")]
    public long AutoId { get; set; }

    [Column("Public_ID")]
    public Guid PublicId { get; set; } = Guid.NewGuid();

    [NotMapped]
    public Guid Id
    {
        get => PublicId;
        set => PublicId = value;
    }

    private string? _notes;

    [Column("Ghi_Chu")]
    [MaxLength(1000)]
    public string? Notes
    {
        get => _notes;
        set => _notes = value?.Trim();
    }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
    [MaxLength(100)]
    [Column("Created_By_Function")]
    public string? CreatedByFunction { get; set; }

    [MaxLength(100)]
    [Column("Updated_By_Function")]
    public string? UpdatedByFunction { get; set; }

    public bool IsDeleted { get; set; }

    [Column("Deleted_At")]
    public DateTime? DeletedAt { get; set; }

    [MaxLength(100)]
    [Column("Deleted_By")]
    public string? DeletedBy { get; set; }
}

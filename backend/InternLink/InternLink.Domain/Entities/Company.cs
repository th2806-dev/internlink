namespace InternLink.Domain.Entities;

public class Company : BaseEntity
{
    /// <summary>External company code from the official "DANH SÁCH DOANH NGHIỆP LIÊN KẾT" list (like MSSV/MaGV).</summary>
    public string? CompanyCode { get; set; }
    public string CompanyName { get; set; } = null!;
    public string? Address { get; set; }
    public string? Website { get; set; }
    public string? Industry { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public int? Capacity { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Internship> Internships { get; set; } = new List<Internship>();

    /// <summary>Per-semester link status (IsActive = false means "ngưng liên kết").</summary>
    public ICollection<SemesterCompany> SemesterCompanies { get; set; } = new List<SemesterCompany>();

    /// <summary>Recruitment positions offered by this company.</summary>
    public ICollection<CompanyPosition> Positions { get; set; } = new List<CompanyPosition>();
}

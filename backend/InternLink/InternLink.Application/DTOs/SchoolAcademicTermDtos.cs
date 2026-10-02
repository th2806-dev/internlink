namespace InternLink.Application.DTOs;

public sealed class SchoolAcademicTermDto
{
    public Guid Id { get; set; }
    public string AcademicYear { get; set; } = null!;
    public string Term { get; set; } = null!;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TotalWeeks { get; set; }
}

public sealed class SaveSchoolAcademicTermRequest
{
    public string AcademicYear { get; set; } = null!;
    public string Term { get; set; } = null!;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
}

/// <summary>Superadmin tạo nhanh cả năm học gồm 3 học kỳ (HK I, HK II, Hè) một lần duy nhất.</summary>
public sealed class CreateAcademicYearRequest
{
    /// <summary>Niên khóa, ví dụ "2026 - 2027".</summary>
    public string AcademicYear { get; set; } = null!;
    /// <summary>Ngày bắt đầu Học kỳ I.</summary>
    public DateTime Term1Start { get; set; }
    /// <summary>Ngày kết thúc Học kỳ I.</summary>
    public DateTime Term1End { get; set; }
    /// <summary>Ngày bắt đầu Học kỳ II.</summary>
    public DateTime Term2Start { get; set; }
    /// <summary>Ngày kết thúc Học kỳ II.</summary>
    public DateTime Term2End { get; set; }
    /// <summary>Ngày bắt đầu Học kỳ Hè.</summary>
    public DateTime SummerStart { get; set; }
    /// <summary>Ngày kết thúc Học kỳ Hè.</summary>
    public DateTime SummerEnd { get; set; }
}

/// <summary>Kết quả tạo nhanh năm học: từng học kỳ đã tạo kèm số tuần suy ra.</summary>
public sealed class AcademicYearBatchResultDto
{
    public string AcademicYear { get; set; } = null!;
    public List<SchoolAcademicTermDto> Terms { get; set; } = new();
}
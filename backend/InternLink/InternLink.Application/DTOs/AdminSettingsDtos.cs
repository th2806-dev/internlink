namespace InternLink.Application.DTOs;

public class AdminSettingsDto
{
    public string DepartmentName { get; set; } = "Khoa Công nghệ Thông tin";
    public string SupportEmail { get; set; } = "internlink.cntt@gmail.com";
    public string Phone { get; set; } = "0906891704";
    public string Address { get; set; } = "Tòa nhà A, 227 Nguyễn Văn Cừ, Q.5, TP.HCM";
    public int MaxStudentsPerLecturer { get; set; } = 30;
    public string DefaultReportDeadlineDay { get; set; } = "Chủ Nhật (23:59)";
    public int MaxFileSizeMb { get; set; } = 25;
    public bool AllowLateSubmission { get; set; } = true;
    public bool AutoLockSemesterEnd { get; set; } = true;
    public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;
}

public class UpdateAdminSettingsRequest
{
    public string DepartmentName { get; set; } = string.Empty;
    public string SupportEmail { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public int MaxStudentsPerLecturer { get; set; } = 30;
    public string DefaultReportDeadlineDay { get; set; } = "Chủ Nhật (23:59)";
    public int MaxFileSizeMb { get; set; } = 25;
    public bool AllowLateSubmission { get; set; } = true;
    public bool AutoLockSemesterEnd { get; set; } = true;
}

namespace InternLink.Infrastructure.Email;

public sealed class EmailSettings
{
    public const string SectionName = "Email";

    /// <summary>
    /// When true, use SMTP. When false, log emails (dev-friendly).
    /// </summary>
    public bool Enabled { get; set; }

    public string SmtpHost { get; set; } = "localhost";
    public int SmtpPort { get; set; } = 587;
    public bool UseSsl { get; set; } = true;
    public string? Username { get; set; }
    public string? Password { get; set; }

    public string FromAddress { get; set; } = "internlink.cntt@gmail.com";
    public string FromName { get; set; } = "InternLink - Ban Quản lý Thực tập";

    public string PortalUrl { get; set; } = "http://localhost:5173";
    public string PasswordResetPath { get; set; } = "/reset-password";
    public int PasswordResetTokenExpiryHours { get; set; } = 24;
    public string InstitutionName { get; set; } = "Khoa Công nghệ Thông tin";
    public string SupportEmail { get; set; } = "internlink.cntt@gmail.com";
    public string? SupportPhone { get; set; }
}

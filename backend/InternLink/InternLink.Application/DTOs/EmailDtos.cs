namespace InternLink.Application.DTOs;

/// <summary>
/// Role context for invitation / notification emails.
/// </summary>
public enum InvitationRole
{
    Student = 0,
    Lecturer = 1,
    DepartmentAdmin = 2
}

/// <summary>
/// Payload for sending an account invitation email.
/// </summary>
public sealed class InvitationEmailRequest
{
    public string ToEmail { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public InvitationRole Role { get; set; }
    public string Username { get; set; } = null!;
    public string TemporaryPassword { get; set; } = null!;
}

/// <summary>
/// Payload for sending a password reset notification email.
/// </summary>
public sealed class PasswordResetEmailRequest
{
    public string ToEmail { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string Username { get; set; } = null!;
    public string NewPassword { get; set; } = null!;
}

/// <summary>
/// Payload for sending a forgot-password email with reset link.
/// </summary>
public sealed class ForgotPasswordEmailRequest
{
    public string ToEmail { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string ResetLink { get; set; } = null!;
}

/// <summary>
/// Result of an email send attempt.
/// </summary>
public sealed class SendEmailResult
{
    public bool Success { get; set; }
    public string To { get; set; } = null!;
    public string? Message { get; set; }

    public static SendEmailResult Ok(string to, string? message = null) =>
        new() { Success = true, To = to, Message = message ?? "Email sent" };

    public static SendEmailResult Fail(string to, string message) =>
        new() { Success = false, To = to, Message = message };
}

/// <summary>
/// Admin endpoint: send a sample invitation email for testing.
/// </summary>
public sealed class TestEmailRequest
{
    public string ToEmail { get; set; } = null!;
    public string? FullName { get; set; }
    public InvitationRole Role { get; set; } = InvitationRole.Student;
}

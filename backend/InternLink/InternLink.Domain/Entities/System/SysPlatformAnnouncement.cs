using InternLink.Domain.Entities;

namespace InternLink.Domain.Entities.System;

public enum AnnouncementType
{
    Maintenance = 1,
    ReleaseNote = 2,
    SecurityAlert = 3,
    General = 4
}

public enum AnnouncementAudience
{
    AllUsers = 1,
    TenantAdminsOnly = 2
}

public sealed class SysPlatformAnnouncement : TenantScopedEntity
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public AnnouncementType Type { get; set; } = AnnouncementType.General;
    public AnnouncementAudience TargetAudience { get; set; } = AnnouncementAudience.AllUsers;
    public Guid? TargetTenantId { get; set; }
    public DateTime StartsAt { get; set; }
    public DateTime EndsAt { get; set; }
    public bool IsActive { get; set; } = true;
    public bool ShowBanner { get; set; }
}

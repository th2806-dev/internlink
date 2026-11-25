using InternLink.Application.DTOs;
using InternLink.Domain.Entities;
using InternLink.Domain.Entities.System;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Tests.Services;

public sealed class PlatformAnnouncementServiceTests
{
    [Fact]
    public async Task GetActiveBanners_FiltersByWindowAudienceAndTenantAndPrioritizesSecurity()
    {
        await using var context = CreateContext();
        var targetTenantId = Guid.NewGuid();
        var otherTenantId = Guid.NewGuid();
        var now = DateTime.UtcNow;
        context.SysTenants.AddRange(CreateTenant(targetTenantId, "Target Campus"), CreateTenant(otherTenantId, "Other Campus"));
        context.SysPlatformAnnouncements.AddRange(
            CreateAnnouncement("Security", AnnouncementType.SecurityAlert, AnnouncementAudience.AllUsers, null, now),
            CreateAnnouncement("Admins only", AnnouncementType.Maintenance, AnnouncementAudience.TenantAdminsOnly, targetTenantId, now),
            CreateAnnouncement("Other tenant", AnnouncementType.Maintenance, AnnouncementAudience.AllUsers, otherTenantId, now),
            CreateAnnouncement("Upcoming", AnnouncementType.Maintenance, AnnouncementAudience.AllUsers, null, now.AddHours(2)),
            CreateAnnouncement("Inactive", AnnouncementType.Maintenance, AnnouncementAudience.AllUsers, null, now, isActive: false));
        await context.SaveChangesAsync();

        var service = new PlatformAnnouncementService(context);

        var studentBanners = await service.GetActiveBannersAsync(targetTenantId, nameof(Role.Student), CancellationToken.None);
        Assert.Equal(new[] { "Security" }, studentBanners.Select(item => item.Title));

        var adminBanners = await service.GetActiveBannersAsync(targetTenantId, nameof(Role.DepartmentAdmin), CancellationToken.None);
        Assert.Equal(new[] { "Security", "Admins only" }, adminBanners.Select(item => item.Title));
    }

    [Fact]
    public async Task CreateAndToggle_ValidateTargetTenantAndPersistState()
    {
        await using var context = CreateContext();
        var targetTenant = CreateTenant(Guid.NewGuid(), "Target Campus");
        context.SysTenants.Add(targetTenant);
        await context.SaveChangesAsync();
        var service = new PlatformAnnouncementService(context);
        var request = new CreatePlatformAnnouncementRequest
        {
            Title = " Planned Maintenance ",
            Content = "The platform will be updated.",
            Type = "Maintenance",
            TargetAudience = "TenantAdminsOnly",
            TargetTenantId = targetTenant.PublicId,
            StartsAt = DateTimeOffset.UtcNow.AddMinutes(5),
            EndsAt = DateTimeOffset.UtcNow.AddHours(2),
            ShowBanner = true
        };

        var created = await service.CreateAsync(request, Guid.NewGuid(), "127.0.0.1", CancellationToken.None);

        Assert.Equal("Planned Maintenance", created.Title);
        Assert.Equal("Target Campus", created.TargetTenantName);
        Assert.True(created.IsActive);
        Assert.True(created.ShowBanner);

        var toggled = await service.ToggleAsync(created.Id, Guid.NewGuid(), null, CancellationToken.None);

        Assert.NotNull(toggled);
        Assert.False(toggled.IsActive);
        Assert.False(await context.SysPlatformAnnouncements
            .IgnoreQueryFilters()
            .Where(item => item.PublicId == created.Id)
            .Select(item => item.IsActive)
            .SingleAsync());
    }

    [Fact]
    public async Task Create_RejectsInvalidWindowAndUnknownAudience()
    {
        await using var context = CreateContext();
        var service = new PlatformAnnouncementService(context);
        var invalidWindow = ValidRequest() with
        {
            StartsAt = DateTimeOffset.UtcNow.AddHours(2),
            EndsAt = DateTimeOffset.UtcNow.AddHours(1)
        };

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.CreateAsync(invalidWindow, Guid.NewGuid(), null, CancellationToken.None));

        var invalidAudience = ValidRequest() with { TargetAudience = "StudentsOnly" };
        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.CreateAsync(invalidAudience, Guid.NewGuid(), null, CancellationToken.None));
    }

    private static CreatePlatformAnnouncementRequest ValidRequest() => new()
    {
        Title = "Announcement",
        Content = "Content",
        Type = "Maintenance",
        TargetAudience = "AllUsers",
        StartsAt = DateTimeOffset.UtcNow,
        EndsAt = DateTimeOffset.UtcNow.AddHours(1),
        ShowBanner = true
    };

    private static SysPlatformAnnouncement CreateAnnouncement(
        string title,
        AnnouncementType type,
        AnnouncementAudience audience,
        Guid? targetTenantId,
        DateTime startsAt,
        bool isActive = true) => new()
    {
        TenantId = SysTenant.DefaultTenantId,
        Title = title,
        Content = title,
        Type = type,
        TargetAudience = audience,
        TargetTenantId = targetTenantId,
        StartsAt = startsAt,
        EndsAt = startsAt.AddHours(1),
        IsActive = isActive,
        ShowBanner = true
    };

    private static SysTenant CreateTenant(Guid id, string name) => new()
    {
        PublicId = id,
        TenantCode = $"T{id:N}"[..20],
        Name = name,
        LegalName = name,
        Subdomain = $"t{id:N}"[..20],
        ContactEmail = string.Empty,
        ContactPhone = string.Empty
    };

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }
}

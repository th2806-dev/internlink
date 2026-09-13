using System.Security.Cryptography;
using System.Text;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public class AdminNotificationService : IAdminNotificationService
{
    private readonly AppDbContext _db;
    private readonly IRealtimeNotificationService _realtimeService;

    public AdminNotificationService(AppDbContext db, IRealtimeNotificationService realtimeService)
    {
        _db = db;
        _realtimeService = realtimeService;
    }

    public async Task<IReadOnlyList<AdminNotificationCampaignDto>> GetCampaignsAsync(int take = 100)
    {
        take = Math.Clamp(take, 1, 500);

        var notifications = await _db.Notifications
            .AsNoTracking()
            .Where(n => !n.IsDeleted)
            .OrderByDescending(n => n.CreatedAt)
            .Take(take * 20)
            .Include(n => n.User)
            .ToListAsync();

        var campaigns = notifications
            .GroupBy(n => new { n.Title, n.Content })
            .Select(g =>
            {
                var roles = g.Select(x => x.User?.Role).Where(r => r.HasValue).Select(r => r!.Value).Distinct().ToList();
                var audience = InferAudience(roles);
                var latestSentAt = g.Max(x => x.CreatedAt);
                return new AdminNotificationCampaignDto
                {
                    Id = ComputeCampaignId(g.Key.Title, g.Key.Content, latestSentAt),
                    Title = g.Key.Title,
                    Content = g.Key.Content,
                    Audience = audience,
                    RecipientCount = g.Count(),
                    ReadCount = g.Count(x => x.IsRead),
                    SentAt = latestSentAt,
                };
            })
            .OrderByDescending(c => c.SentAt)
            .Take(take)
            .ToList();

        return campaigns;
    }

    public async Task<AdminBroadcastNotificationResultDto> BroadcastAsync(AdminBroadcastNotificationRequest request, Guid? departmentId = null)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new InvalidOperationException("Title is required");
        if (string.IsNullOrWhiteSpace(request.Content))
            throw new InvalidOperationException("Content is required");

        var audience = (request.Audience ?? "all").Trim().ToLowerInvariant();
        var query = _db.Users.Where(u => !u.IsDeleted && u.IsActive);

        query = audience switch
        {
            "student" => query.Where(u => u.Role == Role.Student),
            "lecturer" => query.Where(u => u.Role == Role.Lecturer),
            "all" => query.Where(u => u.Role == Role.Student || u.Role == Role.Lecturer),
            _ => throw new InvalidOperationException("Audience must be all, student, or lecturer")
        };

        // DepartmentAdmin only broadcasts within their own department.
        // SuperAdmin (departmentId = null) reaches everyone.
        if (departmentId.HasValue)
        {
            query = query.Where(u => u.DepartmentId == departmentId.Value);
        }

        var userIds = await query.Select(u => u.Id).ToListAsync();
        if (userIds.Count == 0)
            throw new InvalidOperationException("No recipients found for the selected audience");

        var sentAt = DateTime.UtcNow;
        var title = request.Title.Trim();
        var content = request.Content.Trim();
        var link = string.IsNullOrWhiteSpace(request.Link) ? null : request.Link.Trim();

        var batch = userIds.Select(userId => new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = title,
            Content = content,
            Link = link,
            AttachmentUrl = request.AttachmentUrl,
            AttachmentName = request.AttachmentName,
            IsRead = false,
            CreatedAt = sentAt,
        }).ToList();

        await _db.Notifications.AddRangeAsync(batch);
        await _db.SaveChangesAsync();

        // Dispatch real-time notifications
        var sampleDto = new NotificationDto
        {
            Id = batch.FirstOrDefault()?.Id ?? Guid.NewGuid(),
            Title = title,
            Content = content,
            Link = link,
            IsRead = false,
            CreatedAt = sentAt
        };

        if (audience == "all")
        {
            await _realtimeService.SendToAllAsync(sampleDto);
        }
        else if (audience == "student")
        {
            await _realtimeService.SendToRoleAsync("Student", sampleDto);
        }
        else if (audience == "lecturer")
        {
            await _realtimeService.SendToRoleAsync("Lecturer", sampleDto);
        }

        return new AdminBroadcastNotificationResultDto
        {
            RecipientCount = batch.Count,
            SentAt = sentAt,
        };
    }

    public async Task<int> DeleteCampaignAsync(AdminDeleteNotificationCampaignRequest request)
    {
        var sentAt = request.SentAt.ToUniversalTime();
        var title = request.Title.Trim();
        var content = request.Content.Trim();

        var minTime = sentAt.AddSeconds(-2);
        var maxTime = sentAt.AddSeconds(2);

        var items = await _db.Notifications
            .Where(n =>
                !n.IsDeleted &&
                n.Title == title &&
                n.Content == content &&
                n.CreatedAt >= minTime &&
                n.CreatedAt <= maxTime)
            .ToListAsync();

        if (items.Count == 0)
        {
            // Fallback match on title and content if date is slightly shifted
            items = await _db.Notifications
                .Where(n =>
                    !n.IsDeleted &&
                    n.Title == title &&
                    n.Content == content)
                .ToListAsync();
        }

        if (items.Count == 0)
            return 0;

        var now = DateTime.UtcNow;
        foreach (var item in items)
        {
            item.IsDeleted = true;
            item.UpdatedAt = now;
        }

        await _db.SaveChangesAsync();
        return items.Count;
    }

    private static string ComputeCampaignId(string title, string content, DateTime sentAt)
    {
        // Deterministic hash of the campaign content + send time so the id is stable
        // across requests (used by the client to persist read/deleted state).
        var input = $"{title}|{content}|{sentAt.Ticks}";
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        var hex = Convert.ToHexString(bytes)[..16].ToLowerInvariant();
        return $"campaign-{hex}";
    }

    private static string InferAudience(IReadOnlyList<Role> roles)
    {
        var hasStudent = roles.Contains(Role.Student);
        var hasLecturer = roles.Contains(Role.Lecturer);
        if (hasStudent && hasLecturer) return "all";
        if (hasStudent) return "student";
        if (hasLecturer) return "lecturer";
        return "all";
    }
}

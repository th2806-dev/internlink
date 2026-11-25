using System.Globalization;
using System.Net;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities.Rbac;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace InternLink.Infrastructure.Services;

public sealed class TenantBillingNotificationService(
    AppDbContext context,
    IEmailService emailService,
    ILogger<TenantBillingNotificationService> logger) : ITenantBillingNotificationService
{
    public async Task SendPaymentReceiptAsync(Guid invoiceId, CancellationToken cancellationToken)
    {
        var invoice = await context.SysTenantBillingInvoices
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(item => item.Tenant)
            .FirstOrDefaultAsync(item => item.PublicId == invoiceId && !item.IsDeleted, cancellationToken);
        if (invoice?.Tenant == null)
        {
            logger.LogWarning("Cannot send payment receipt: invoice {InvoiceId} or its tenant was not found.", invoiceId);
            return;
        }

        var licenseValidTo = await context.SysTenantLicenses
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(item => item.TenantId == invoice.TenantId && item.IsActive && !item.IsDeleted)
            .OrderByDescending(item => item.ValidTo)
            .Select(item => (DateTime?)item.ValidTo)
            .FirstOrDefaultAsync(cancellationToken);
        var recipients = await GetRecipientsAsync(invoice.TenantId, invoice.Tenant.ContactEmail, cancellationToken);
        var amount = invoice.AmountVnd.ToString("N0", CultureInfo.GetCultureInfo("vi-VN"));
        var expiry = licenseValidTo.HasValue
            ? licenseValidTo.Value.ToString("dd/MM/yyyy", CultureInfo.GetCultureInfo("vi-VN"))
            : "chưa xác định";
        var tenantName = WebUtility.HtmlEncode(invoice.Tenant.Name);
        var invoiceNumber = WebUtility.HtmlEncode(invoice.InvoiceNumber);
        var planCode = WebUtility.HtmlEncode(invoice.PlanCode);
        var html = $"""
            <h2>Xác nhận thanh toán thành công</h2>
            <p>Đơn vị <strong>{tenantName}</strong> đã thanh toán hóa đơn <strong>{invoiceNumber}</strong>.</p>
            <p>Gói dịch vụ: {planCode}<br />Số tiền: {amount} VNĐ<br />Mã giao dịch: {WebUtility.HtmlEncode(invoice.PaymentReference ?? string.Empty)}</p>
            <p>Bản quyền có hiệu lực đến: {expiry}.</p>
            """;
        var text = $"Đơn vị {invoice.Tenant.Name} đã thanh toán hóa đơn {invoice.InvoiceNumber}. "
            + $"Gói {invoice.PlanCode}, số tiền {amount} VNĐ. Bản quyền có hiệu lực đến {expiry}.";
        await SendToRecipientsAsync(
            recipients,
            $"Xác nhận thanh toán hóa đơn {invoice.InvoiceNumber}",
            html,
            text,
            invoice.TenantId,
            cancellationToken);
    }

    public async Task SendTenantAlertAsync(
        Guid tenantId,
        string title,
        string content,
        CancellationToken cancellationToken)
    {
        var tenant = await context.SysTenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(item => item.PublicId == tenantId && !item.IsDeleted)
            .Select(item => new { item.Name, item.ContactEmail })
            .FirstOrDefaultAsync(cancellationToken);
        if (tenant == null)
        {
            logger.LogWarning("Cannot send tenant alert email: tenant {TenantId} was not found.", tenantId);
            return;
        }

        var recipients = await GetRecipientsAsync(tenantId, tenant.ContactEmail, cancellationToken);
        var safeTitle = WebUtility.HtmlEncode(title);
        var safeTenantName = WebUtility.HtmlEncode(tenant.Name);
        var safeContent = WebUtility.HtmlEncode(content).Replace("\r\n", "<br />").Replace("\n", "<br />");
        await SendToRecipientsAsync(
            recipients,
            $"{title} — {tenant.Name}",
            $"<h2>{safeTitle}</h2><p>{safeTenantName}</p><p>{safeContent}</p>",
            $"{title} — {tenant.Name}\n\n{content}",
            tenantId,
            cancellationToken);
    }

    private async Task<IReadOnlyList<EmailRecipient>> GetRecipientsAsync(
        Guid tenantId,
        string? contactEmail,
        CancellationToken cancellationToken)
    {
        var recipients = new Dictionary<string, EmailRecipient>(StringComparer.OrdinalIgnoreCase);
        if (!string.IsNullOrWhiteSpace(contactEmail))
            recipients[contactEmail.Trim()] = new EmailRecipient(contactEmail.Trim(), "Đại diện đơn vị");

        var admins = await context.SysUsers
            .IgnoreQueryFilters()
            .Where(user => user.TenantId == tenantId
                && user.IsActive
                && !user.IsDeleted
                && user.LegacyUser.IsActive
                && !user.LegacyUser.IsDeleted
                && user.LegacyUser.Email != null
                && user.Roles.Any(userRole => !userRole.IsDeleted
                    && userRole.Role.Code == "DepartmentAdmin"
                    && userRole.Role.IsActive
                    && !userRole.Role.IsDeleted))
            .Select(user => new EmailRecipient(
                user.LegacyUser.Email!,
                user.DisplayName ?? user.UserName))
            .ToListAsync(cancellationToken);

        foreach (var admin in admins)
        {
            if (!string.IsNullOrWhiteSpace(admin.Email))
                recipients[admin.Email.Trim()] = admin with { Email = admin.Email.Trim() };
        }

        return recipients.Values.ToArray();
    }

    private async Task SendToRecipientsAsync(
        IReadOnlyList<EmailRecipient> recipients,
        string subject,
        string html,
        string text,
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        if (recipients.Count == 0)
        {
            logger.LogWarning("No billing email recipients are configured for tenant {TenantId}.", tenantId);
            return;
        }

        foreach (var recipient in recipients)
        {
            try
            {
                var result = await emailService.SendAsync(
                    recipient.Email,
                    subject,
                    html,
                    text,
                    cancellationToken);
                if (!result.Success)
                    logger.LogError(
                        "Billing email delivery failed for tenant {TenantId} and recipient {Recipient}: {Message}",
                        tenantId,
                        recipient.Email,
                        result.Message);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception exception)
            {
                logger.LogError(
                    exception,
                    "Billing email delivery threw for tenant {TenantId} and recipient {Recipient}.",
                    tenantId,
                    recipient.Email);
            }
        }
    }

    private sealed record EmailRecipient(string Email, string Name);
}

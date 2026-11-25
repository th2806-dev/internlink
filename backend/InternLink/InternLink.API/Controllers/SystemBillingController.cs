using InternLink.API.Extensions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.API.Authorization;
using InternLink.Infrastructure.Services;
using InternLink.Shared.Authorization;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace InternLink.API.Controllers;

/// <summary>SuperAdmin operations for tenant billing invoices and VietQR payment instructions.</summary>
[ApiController]
[Route("api/v1/system/billing/invoices")]
[Authorize(Roles = "SuperAdmin")]
public sealed class SystemBillingController(
    ISystemBillingService billingService,
    IBillingPaymentReceiptQueue receiptQueue,
    ILogger<SystemBillingController> logger) : ControllerBase
{
    /// <summary>Gets a filtered page of tenant billing invoices.</summary>
    [HttpGet]
    [RequirePermission(SystemPermissionCodes.BillingView)]
    public async Task<ActionResult<ApiResponse<TenantBillingInvoicePageResponse>>> GetAll(
        [FromQuery] Guid? tenantId,
        [FromQuery] TenantBillingInvoiceStatusFilter? status,
        [FromQuery] DateTimeOffset? fromDate,
        [FromQuery] DateTimeOffset? toDate,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        if (page < 1 || pageSize is < 1 or > 100)
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = "Page phải từ 1 và PageSize từ 1 đến 100." }));

        var invoices = await billingService.GetInvoicesAsync(
            tenantId,
            status,
            fromDate,
            toDate,
            page,
            pageSize,
            cancellationToken);
        return Ok(ApiResponse<TenantBillingInvoicePageResponse>.Ok(invoices));
    }

    /// <summary>Gets a single invoice by its public ID.</summary>
    [HttpGet("{id:guid}")]
    [RequirePermission(SystemPermissionCodes.BillingView)]
    public async Task<ActionResult<ApiResponse<TenantBillingInvoiceResponse>>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var invoice = await billingService.GetInvoiceAsync(id, cancellationToken);
        return invoice == null
            ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy hóa đơn." }))
            : Ok(ApiResponse<TenantBillingInvoiceResponse>.Ok(invoice));
    }

    /// <summary>Creates an invoice for a new or renewed tenant license.</summary>
    [HttpPost]
    [RequirePermission(SystemPermissionCodes.BillingCreate)]
    public async Task<ActionResult<ApiResponse<TenantBillingInvoiceResponse>>> Create(
        [FromBody] CreateTenantBillingInvoiceRequest request,
        CancellationToken cancellationToken)
    {
        var actorId = User.GetUserId();
        if (!actorId.HasValue)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Không xác định được người dùng." }));

        try
        {
            var invoice = await billingService.CreateInvoiceAsync(
                request,
                actorId.Value,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                cancellationToken);
            return CreatedAtAction(
                nameof(GetById),
                new { id = invoice.Id },
                ApiResponse<TenantBillingInvoiceResponse>.Ok(invoice));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }

    /// <summary>Generates an EMVCo VietQR payload for an unpaid VietQR invoice.</summary>
    [HttpGet("{id:guid}/vietqr")]
    [RequirePermission(SystemPermissionCodes.BillingView)]
    public async Task<ActionResult<ApiResponse<VietQrPaymentResponse>>> GetVietQr(
        Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await billingService.GetVietQrAsync(id, cancellationToken);
            return result == null
                ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy hóa đơn." }))
                : Ok(ApiResponse<VietQrPaymentResponse>.Ok(result));
        }
        catch (VietQrConfigurationException exception)
        {
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }

    /// <summary>Marks an invoice as paid and applies the purchased license term.</summary>
    [HttpPost("{id:guid}/mark-paid")]
    [RequirePermission(SystemPermissionCodes.BillingMarkPaid)]
    public async Task<ActionResult<ApiResponse<TenantBillingInvoiceResponse>>> MarkPaid(
        Guid id,
        [FromBody] MarkTenantBillingInvoicePaidRequest request,
        CancellationToken cancellationToken)
    {
        var actorId = User.GetUserId();
        if (!actorId.HasValue)
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Không xác định được người dùng." }));

        try
        {
            var invoice = await billingService.MarkPaidAsync(
                id,
                request.PaymentReference,
                actorId.Value,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                cancellationToken);
            if (invoice != null)
            {
                try
                {
                    receiptQueue.QueuePaymentReceipt(invoice.Id);
                }
                catch (Exception exception)
                {
                    logger.LogError(
                        exception,
                        "Payment for invoice {InvoiceNumber} was applied, but its receipt email could not be queued.",
                        invoice.InvoiceNumber);
                }
            }

            return invoice == null
                ? NotFound(ApiResponse<object>.Fail(new ApiError { Title = "Không tìm thấy hóa đơn." }))
                : Ok(ApiResponse<TenantBillingInvoiceResponse>.Ok(invoice));
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
        catch (ArgumentException exception)
        {
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = exception.Message }));
        }
    }
}

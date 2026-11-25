using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/v1/public/billing/webhook/payment")]
public sealed class BillingPaymentWebhookController(
    IConfiguration configuration,
    ISystemBillingService billingService,
    IBillingPaymentReceiptQueue receiptQueue,
    ILogger<BillingPaymentWebhookController> logger) : ControllerBase
{
    /// <summary>Applies verified incoming bank transfers to matching platform billing invoices.</summary>
    [HttpPost]
    [RequestSizeLimit(65_536)]
    [ProducesResponseType(typeof(ApiResponse<PaymentWebhookResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<ApiResponse<PaymentWebhookResponse>>> Receive(
        [FromBody] JsonElement payload,
        CancellationToken cancellationToken)
    {
        var configuredToken = configuration["Billing:Webhook:Secret"];
        if (string.IsNullOrWhiteSpace(configuredToken))
        {
            logger.LogError("Billing payment webhook is disabled because Billing:Webhook:Secret is not configured.");
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                ApiResponse<object>.Fail(new ApiError { Title = "Webhook thanh toán chưa được cấu hình." }));
        }

        var providedToken = Request.Headers["X-Webhook-Token"].ToString();
        if (!BillingWebhookTokenValidator.IsValid(configuredToken, providedToken))
            return Unauthorized(ApiResponse<object>.Fail(new ApiError { Title = "Thông tin xác thực webhook không hợp lệ." }));

        if (!BillingPaymentWebhookParser.TryParse(payload, out var transactions, out var parseError))
            return BadRequest(ApiResponse<object>.Fail(new ApiError { Title = parseError }));

        var results = new List<PaymentWebhookTransactionResult>(transactions.Count);
        foreach (var transaction in transactions)
        {
            if (!transaction.IsIncoming)
            {
                results.Add(new PaymentWebhookTransactionResult(transaction.TransactionId, "ignored_outgoing", null));
                continue;
            }

            if (!BillingPaymentWebhookParser.TryExtractInvoiceNumber(transaction.Content, out var invoiceNumber))
            {
                logger.LogWarning(
                    "Ignoring bank transaction {TransactionId}: transfer content did not contain exactly one supported invoice reference.",
                    transaction.TransactionId);
                results.Add(new PaymentWebhookTransactionResult(transaction.TransactionId, "unmatched_reference", null));
                continue;
            }

            var result = await billingService.ProcessPaymentWebhookAsync(
                invoiceNumber,
                transaction.AmountVnd,
                transaction.TransactionId,
                cancellationToken);
            var receiptQueued = false;
            if (result.Status == "paid" && result.Invoice != null)
            {
                try
                {
                    receiptQueue.QueuePaymentReceipt(result.Invoice.Id);
                    receiptQueued = true;
                }
                catch (Exception exception)
                {
                    logger.LogError(
                        exception,
                        "Payment for invoice {InvoiceNumber} was applied, but its receipt email could not be queued.",
                        invoiceNumber);
                }
            }
            else if (result.Status is "amount_mismatch" or "invoice_not_payable")
            {
                logger.LogWarning(
                    "Bank transaction {TransactionId} was not applied to invoice {InvoiceNumber}: {Status}.",
                    transaction.TransactionId,
                    invoiceNumber,
                    result.Status);
            }

            results.Add(new PaymentWebhookTransactionResult(
                transaction.TransactionId,
                result.Status,
                result.InvoiceNumber,
                receiptQueued));
        }

        return Ok(ApiResponse<PaymentWebhookResponse>.Ok(new PaymentWebhookResponse(results)));
    }
}

public static class BillingWebhookTokenValidator
{
    public static bool IsValid(string? configuredToken, string? providedToken)
    {
        if (string.IsNullOrWhiteSpace(configuredToken) || string.IsNullOrEmpty(providedToken))
            return false;

        var expectedHash = SHA256.HashData(Encoding.UTF8.GetBytes(configuredToken));
        var providedHash = SHA256.HashData(Encoding.UTF8.GetBytes(providedToken));
        return CryptographicOperations.FixedTimeEquals(expectedHash, providedHash);
    }
}

public static partial class BillingPaymentWebhookParser
{
    private const int MaximumContentLength = 2048;
    private static readonly string[] TransactionIdFields =
        ["transactionId", "transaction_id", "referenceCode", "reference_code", "tid", "id"];
    private static readonly string[] AmountFields =
        ["transferAmount", "transfer_amount", "creditAmount", "credit_amount", "amount"];
    private static readonly string[] ContentFields =
        ["content", "description", "transferContent", "transfer_content", "addDescription", "memo"];
    private static readonly string[] DirectionFields =
        ["transferType", "transfer_type", "direction", "transactionType", "transaction_type", "type"];

    public static bool TryParse(
        JsonElement payload,
        out IReadOnlyList<PaymentWebhookTransaction> transactions,
        out string error)
    {
        transactions = Array.Empty<PaymentWebhookTransaction>();
        error = "Payload webhook phải chứa giao dịch ngân hàng hợp lệ.";

        var candidates = new List<(JsonElement Transaction, JsonElement? Envelope)>();
        if (payload.ValueKind == JsonValueKind.Array)
        {
            candidates.AddRange(payload.EnumerateArray().Select(item => (item, (JsonElement?)null)));
        }
        else if (payload.ValueKind == JsonValueKind.Object)
        {
            if (TryGetProperty(payload, "data", out var data) && data.ValueKind == JsonValueKind.Array)
                candidates.AddRange(data.EnumerateArray().Select(item => (item, (JsonElement?)payload)));
            else if (TryGetProperty(payload, "transactions", out var batch) && batch.ValueKind == JsonValueKind.Array)
                candidates.AddRange(batch.EnumerateArray().Select(item => (item, (JsonElement?)payload)));
            else if (TryGetProperty(payload, "data", out data) && data.ValueKind == JsonValueKind.Object)
                candidates.Add((data, payload));
            else
                candidates.Add((payload, null));
        }

        if (candidates.Count == 0)
        {
            error = "Payload webhook không chứa giao dịch nào.";
            return false;
        }

        var parsed = new List<PaymentWebhookTransaction>(candidates.Count);
        foreach (var (candidate, envelope) in candidates)
        {
            if (!TryParseTransaction(candidate, envelope, out var transaction, out error))
                return false;
            parsed.Add(transaction);
        }

        transactions = parsed;
        error = string.Empty;
        return true;
    }

    public static bool TryExtractInvoiceNumber(string content, out string invoiceNumber)
    {
        var matches = InvoiceReferenceRegex().Matches(content);
        if (matches.Count != 1)
        {
            invoiceNumber = string.Empty;
            return false;
        }

        invoiceNumber = matches[0].Groups[1].Value.ToUpperInvariant();
        return true;
    }

    private static bool TryParseTransaction(
        JsonElement candidate,
        JsonElement? envelope,
        out PaymentWebhookTransaction transaction,
        out string error)
    {
        transaction = null!;
        error = "Giao dịch webhook thiếu mã giao dịch, số tiền hoặc nội dung chuyển khoản hợp lệ.";

        var transactionId = GetString(candidate, TransactionIdFields)
            ?? (envelope.HasValue ? GetString(envelope.Value, TransactionIdFields) : null);
        var content = GetString(candidate, ContentFields)
            ?? (envelope.HasValue ? GetString(envelope.Value, ContentFields) : null);
        var amountElement = GetPropertyValue(candidate, AmountFields);
        if (amountElement == null && envelope.HasValue)
            amountElement = GetPropertyValue(envelope.Value, AmountFields);

        if (string.IsNullOrWhiteSpace(transactionId)
            || transactionId.Length > 100
            || string.IsNullOrWhiteSpace(content)
            || content.Length > MaximumContentLength
            || amountElement == null
            || !TryReadAmount(amountElement.Value, out var amount)
            || amount <= 0
            || decimal.Truncate(amount) != amount)
            return false;

        if (!TryReadDirection(candidate, envelope, out var isIncoming, out error))
            return false;

        transaction = new PaymentWebhookTransaction(transactionId.Trim(), amount, content.Trim(), isIncoming);
        return true;
    }

    private static bool TryReadDirection(
        JsonElement candidate,
        JsonElement? envelope,
        out bool isIncoming,
        out string error)
    {
        isIncoming = false;
        error = "Không xác định được chiều giao dịch; chỉ chấp nhận tiền vào.";

        var incomingFlag = GetPropertyValue(candidate, ["isIncoming", "is_incoming"]);
        if (incomingFlag == null && envelope.HasValue)
            incomingFlag = GetPropertyValue(envelope.Value, ["isIncoming", "is_incoming"]);
        if (incomingFlag?.ValueKind is JsonValueKind.True or JsonValueKind.False)
        {
            isIncoming = incomingFlag.Value.GetBoolean();
            error = string.Empty;
            return true;
        }

        var direction = GetString(candidate, DirectionFields)
            ?? (envelope.HasValue ? GetString(envelope.Value, DirectionFields) : null);
        if (direction == null)
        {
            var amountField = FindPropertyName(candidate, AmountFields)
                ?? (envelope.HasValue ? FindPropertyName(envelope.Value, AmountFields) : null);
            var hasCassoTransactionId = GetString(candidate, ["tid"]) != null;
            if ((amountField != null && amountField.Contains("transfer", StringComparison.OrdinalIgnoreCase))
                || (amountField != null && amountField.Contains("credit", StringComparison.OrdinalIgnoreCase))
                || hasCassoTransactionId)
            {
                isIncoming = true;
                error = string.Empty;
                return true;
            }

            return false;
        }

        var normalized = direction.Trim().ToLowerInvariant();
        if (normalized is "in" or "incoming" or "credit" or "credit_in" or "credit-in" or "deposit")
        {
            isIncoming = true;
            error = string.Empty;
            return true;
        }

        if (normalized is "out" or "outgoing" or "debit" or "debit_out" or "debit-out" or "withdrawal")
        {
            error = string.Empty;
            return true;
        }

        return false;
    }

    private static bool TryReadAmount(JsonElement value, out decimal amount)
    {
        if (value.ValueKind == JsonValueKind.Number)
            return value.TryGetDecimal(out amount);

        if (value.ValueKind == JsonValueKind.String)
            return decimal.TryParse(
                value.GetString(),
                System.Globalization.NumberStyles.Number,
                System.Globalization.CultureInfo.InvariantCulture,
                out amount);

        amount = 0;
        return false;
    }

    private static string? GetString(JsonElement element, IReadOnlyCollection<string> names)
    {
        var value = GetPropertyValue(element, names);
        if (!value.HasValue)
            return null;

        return value.Value.ValueKind switch
        {
            JsonValueKind.String => value.Value.GetString(),
            JsonValueKind.Number => value.Value.GetRawText(),
            _ => null
        };
    }

    private static JsonElement? GetPropertyValue(JsonElement element, IReadOnlyCollection<string> names)
    {
        if (element.ValueKind != JsonValueKind.Object)
            return null;

        foreach (var name in names)
        {
            foreach (var property in element.EnumerateObject())
            {
                if (property.Name.Equals(name, StringComparison.OrdinalIgnoreCase))
                    return property.Value;
            }
        }

        return null;
    }

    private static string? FindPropertyName(JsonElement element, IReadOnlyCollection<string> names)
    {
        if (element.ValueKind != JsonValueKind.Object)
            return null;

        foreach (var name in names)
        {
            foreach (var property in element.EnumerateObject())
            {
                if (property.Name.Equals(name, StringComparison.OrdinalIgnoreCase))
                    return property.Name;
            }
        }

        return null;
    }

    private static bool TryGetProperty(JsonElement element, string name, out JsonElement value)
    {
        foreach (var property in element.EnumerateObject())
        {
            if (property.Name.Equals(name, StringComparison.OrdinalIgnoreCase))
            {
                value = property.Value;
                return true;
            }
        }

        value = default;
        return false;
    }

    [GeneratedRegex(
        @"(?<![A-Z0-9])(?:IL\s+BILLING|ILPAY)\s+(INV-\d{6}-[A-F0-9]{8})(?![A-Z0-9])",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex InvoiceReferenceRegex();
}

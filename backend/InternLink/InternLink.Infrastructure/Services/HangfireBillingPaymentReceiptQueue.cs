using Hangfire;
using Hangfire.Common;
using Hangfire.States;
using InternLink.Application.Interfaces;

namespace InternLink.Infrastructure.Services;

public sealed class HangfireBillingPaymentReceiptQueue(IBackgroundJobClient backgroundJobClient)
    : IBillingPaymentReceiptQueue
{
    public void QueuePaymentReceipt(Guid invoiceId)
    {
        backgroundJobClient.Create(
            Job.FromExpression<ITenantBillingNotificationService>(
                service => service.SendPaymentReceiptAsync(invoiceId, CancellationToken.None)),
            new EnqueuedState());
    }
}

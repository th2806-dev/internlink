namespace InternLink.Shared.Authorization;

public static class SystemPermissionCodes
{
    public const string SystemView = "SYSTEM.VIEW";
    public const string SystemManage = "SYSTEM.MANAGE";

    public const string AccountsView = "ACCOUNTS.VIEW";
    public const string AccountsCreate = "ACCOUNTS.CREATE";
    public const string AccountsUpdate = "ACCOUNTS.UPDATE";
    public const string AccountsDelete = "ACCOUNTS.DELETE";
    public const string AccountsResetPassword = "ACCOUNTS.RESET_PASSWORD";
    public const string AccountsAssignRole = "ACCOUNTS.ASSIGN_ROLE";

    public const string ConfigurationView = "CONFIG.VIEW";
    public const string ConfigurationUpdate = "CONFIG.UPDATE";

    public const string AuditView = "AUDIT.VIEW";
    public const string AuditExport = "AUDIT.EXPORT";
    public const string LecturerExport = "LECTURER.EXPORT";

    public const string ItConfigurationView = "IT_CONFIG.VIEW";
    public const string ItConfigurationUpdate = "IT_CONFIG.UPDATE";
    public const string ItConfigurationTestConnection = "IT_CONFIG.TEST_CONNECTION";
    public const string ExcelImport = "IT_CONFIG.EXCEL_IMPORT";

    public const string ApiWebhookView = "API_WEBHOOK.VIEW";
    public const string ApiWebhookCreate = "API_WEBHOOK.CREATE";
    public const string ApiWebhookUpdate = "API_WEBHOOK.UPDATE";
    public const string ApiWebhookDelete = "API_WEBHOOK.DELETE";
    public const string ApiWebhookTest = "API_WEBHOOK.TEST";
    public const string ApiWebhookRotateSecret = "API_WEBHOOK.ROTATE_SECRET";

    public const string TenantsView = "TENANTS.VIEW";
    public const string TenantsCreate = "TENANTS.CREATE";
    public const string TenantsUpdate = "TENANTS.UPDATE";
    public const string TenantsDelete = "TENANTS.DELETE";
    public const string TenantsExport = "TENANTS.EXPORT";
    public const string TenantsImport = "TENANTS.IMPORT";
    public const string TenantsApprove = "TENANTS.APPROVE";
    public const string TenantsLock = "TENANTS.LOCK";

    public const string LicensesView = "LICENSES.VIEW";
    public const string LicensesCreate = "LICENSES.CREATE";
    public const string LicensesUpdate = "LICENSES.UPDATE";
    public const string LicensesDelete = "LICENSES.DELETE";
    public const string LicensesExport = "LICENSES.EXPORT";
    public const string LicensesImport = "LICENSES.IMPORT";
    public const string LicensesApprove = "LICENSES.APPROVE";
    public const string LicensesLock = "LICENSES.LOCK";

    public const string ApiGatewayView = "API_GATEWAY.VIEW";
    public const string ApiGatewayCreate = "API_GATEWAY.CREATE";
    public const string ApiGatewayUpdate = "API_GATEWAY.UPDATE";
    public const string ApiGatewayDelete = "API_GATEWAY.DELETE";
    public const string ApiGatewayExport = "API_GATEWAY.EXPORT";
    public const string ApiGatewayImport = "API_GATEWAY.IMPORT";
    public const string ApiGatewayApprove = "API_GATEWAY.APPROVE";
    public const string ApiGatewayLock = "API_GATEWAY.LOCK";

    public const string ObservabilityView = "OBSERVABILITY.VIEW";
    public const string ObservabilityCreate = "OBSERVABILITY.CREATE";
    public const string ObservabilityUpdate = "OBSERVABILITY.UPDATE";
    public const string ObservabilityDelete = "OBSERVABILITY.DELETE";
    public const string ObservabilityExport = "OBSERVABILITY.EXPORT";
    public const string ObservabilityImport = "OBSERVABILITY.IMPORT";
    public const string ObservabilityApprove = "OBSERVABILITY.APPROVE";
    public const string ObservabilityLock = "OBSERVABILITY.LOCK";

    public const string SsoHubView = "SSO_HUB.VIEW";
    public const string SsoHubCreate = "SSO_HUB.CREATE";
    public const string SsoHubUpdate = "SSO_HUB.UPDATE";
    public const string SsoHubDelete = "SSO_HUB.DELETE";
    public const string SsoHubTest = "SSO_HUB.APPROVE";

    public const string ComplianceView = "COMPLIANCE.VIEW";
    public const string ComplianceUpdate = "COMPLIANCE.UPDATE";
    public const string ComplianceAnonymize = "COMPLIANCE.APPROVE";

    public const string BillingView = "BILLING.VIEW";
    public const string BillingCreate = "BILLING.CREATE";
    public const string BillingConfigure = "BILLING.UPDATE";
    public const string BillingMarkPaid = "BILLING.APPROVE";

    public const string AnnouncementsView = "ANNOUNCEMENTS.VIEW";
    public const string AnnouncementsCreate = "ANNOUNCEMENTS.CREATE";
    public const string AnnouncementsUpdate = "ANNOUNCEMENTS.UPDATE";

    public const string SecuritySessionsView = "SECURITY_SESSIONS.VIEW";
    public const string SecuritySessionsRevoke = "SECURITY_SESSIONS.UPDATE";
}

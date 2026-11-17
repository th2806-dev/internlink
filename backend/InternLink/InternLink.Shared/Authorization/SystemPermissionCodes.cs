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
}

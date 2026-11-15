# Dynamic RBAC

The initial RBAC rollout adds a permission check alongside the existing role
policies. Existing `[Authorize]` role and department-scope checks remain in
force; an endpoint with `[RequirePermission]` must pass both checks.

## Storage and identity mapping

The five `Sys_*` tables use `Auto_ID` as the clustered primary key and a unique
`Public_ID`. `Sys_Users.Public_ID` also references the matching legacy
`Users.UserId`, so existing JWT subject and name-identifier claims continue to
identify the same account. `Sys_Users.UserName` is unique among active rows;
deleted legacy accounts without an existing RBAC mapping are not imported, so
reused usernames do not block startup seeding.

At API startup, `SystemRbacSeeder` idempotently creates the system roles and
six function-tree roots, initializes default role grants once, and maps legacy
users to their existing role. User creation through `UserManagementService`
creates the RBAC user/role mapping in the same save operation. Startup seeding
does not overwrite customized grants after a role has been initialized.

## Function codes

| Module | Functions |
|---|---|
| `SYSTEM` — Hệ thống | `SYSTEM.VIEW`, `SYSTEM.MANAGE` |
| `ACCOUNTS` — Tài khoản | `ACCOUNTS.VIEW`, `ACCOUNTS.CREATE`, `ACCOUNTS.UPDATE`, `ACCOUNTS.DELETE`, `ACCOUNTS.RESET_PASSWORD`, `ACCOUNTS.ASSIGN_ROLE` |
| `CONFIG` — Cấu hình | `CONFIG.VIEW`, `CONFIG.UPDATE` |
| `AUDIT` — Nhật ký | `AUDIT.VIEW`, `AUDIT.EXPORT` |
| `IT_CONFIG` — Cấu hình IT | `IT_CONFIG.VIEW`, `IT_CONFIG.UPDATE`, `IT_CONFIG.TEST_CONNECTION` |
| `API_WEBHOOK` — API / Webhook | `API_WEBHOOK.VIEW`, `API_WEBHOOK.CREATE`, `API_WEBHOOK.UPDATE`, `API_WEBHOOK.DELETE`, `API_WEBHOOK.TEST`, `API_WEBHOOK.ROTATE_SECRET` |

`SuperAdmin` receives all initial function grants. `DepartmentAdmin` receives
account view/create/update/delete/reset-password grants, excluding role
assignment. Other legacy roles receive no initial administrative grants.

## Protecting an endpoint

Use the shared permission-code constants on controller actions:

```csharp
[RequirePermission(SystemPermissionCodes.AccountsView)]
public Task<IActionResult> GetAll(...)
```

The authorization handler resolves the current user through the GUID identity
claim, then checks active RBAC user, role, grant, and function records in the
database. Missing, disabled, or deleted records do not authorize the request.

Apply database changes with:

```powershell
dotnet ef database update --project backend\InternLink\InternLink.Infrastructure\InternLink.Infrastructure.csproj --startup-project backend\InternLink\InternLink.API\InternLink.API.csproj --context AppDbContext
```

The function catalog is populated when the API starts after migration.

## Dynamic menu and grid metadata

`GET /api/v1/system/functions/my-menu` returns active modules and only the
current user's granted actions. The response is cached in memory per user for
30 minutes. Menu entries intentionally contain function codes, not frontend
routes; the existing six-module catalog does not define route destinations.

`Sys_GridConfigs` stores one column per `(FeatureCode, FieldCode)`. The
authenticated grid-config GET endpoint returns metadata ordered by `SortOrder`.
PUT replaces the submitted layout for that feature: omitted existing columns
are hidden, while submitted columns are inserted or updated. Writes require
`CONFIG.UPDATE`; feature/field codes, widths, formats, colors, and JSON rules
are validated by the API.

The frontend provides `useSystemMenu()` and `PermissionGuard` for permission
aware controls. `DynamicDataGrid` loads per-feature metadata and supports
visibility, order, width, frozen columns, and locale-aware date/number formats.

## Audit and integrations

`Sys_AuditLogs` records CREATE, UPDATE, and SOFT_DELETE changes made through
`AppDbContext.SaveChanges`/`SaveChangesAsync`. Each audit row stores the entity
table and public record ID, changed values, current user, function code, and
request IP when available. Passwords, tokens, credentials, and secret-named
properties are excluded from value snapshots. Audit rows are saved in the same
database operation as the change and are not themselves audited.

`Sys_LoginLogs` records successful and failed password-login attempts with the
attempted username, time, and IP address. `Sys_Webhooks` and `Sys_DailyJobs`
provide persistence for webhook definitions and scheduled-job metadata; this
migration does not add webhook delivery or job scheduling workers.

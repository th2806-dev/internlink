# InternLink - Email and Configuration

**Verified:** 2026-09-08

## Configuration sources

ASP.NET Core reads `appsettings.json`, optional `appsettings.local.json`, and environment variables. Environment variables use the double underscore form, for example `Jwt__Secret` maps to `Jwt:Secret`.

`appsettings.local.json` is ignored and is the preferred local location for secrets when environment variables are inconvenient. Never commit real SMTP credentials.

## Email keys

| Key | Purpose |
|:--|:--|
| `Email:Enabled` | Enable/disable email delivery |
| `Email:SmtpHost` | SMTP host |
| `Email:SmtpPort` | SMTP port |
| `Email:UseSsl` | TLS/SSL behavior |
| `Email:Username` | SMTP account |
| `Email:Password` | SMTP app password or secret |
| `Email:FromAddress` | Sender address |
| `Email:FromName` | Sender display name |
| `Email:PortalUrl` | Link base used in emails |
| `Email:PasswordResetPath` | Reset route |
| `Email:PasswordResetTokenExpiryHours` | Reset token lifetime |
| `Email:SupportEmail` | Support contact |
| `Email:SupportPhone` | Support phone |

## Gmail setup

Use a Gmail App Password, not the normal account password. Email is disabled by default; set `Email:Enabled=true` and configure SMTP credentials only after SMTP connectivity is verified. The admin email test endpoint is `POST /api/SuperAdmin/email/test` and requires SuperAdmin authorization. The test sends a neutral diagnostic message (never a sample invitation password) to the support email currently shown in System Settings.

## Functional behavior

Email-backed workflows include invitation/password-related operations where the service is configured. When email is disabled, the API logs the message for diagnostics and reports delivery as failed; it must not be described as successful external delivery.

## Security

- Use a unique JWT secret of at least 32 characters.
- Use environment variables or an ignored local settings file for SMTP and database credentials.
- Rotate credentials when they have been exposed.
- Do not copy secrets into screenshots, Postman collections or committed docs.

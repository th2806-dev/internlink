# InternLink - Current Implementation

**Verified:** 2026-09-08  
**Status:** authoritative implementation documentation

This directory describes the system that is present in the repository today. When a document conflicts with source code, configuration, migrations, or a verified runtime check, the implementation wins and this documentation must be updated.

## Verified baseline

- Backend: ASP.NET Core and .NET 10, Clean Architecture.
- Frontend: React 19, TypeScript, Vite, Tailwind CSS 4.
- Database: Microsoft SQL Server 2022 with EF Core 10 migrations.
- Authentication: JWT access token plus refresh token.
- Roles: `SuperAdmin`, `Lecturer`, `Student`.
- Runtime: Docker Compose services `frontend`, `backend`, `database`.
- Docker web entrypoint: `http://localhost:8000` (host port 8000 → container port 80).
- Backend internal HTTP port: `8080`; host mapping `127.0.0.1:7109` is loopback-only.
- Database and uploads are persisted in Docker volumes.
- Current seed creates only `admin / Password123!`; it does not create lecturer/student fixture accounts or populated business data.

## Document map

| Document | Purpose |
|:--|:--|
| [01-Architecture.md](01-Architecture.md) | Source and runtime architecture |
| [02-Frontend-Routes.md](02-Frontend-Routes.md) | Browser routes and portal access |
| [03-API-Reference.md](03-API-Reference.md) | Controller and endpoint inventory |
| [04-Domain-Model.md](04-Domain-Model.md) | Domain entities and workflows |
| [05-Database.md](05-Database.md) | Current schema and migrations |
| [06-Storage.md](06-Storage.md) | Upload storage and data lifecycle |
| [07-Development.md](07-Development.md) | Local setup, build and test |
| [08-Operations.md](08-Operations.md) | Compose operations and troubleshooting |
| [09-Demo-Accounts.md](09-Demo-Accounts.md) | Seed data and test fixtures |
| [10-Documentation-Maintenance.md](10-Documentation-Maintenance.md) | Keeping this set accurate |
| [11-Product-Scope.md](11-Product-Scope.md) | Implemented and partial capabilities |
| [12-Email-and-Configuration.md](12-Email-and-Configuration.md) | SMTP and secret configuration |
| [13-Ubuntu-VMware-Demo.md](13-Ubuntu-VMware-Demo.md) | Ubuntu VM and VMware lab deployment |
| [14-Windows-Server-2019-AWS.md](14-Windows-Server-2019-AWS.md) | Native IIS deployment on AWS Windows Server 2019 with DuckDNS and HTTPS |

## Authoritative source locations

- Backend startup: `backend/InternLink/InternLink.API/Program.cs`
- API controllers: `backend/InternLink/InternLink.API/Controllers/`
- Domain entities: `backend/InternLink/InternLink.Domain/Entities/`
- EF context: `backend/InternLink/InternLink.Infrastructure/Persistence/AppDbContext.cs`
- Seed: `backend/InternLink/InternLink.Infrastructure/Persistence/SeedData.cs`
- Migrations: `backend/InternLink/InternLink.Infrastructure/Migrations/`
- Frontend route tree: `frontend/src/routes/AppRoutes.tsx`
- Frontend API clients: `frontend/src/services/` and `frontend/src/lib/apiClient.ts`
- Compose: `docker-compose.yml`
- Nginx routing: `frontend/nginx.conf`

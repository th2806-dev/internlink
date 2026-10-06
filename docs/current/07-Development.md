# InternLink - Development Guide

## Prerequisites

- Node.js compatible with the frontend dependency tree.
- .NET SDK 10.
- SQL Server 2022 for local backend execution, or Docker Desktop for Compose.
- npm and Docker Compose v2 when using containers.

## Frontend

```powershell
cd frontend
npm install
npm run dev
npm run build
npm run typecheck
npm run lint
npm run test
```

The current Vite development server listens on port `3000`. The frontend API base URL is defined in `frontend/src/config/env.ts`; direct local API access may use the backend URL, while Compose publishes the same-origin Nginx proxy on host port `8000`.

## Backend

```powershell
cd backend/InternLink
dotnet restore
dotnet ef database update --project InternLink.Infrastructure --startup-project InternLink.API
dotnet run --project InternLink.API
```

The API loads optional `InternLink.API/appsettings.local.json` for local secrets. This file is ignored and should not be committed. Use a strong JWT secret of at least 32 characters.

## Full workspace

```powershell
npm install
npm run dev
npm run build
npm run lint
npm run test
```

## Tests

```powershell
cd backend/InternLink
dotnet test

cd ../../frontend
npm run test
```

If Vitest worker startup times out on a constrained machine, run a focused test with one worker:

```powershell
npx vitest run src/test/AuthContext.test.tsx --pool=threads --maxWorkers=1
```

## Environment values

Important backend keys include:

- `ConnectionStrings__DefaultConnection`
- `Jwt__Secret`
- `Jwt__Issuer`
- `Jwt__Audience`
- `Email__Enabled`
- `Email__SmtpHost`
- `Email__SmtpPort`
- `Email__Username`
- `Email__Password`
- `Email__FromAddress`
- `Email__PortalUrl`
- `Cors__AllowedOrigins__0`

Use environment variables or the ignored local settings file. Do not place real SMTP credentials in tracked documentation or Compose defaults.

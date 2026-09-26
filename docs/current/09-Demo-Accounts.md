# InternLink - Demo Accounts and Fixtures

**Verified:** 2026-09-26

## Seeding behavior

Startup seeding differs by environment:

- **Production:** seeds only the SuperAdmin account below. Business data is entered manually via the UI.
- **Development (fresh DB only):** after seeding SuperAdmin, runs the full seed — departments, department admins,
  semesters, report schedules, demo lecturers/students/companies/internships, weekly reports and one graded evaluation.
  The full seed never runs when business data already exists (idempotent, never touches real data).

## Seeded accounts (development, fresh DB)

All accounts use password `Password123!` and have `MustChangePassword = false` (no forced password change on login).

| Portal | Username pattern | Example |
|:--|:--|:--|
| SuperAdmin | `admin` | `admin` |
| DepartmentAdmin | `admin-{dept}` | `admin-cntt` |
| Lecturer | `gv{dept}01`, `gv{dept}02` | `gvcntt01` |
| Student | `{dept}sv0001`…`{dept}sv0003` | `cnttsv0001` |

Departments: CNTT, QTKD. Demo data per department: 2 lecturers, 3 students, 2 companies, 3 internships,
report schedules (T1–T5 open, T6 closed for defense, T7 final report), weekly reports (first student fully
submitted T1–T5 + graded 8.6; others T1–T2 with one awaiting review), attendance sessions.

## Reset for a fresh demo

Run `scripts/reset-demo.sql` (wipes business data, keeps nothing), then restart the API so the development
full seed recreates departments, semesters and demo data. See `docs/Demo-UI-Script.md` for the rehearsal checklist.

## Test fixtures

Backend tests create their own in-memory data and must not be confused with runtime demo seed data. Smoke scripts that require lecturer/student users need a fixture setup or an explicit import step before they can run against a clean database.

## Reset warning

Do not delete `internlink_database_data` to obtain demo data. That destroys the database. To reset a disposable environment, back up first, intentionally remove the volume, start the API so migrations and the admin seed run, then import documented fixture data.

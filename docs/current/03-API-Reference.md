# InternLink - API Reference

**Base URL:** `http://localhost:8000/api` through Nginx
**Direct backend:** internal container port `8080`; host port `7109` is bound to host loopback only
**Verified:** 2026-09-08

## Conventions

- JSON endpoints use the shared `ApiResponse<T>` wrapper.
- Protected endpoints require `Authorization: Bearer <access-token>`.
- Login, refresh, forgot-password and reset-password are public.
- File upload endpoints use `multipart/form-data`.
- Download and export endpoints return binary responses.
- IDs are GUIDs unless noted otherwise.

## Authentication - `/api/Auth`

| Verb | Endpoint |
|:--|:--|
| POST | `/login` |
| POST | `/refresh-token` |
| POST | `/revoke-token` |
| POST | `/revoke-all` |
| POST | `/logout` |
| GET | `/me` |
| GET | `/sessions` |
| GET | `/activity` |
| POST | `/change-password` |
| POST | `/forgot-password` |
| POST | `/reset-password` |
| POST | `/avatar` |

## Admin API

| Controller | Endpoints |
|:--|:--|
| `/api/Admin` | `GET internship-stats`; `POST email/test` |
| `/api/Admin/users` | `GET`, `GET {id}`, `POST`, `PUT {id}`, `POST {id}/reset-password`, `DELETE {id}` |
| `/api/Admin/students` | `GET`, `POST search`, `GET {id}`, `GET by-number/{studentCode}`, `GET check/{studentCode}`, `POST`, `PUT {id}`, `DELETE {id}`, `GET import/template`, `POST import`, `GET export` |
| `/api/Admin/lecturers` | Lecturer management is exposed through `/api/LecturerProfile` and lecturer controller operations |
| `/api/Admin/companies` | `GET`, `POST search`, `GET active`, `GET {id}`, `GET {id}/detail`, `GET by-industry/{industry}`, `GET check/{name}`, `POST`, `PUT {id}`, `PUT {id}/semester/{semesterId}`, `DELETE {id}`, `GET import/template`, `POST import`, `GET export` |
| `/api/Admin/semesters` | `GET`, `GET {id}`, `POST`, `PUT {id}`, `POST {id}/close`, `POST {id}/start`, `DELETE {id}` |
| `/api/Admin/assignments` | `POST`, `GET`, `GET by-lecturer/{lecturerId}`, `DELETE`, `GET history`, `GET export`, `POST auto`, `GET template`, `POST import`, `GET company-allocation`, `GET company-allocation/template`, `POST company-allocation/import`, `GET company-allocation/export` |
| `/api/Admin/account-requests` | `GET`, `GET {id}`, `POST`, `POST {id}/process`, `GET pending-count` |
| `/api/Admin/semesters/{semesterId}/rubric` | `GET`, `POST`, `PUT`, `DELETE`, `POST submit`, `POST approve`, `POST reject` |
| `/api/Admin/notifications` | `GET`, `POST broadcast`, `DELETE campaign` |
| `/api/Admin/settings` | `GET`, `PUT`, `POST reset` |

The semester controller also exposes the management routes under `/api/Semesters`.

## Shared lookup and portal API

| Controller | Endpoints |
|:--|:--|
| `/api/Company` | `GET`, `POST search`, `GET active`, `GET {id}`, `GET by-industry/{industry}`, `GET check/{name}` |
| `/api/Student` | `GET`, `POST search`, `GET {id}`, `GET by-number/{studentCode}`, `GET check/{studentCode}` |
| `/api/Semesters` | `GET current` |
| `/api/StudentPortal` | `GET me`, `PUT me`, `GET internship-certificate` |
| `/api/Notification` | `GET mine`, `GET unread-count`, `POST mark-read/{id}`, `POST mark-all-read` |

## Lecturer API

`/api/Lecturer` provides `GET/PUT me`, `GET dashboard`, `GET stats`, weekly trend, grade distribution, company/activity analytics, enterprise/company/student/internship lists and details, notes, reminders, notifications, submissions and ZIP download, weekly report review, evaluations, defense, documents, exports and AI comment generation.

Additional rubric endpoints under `/api/Lecturer` are `GET rubric`, `POST evaluation/scores`, `PUT evaluation/{evaluationId}/scores`, `GET evaluation/{evaluationId}/scores` and `GET evaluation-students`.

`/api/LecturerProfile` provides `GET`, `GET {id}`, `GET {id}/overview`, `POST`, `PUT {id}`, `DELETE {id}`, `GET import/template`, `POST import`, `GET export`.

## Student and workflow API

| Controller | Endpoints |
|:--|:--|
| `/api/Internship` | `GET`, `POST search`, `GET {id}`, `GET student/{studentId}`, `GET company/{companyId}`, `GET status/{status}`, `POST`, `PUT {id}`, `PUT {id}/company`, `PATCH {id}/status`, `DELETE {id}`, `GET stats/overview`, `GET student/{studentId}/has-active` |
| `/api/Submission` | `GET {id}`, `GET internship/{internshipId}`, `GET mine`, `POST`, `POST upload`, `POST bundle`, `POST {id}/resubmit`, `POST {id}/resubmit-upload`, `GET {id}/download`, `GET {id}/assets/{assetId}/download`, `PATCH {id}/status`, `DELETE {id}`, `GET {id}/feedbacks`, `POST {id}/feedback`, `POST {id}/student-reply`, `POST {id}/feedback/read` |
| `/api/WeeklyReport` | `GET {id}`, `GET mine`, `GET internship/{internshipId}`, `POST`, `POST upload`, `PUT {id}`, `PUT {id}/upload`, `GET {id}/download`, `GET {id}/versions`, `GET versions/{versionId}/download`, `POST {id}/submit`, `POST {id}/student-reply`, `POST {id}/feedback/read`, `POST {id}/review`, `DELETE {id}` |
| `/api/Document` | `GET`, `POST filter`, `GET {id}`, `GET internship/{internshipId}`, `POST upload`, `PUT {id}`, `GET {id}/download`, `DELETE {id}`, `GET internship/{internshipId}/count` |
| `/api/Evaluation` | `GET`, `POST filter`, `GET {id}`, `GET {id}/scores`, `GET rubric`, `GET internship/{internshipId}`, `GET student/{studentId}`, `GET company/{companyId}`, `POST`, `PUT {id}`, `POST {id}/finalize`, `DELETE {id}`, `GET company/{companyId}/average-grade`, `GET internship/{internshipId}/exists`, `GET statistics/summary` |
| `/api/Feedback` | `PUT {id}` |
| `/api/Export` | `GET internship-excel`, `GET lecturer-internship-excel`, `GET summary-report`, `GET summary-report/word` |

## Health and real-time

- `GET /health` returns aggregate health.
- `GET /health/live` checks process liveness.
- `GET /health/ready` checks readiness, including database connectivity.
- SignalR hub: `/hubs/notifications`.

The definitive authorization attributes and request DTO fields are in the controller and DTO source files. This document is an inventory, not a substitute for generated OpenAPI/Swagger output.

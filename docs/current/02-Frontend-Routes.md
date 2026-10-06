# InternLink - Frontend Routes

**Source:** `frontend/src/routes/AppRoutes.tsx`  
**Verified:** 2026-09-08

## Public routes

| Route | Purpose |
|:--|:--|
| `/login` | Login and role-aware redirect |
| `/forgot-password` | Request password reset |
| `/reset-password` | Set a new password from reset token |
| `/change-password` | Change a temporary/required password |

## Admin portal

| Route | Purpose |
|:--|:--|
| `/admin/dashboard` | Operational dashboard |
| `/admin/companies` | Company management |
| `/admin/companies/:id` | Company detail |
| `/admin/users` | User management |
| `/admin/semesters` | Semester management |
| `/admin/assignments` | Lecturer/student/company assignment |
| `/admin/lecturers` | Lecturer management |
| `/admin/students` | Student management |
| `/admin/account-requests` | Account request processing |
| `/admin/notifications` | Notification campaigns |
| `/admin/settings` | System settings |
| `/admin/account` | Admin profile, security, sessions and activity |

Admin routes require the mapped `admin` role, backed by `SuperAdmin` authorization in the API.

## Lecturer portal

| Route | Purpose |
|:--|:--|
| `/lecturer/dashboard` | Lecturer dashboard |
| `/lecturer/students` | Assigned students |
| `/lecturer/students/:internshipId` | Student/internship workspace |
| `/lecturer/enterprises` | Companies |
| `/lecturer/enterprises/:companyId` | Company detail |
| `/lecturer/templates` | Documents/templates |
| `/lecturer/evaluations` | Evaluation list |
| `/lecturer/evaluations/:internshipId` | Evaluation workspace |
| `/lecturer/reports` | Weekly report review |
| `/lecturer/analytics` | Analytics |
| `/lecturer/notifications` | Notifications |
| `/lecturer/account` | Lecturer account |
| `/lecturer/export` | Redirects to evaluations/export workflow |

## Student portal

| Route | Purpose |
|:--|:--|
| `/student/dashboard` | Student dashboard |
| `/student/internship` | Internship profile |
| `/student/weekly-reports` | Weekly reports |
| `/student/submissions` | Submission assets and versions |
| `/student/feedback` | Feedback |
| `/student/templates` | Documents/templates |
| `/student/evaluation` | Evaluation result |
| `/student/notifications` | Notifications |
| `/student/account` | Student account |

## Navigation rules

- A stored access token is validated through `/api/Auth/me` during bootstrap.
- Unauthenticated users are redirected to `/login`.
- A protected route remembers the requested path and returns there after login.
- Unknown portal routes fall back to that portal dashboard.
- Role mapping is defined in `frontend/src/lib/roleMap.ts`.
- Development Vite uses port `3000` according to `frontend/package.json`; production Docker exposes host port `8000` through Nginx.

<!-- LEGACY: bộ tài liệu thiết kế ban đầu. Bản CẬP NHẬT theo code nằm ở docs/current/ — ưu tiên dùng docs/current/. -->
<!-- STATUS: LEGACY -->

# Application Flow

**Project:** InternLink – Internship Management & Collaboration Platform

**Version:** 2.0

**Status:** Active — aligned with MVP + SuperAdmin module

**Detail flows:** [`images/application-flow/`](images/application-flow/) · **Sequences:** [`images/sequence/`](images/sequence/)

---

# 1. Overview

Application Flow mô tả thao tác trên UI — cơ sở wireframe và gắn API.

Ba nhóm: **SuperAdmin**, **Lecturer**, **Student**.

---

# 2. Global Auth Flow

```text
Login
  ├─ success + MustChangePassword=true → Change Password → Home by role
  ├─ success → Home by role (Admin | Lecturer | Student)
  └─ Forgot password → email link → Reset password → Login
```

---

# 3. SuperAdmin Flows

```text
Admin Dashboard
  ├── Students (list → create/import → invitation)
  ├── Lecturers (list → create/import → invitation)
  ├── Companies (list → create/import)
  ├── Users (list → create / deactivate / reset password)
  └── Assignments (select GV → chọn SV → bulk assign → xem by lecturer)
```

| Flow file | Mô tả |
|-----------|--------|
| [`admin-import-invite.md`](images/application-flow/admin-import-invite.md) | Import/tạo SV + email mời |
| [`admin-bulk-assign.md`](images/application-flow/admin-bulk-assign.md) | Gán SV → GV |
| [`forgot-password.md`](images/application-flow/forgot-password.md) | Quên MK (mọi role) |

API sequences: `invitation-email.md`, `bulk-assign.md`, `forgot-password.md` trong `images/sequence/`.

---

# 4. Lecturer Flows

```text
Lecturer Dashboard
  → Internships (assigned)
      → Detail
          → Assign / change company
          → Review weekly reports
          → Review submissions → Feedback
          → Evaluation → Finalize
  → Students / Companies (read-only browse)
  → Documents
  → Export end-of-term
  → Notifications / Account
```

Existing detail diagrams (vẫn dùng được):

- `lecturer-review-submission.md`, `lecturer-review-report.md`
- `lecturer-evaluation.md`, `lecturer-upload-document.md`
- `lecturer-login.md`

**Deprecated UI intent:** `lecturer-manage-students.md` / `lecturer-manage-company.md` — nếu giữ, chỉ còn **view**; write nằm ở Admin.

---

# 5. Student Flows

```text
Student Dashboard
  → Internship status
  → Weekly Report (draft → submit)
  → Submission / Product upload
  → Feedback → Resubmit if needed
  → Documents / Notifications / Account
```

Existing: `student-weekly-report.md`, `student-submission.md`, `student-feedback.md`, `student-resubmission.md`, …

---

# 6. Cross-cutting

| Event | UI reaction |
|-------|-------------|
| Notification click | Deep-link entity |
| 401 JWT expired | Redirect login |
| 403 Admin API as Lecturer | Show forbidden |
| Email disabled (dev) | Ops check server logs for invitation/reset |

---

# 7. Summary

| Portal | Primary path |
|--------|----------------|
| SuperAdmin | Data → Accounts → Assign |
| Lecturer | Assigned internships → Review → Grade → Export |
| Student | Submit → Feedback loop |

Wireframe frontend nên bám sitemap `07a` + 3 flow Admin mới ở trên.

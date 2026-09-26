<!-- LEGACY: bộ tài liệu thiết kế ban đầu. Bản CẬP NHẬT theo code nằm ở docs/current/ — ưu tiên dùng docs/current/. -->
<!-- STATUS: LEGACY -->

# InternLink — Sơ Đồ Thực Thể Quan Hệ (Entity Relationship Diagram)

**Dự án:** InternLink — Nền tảng Quản lý và Giám sát Thực tập Tốt nghiệp  
**Phiên bản:** 4.0  
**Ngày cập nhật:** Tháng 9/2026

---

## 1. Sơ Đồ ERD Chi Tiết (18 Bảng)

```mermaid
erDiagram
    Users ||--o| Students : "has profile"
    Users ||--o| Lecturers : "has profile"
    Users ||--o{ RefreshTokens : "owns"
    Users ||--o{ PasswordResetTokens : "requests"
    Users ||--o{ Notifications : "receives"
    Users ||--o{ AccountRequests : "submits"

    Semesters ||--o{ Internships : "contains"
    Semesters ||--o{ EvaluationRubrics : "has"

    Students ||--o{ Internships : "participates in"
    Lecturers ||--o{ Internships : "supervises"
    Companies ||--o{ Internships : "hosts"

    Internships ||--o{ WeeklyReports : "has"
    Internships ||--o{ Submissions : "has"
    Internships ||--o| Evaluations : "evaluated"
    Internships ||--o{ Documents : "has"

    Submissions ||--o{ Feedbacks : "receives"
    Feedbacks }o--o| Lecturers : "created by (nullable)"

    EvaluationRubrics ||--o{ EvaluationRubricCriteria : "contains"

    Users {
        uuid Id PK
        string Username UK
        string PasswordHash
        string Email
        string FullName
        int Role
        bool MustChangePassword
        bool IsActive
        datetime LastLoginAt
        bool IsDeleted
        datetime CreatedAt
    }

    Semesters {
        uuid Id PK
        string Name
        string Term
        string AcademicYear
        datetime StartDate
        datetime EndDate
        int Status
        int MaxStudentsPerLecturer
        bool IsDeleted
    }

    Students {
        uuid Id PK
        uuid UserId FK
        string StudentCode UK
        string FullName
        string Email
        string Phone
        string Class
        string Major
        bool IsDeleted
    }

    Lecturers {
        uuid Id PK
        uuid UserId FK
        string StaffCode UK
        string FullName
        string Email
        string Phone
        string Department
        bool IsDeleted
    }

    Companies {
        uuid Id PK
        string CompanyName
        string Address
        string Industry
        string Website
        string ContactPerson
        string ContactEmail
        string ContactPhone
        int Capacity
        bool IsActive
        bool IsDeleted
    }

    Internships {
        uuid Id PK
        uuid StudentId FK
        uuid CompanyId FK
        uuid LecturerId FK
        uuid SemesterId FK
        datetime StartDate
        datetime EndDate
        int Status
        string Position
        string SupervisorName
        string Notes
        bool IsDeleted
    }

    WeeklyReports {
        uuid Id PK
        uuid InternshipId FK
        int WeekNumber
        string Title
        string Content
        int Status
        string LecturerComment
        datetime SubmittedAt
        bool IsDeleted
    }

    Submissions {
        uuid Id PK
        uuid InternshipId FK
        int Type
        string Title
        string Description
        int Version
        string FileName
        string FileUrl
        long FileSize
        int Status
        datetime SubmittedAt
        bool IsDeleted
    }

    Feedbacks {
        uuid Id PK
        uuid SubmissionId FK
        uuid LecturerId FK "nullable"
        string Comment
        bool IsPublic
        datetime CreatedAt
    }

    Evaluations {
        uuid Id PK
        uuid InternshipId FK
        uuid EvaluatedById FK
        int TechnicalScore
        int CommunicationScore
        int TeamworkScore
        int InitiativeScore
        decimal FinalGrade
        string Comments
        bool IsFinalized
        uuid RubricId FK
        string CriteriaScoresJson
        bool IsDeleted
    }

    EvaluationRubrics {
        uuid Id PK
        uuid SemesterId FK
        string Name
        int ApplicationMode
        int Status
        string RejectionReason
        bool IsDeleted
    }

    EvaluationRubricCriteria {
        uuid Id PK
        uuid RubricId FK
        string Name
        string Description
        decimal Weight
        int MaxScore
        int OrderIndex
    }

    Documents {
        uuid Id PK
        uuid InternshipId FK
        uuid UploadedById FK
        string Title
        string Category
        string FileName
        string FilePath
        string MimeType
        long FileSize
        bool IsRequired
        bool IsArchived
        bool IsDeleted
    }

    Notifications {
        uuid Id PK
        uuid UserId FK
        string Title
        string Content
        string Link
        bool IsRead
        datetime ReadAt
        string SenderName
        datetime CreatedAt
    }

    AccountRequests {
        uuid Id PK
        uuid RequesterUserId FK
        string RequesterName
        string RequesterCode
        string RequesterEmail
        string RequesterRole
        string RequestType
        string Description
        string Priority
        string Status
        string AdminNote
        bool IsDeleted
    }

    SystemSettings {
        uuid Id PK
        string Key UK
        string Value
        string Description
        datetime UpdatedAt
    }
```

---

## 2. Ràng Buộc Khóa Ngoại

| Bảng | Khóa ngoại | REFERENCES | On Delete |
|:---|:---|:---|:---|
| `Students` | `UserId` | `Users(Id)` | Set Null |
| `Lecturers` | `UserId` | `Users(Id)` | Set Null |
| `Internships` | `StudentId` | `Students(Id)` | Restrict |
| `Internships` | `LecturerId` | `Lecturers(Id)` | Set Null |
| `Internships` | `CompanyId` | `Companies(Id)` | Set Null |
| `Internships` | `SemesterId` | `Semesters(Id)` | Restrict |
| `WeeklyReports` | `InternshipId` | `Internships(Id)` | Cascade |
| `Submissions` | `InternshipId` | `Internships(Id)` | Cascade |
| `Feedbacks` | `SubmissionId` | `Submissions(Id)` | Cascade |
| `Feedbacks` | `LecturerId` | `Lecturers(Id)` | Set Null |
| `Evaluations` | `InternshipId` | `Internships(Id)` | Cascade |
| `EvaluationRubrics` | `SemesterId` | `Semesters(Id)` | Restrict |
| `EvaluationRubricCriteria` | `RubricId` | `EvaluationRubrics(Id)` | Cascade |
| `Documents` | `InternshipId` | `Internships(Id)` | Set Null |
| `Notifications` | `UserId` | `Users(Id)` | Cascade |
| `AccountRequests` | `RequesterUserId` | `Users(Id)` | Set Null |

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using InternLink.Domain.Entities;
using InternLink.Domain.Entities.Rbac;
using InternLink.Domain.Enums;

namespace InternLink.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Department> Departments { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Student> Students { get; set; } = null!;
    public DbSet<Lecturer> Lecturers { get; set; } = null!;
    public DbSet<Company> Companies { get; set; } = null!;
    public DbSet<Semester> Semesters { get; set; } = null!;
    public DbSet<SchoolAcademicTerm> SchoolAcademicTerms { get; set; } = null!;
    public DbSet<Internship> Internships { get; set; } = null!;
    public DbSet<Submission> Submissions { get; set; } = null!;
    public DbSet<SubmissionAsset> SubmissionAssets { get; set; } = null!;
    public DbSet<Feedback> Feedbacks { get; set; } = null!;
    public DbSet<Document> Documents { get; set; } = null!;
    public DbSet<Evaluation> Evaluations { get; set; } = null!;
    public DbSet<WeeklyReport> WeeklyReports { get; set; } = null!;
    public DbSet<WeeklyReportVersion> WeeklyReportVersions { get; set; } = null!;
    public DbSet<Notification> Notifications { get; set; } = null!;
    public DbSet<PasswordResetToken> PasswordResetTokens { get; set; } = null!;
    public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;
    public DbSet<EvaluationRubric> EvaluationRubrics { get; set; } = null!;
    public DbSet<EvaluationRubricCriterion> EvaluationRubricCriteria { get; set; } = null!;
    public DbSet<SystemSetting> SystemSettings { get; set; } = null!;
    public DbSet<AccountRequest> AccountRequests { get; set; } = null!;
    public DbSet<SemesterLecturer> SemesterLecturers { get; set; } = null!;
    public DbSet<SemesterCompany> SemesterCompanies { get; set; } = null!;
    public DbSet<CompanyPosition> CompanyPositions { get; set; } = null!;
    public DbSet<SemesterReportSchedule> SemesterReportSchedules { get; set; } = null!;
    public DbSet<AttendanceSession> AttendanceSessions { get; set; } = null!;
    public DbSet<AttendanceRecord> AttendanceRecords { get; set; } = null!;
    public DbSet<DocumentVersion> DocumentVersions { get; set; } = null!;
    public DbSet<LecturerSemesterSummary> LecturerSemesterSummaries { get; set; } = null!;
    public DbSet<LecturerActivityLog> LecturerActivityLogs { get; set; } = null!;
    public DbSet<SemesterFacultySummary> SemesterFacultySummaries { get; set; } = null!;
    public DbSet<SysUser> SysUsers { get; set; } = null!;
    public DbSet<SysRole> SysRoles { get; set; } = null!;
    public DbSet<SysUserRole> SysUserRoles { get; set; } = null!;
    public DbSet<SysFunction> SysFunctions { get; set; } = null!;
    public DbSet<SysRolePermission> SysRolePermissions { get; set; } = null!;
    public DbSet<SysGridConfig> SysGridConfigs { get; set; } = null!;
    public DbSet<SysLoginLog> SysLoginLogs { get; set; } = null!;
    public DbSet<SysGradingRuleSet> SysGradingRuleSets { get; set; } = null!;
    public DbSet<EmployerEvaluation> EmployerEvaluations { get; set; } = null!;
    public DbSet<EmployerEvaluationToken> EmployerEvaluationTokens { get; set; } = null!;
    public DbSet<SysAuditLog> SysAuditLogs { get; set; } = null!;
    public DbSet<SysWebhook> SysWebhooks { get; set; } = null!;
    public DbSet<SysFieldPolicy> SysFieldPolicies { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── Department ──────────────────────────────────────────────
        modelBuilder.Entity<Department>(b =>
        {
            b.ToTable("Departments");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("DepartmentId");
            b.Property(x => x.Code).IsRequired().HasMaxLength(20);
            b.Property(x => x.Name).IsRequired().HasMaxLength(200);
            b.Property(x => x.Description).HasMaxLength(500);
            b.Property(x => x.IsActive).HasDefaultValue(true);
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasIndex(x => x.Code).IsUnique();
        });

        // ── User ────────────────────────────────────────────────────
        modelBuilder.Entity<User>(b =>
        {
            b.ToTable("Users");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("UserId");
            b.Property(x => x.Username).IsRequired().HasMaxLength(100);
            b.Property(x => x.PasswordHash).IsRequired();
            b.Property(x => x.Email).HasMaxLength(200);
            b.Property(x => x.FullName).HasMaxLength(200);
            b.Property(x => x.IsActive).HasDefaultValue(true);
            b.Property(x => x.MustChangePassword).HasDefaultValue(false);
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasOne(x => x.Department).WithMany(d => d.Users).HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Student>(b =>
        {
            b.ToTable("Students");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("StudentId");
            b.Property(x => x.StudentCode).IsRequired().HasMaxLength(50);
            b.Property(x => x.FullName).IsRequired().HasMaxLength(200);
            b.Property(x => x.Class).HasMaxLength(100);
            b.Property(x => x.Major).HasMaxLength(150);
            b.Property(x => x.Email).HasMaxLength(200);
            b.Property(x => x.Phone).HasMaxLength(50);
            b.Property(x => x.Department).HasMaxLength(150);
            b.Property(x => x.DesiredPosition).HasMaxLength(200);
            b.Property(x => x.AlternativePosition).HasMaxLength(200);
            b.Property(x => x.DesiredLocation).HasMaxLength(250);
            b.Property(x => x.WorkPreference).HasMaxLength(50);
            b.Property(x => x.PreferredIndustry).HasMaxLength(150);
            b.Property(x => x.Skills).HasMaxLength(1000);
            b.Property(x => x.ResumeUrl).HasMaxLength(500);
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            // Changed: 1:N relationship to support multi-semester internships
            b.HasMany(x => x.Internships).WithOne(x => x.Student).HasForeignKey(x => x.StudentId);
            b.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
            b.HasIndex(x => x.UserId).IsUnique().HasFilter("[UserId] IS NOT NULL");
            b.HasIndex(x => x.StudentCode).IsUnique().HasFilter("[IsDeleted] = 0");
            b.HasOne(x => x.DepartmentRef).WithMany(d => d.Students).HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Lecturer>(b =>
        {
            b.ToTable("Lecturers");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("LecturerId");
            b.Property(x => x.StaffCode).IsRequired().HasMaxLength(50);
            b.Property(x => x.FullName).IsRequired().HasMaxLength(200);
            b.Property(x => x.Email).HasMaxLength(200);
            b.Property(x => x.Phone).HasMaxLength(50);
            b.Property(x => x.Department).HasMaxLength(150);
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasIndex(x => x.StaffCode).IsUnique();
            b.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
            b.HasIndex(x => x.UserId).IsUnique().HasFilter("[UserId] IS NOT NULL");
            b.HasMany(x => x.SemesterLecturers).WithOne(x => x.Lecturer).HasForeignKey(x => x.LecturerId);
            b.HasOne(x => x.DepartmentRef).WithMany(d => d.Lecturers).HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Company>(b =>
        {
            b.ToTable("Companies");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("CompanyId");
            b.Property(x => x.CompanyName).IsRequired().HasMaxLength(250);
            b.Property(x => x.CompanyCode).HasMaxLength(50);
            b.Property(x => x.Address).HasMaxLength(500);
            b.Property(x => x.Website).HasMaxLength(250);
            b.Property(x => x.Industry).HasMaxLength(150);
            b.Property(x => x.ContactPerson).HasMaxLength(200);
            b.Property(x => x.ContactEmail).HasMaxLength(200);
            b.Property(x => x.ContactPhone).HasMaxLength(50);
            b.Property(x => x.IsActive).HasDefaultValue(true);
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasIndex(x => x.CompanyCode).IsUnique().HasFilter("[CompanyCode] IS NOT NULL");
            b.HasOne(x => x.Department).WithMany().HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Semester>(b =>
        {
            b.ToTable("Semesters");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("SemesterId");
            b.Property(x => x.Name).IsRequired().HasMaxLength(250);
            b.Property(x => x.Term).IsRequired().HasMaxLength(100);
            b.Property(x => x.AcademicYear).IsRequired().HasMaxLength(50);
            b.Property(x => x.Status).HasDefaultValue(SemesterStatus.Upcoming);
            b.Property(x => x.Description).HasMaxLength(1000);
            b.Property(x => x.MaxStudentsPerLecturer).HasDefaultValue(30);
            b.Property(x => x.TotalWeeks).HasDefaultValue(6);
            b.Property(x => x.TargetStudents).HasDefaultValue(0);
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasOne(x => x.Department).WithMany().HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<SchoolAcademicTerm>(b =>
        {
            b.ToTable("SchoolAcademicTerms");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("SchoolAcademicTermId");
            b.Property(x => x.AcademicYear).IsRequired().HasMaxLength(50);
            b.Property(x => x.Term).IsRequired().HasMaxLength(100);
            b.Property(x => x.StartDate).HasColumnType("date");
            b.Property(x => x.EndDate).HasColumnType("date");
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasIndex(x => new { x.AcademicYear, x.Term }).IsUnique().HasFilter("[IsDeleted] = 0");
        });

        modelBuilder.Entity<Internship>(b =>
        {
            b.ToTable("Internships");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("InternshipId");
            b.Property(x => x.Position).HasMaxLength(200);
            b.Property(x => x.SupervisorName).HasMaxLength(200);
            b.Property(x => x.SupervisorPhone).HasMaxLength(50);
            b.Property(x => x.SupervisorEmail).HasMaxLength(200);
            b.Property(x => x.SupervisorDepartment).HasMaxLength(200);
            b.Property(x => x.Status).HasDefaultValue(InternshipStatus.NotStarted);
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.Property(x => x.AssignedAt).HasColumnName("AssignedAt");
            // NOTE: Student.Internship relationship configured in Student modelBuilder (1:N)
            // Changed: CompanyId now nullable (assigned later by lecturer)
            b.HasOne(x => x.Company).WithMany(x => x.Internships).HasForeignKey(x => x.CompanyId).IsRequired(false);
            b.HasOne(x => x.Lecturer).WithMany(x => x.Internships).HasForeignKey(x => x.LecturerId).OnDelete(DeleteBehavior.SetNull);
            b.HasOne(x => x.Semester).WithMany(x => x.Internships).HasForeignKey(x => x.SemesterId).OnDelete(DeleteBehavior.SetNull);
            // Added: unique constraint to ensure one internship per student per semester
            b.HasIndex(x => new { x.StudentId, x.SemesterId }).IsUnique();
            // Added: document collection for CV and other files (InternshipId optional for templates)
            b.HasMany(x => x.Documents).WithOne(x => x.Internship).HasForeignKey(x => x.InternshipId).IsRequired(false).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Submission>(b =>
        {
            b.ToTable("Submissions");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("SubmissionId");
            b.Property(x => x.Type).HasDefaultValue(SubmissionType.WeeklyReport);
            b.Property(x => x.Status).HasDefaultValue(SubmissionStatus.Submitted);
            b.Property(x => x.Title).HasMaxLength(250);
            b.Property(x => x.Description).HasMaxLength(1000);
            b.Property(x => x.FileName).HasMaxLength(250);
            b.Property(x => x.FileUrl).HasMaxLength(1000);
            b.Property(x => x.GoogleDriveFileId).HasMaxLength(200);
            b.Property(x => x.EmployerScore).HasPrecision(4, 2);
            b.Property(x => x.SubmittedAt).HasDefaultValueSql("GETUTCDATE()");
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasOne(x => x.Internship).WithMany(x => x.Submissions).HasForeignKey(x => x.InternshipId);
            b.HasMany(x => x.Assets).WithOne(x => x.Submission).HasForeignKey(x => x.SubmissionId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SubmissionAsset>(b =>
        {
            b.ToTable("SubmissionAssets");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("SubmissionAssetId");
            b.Property(x => x.Label).HasMaxLength(250);
            b.Property(x => x.FileName).HasMaxLength(250);
            b.Property(x => x.FileUrl).HasMaxLength(1000);
            b.Property(x => x.GoogleDriveFileId).HasMaxLength(200);
            b.Property(x => x.AssetType).IsRequired().HasMaxLength(30);
            b.Property(x => x.MimeType).HasMaxLength(150);
            b.Property(x => x.UploadedAt).HasDefaultValueSql("GETUTCDATE()");
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        });

        modelBuilder.Entity<Feedback>(b =>
        {
            b.ToTable("Feedbacks");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("FeedbackId");
            b.Property(x => x.Comment).IsRequired().HasMaxLength(2000);
            b.Property(x => x.IsPublic).HasDefaultValue(true);
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasOne(x => x.Submission).WithMany(x => x.Feedbacks).HasForeignKey(x => x.SubmissionId).OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.WeeklyReport).WithMany(x => x.Feedbacks).HasForeignKey(x => x.WeeklyReportId).OnDelete(DeleteBehavior.NoAction);
            b.HasIndex(x => x.WeeklyReportId);
            b.HasIndex(x => new { x.SubmissionId, x.CreatedAt });
            b.HasIndex(x => new { x.WeeklyReportId, x.CreatedAt });
            b.HasOne(x => x.Lecturer).WithMany().HasForeignKey(x => x.LecturerId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Document>(b =>
        {
            b.ToTable("Documents");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("DocumentId");
            b.Property(x => x.Title).IsRequired().HasMaxLength(300);
            b.Property(x => x.Description).HasMaxLength(2000);
            b.Property(x => x.FileName).IsRequired().HasMaxLength(250);
            b.Property(x => x.FilePath).IsRequired().HasMaxLength(500);
            b.Property(x => x.GoogleDriveFileId).HasMaxLength(200);
            b.Property(x => x.DownloadCount).HasDefaultValue(0);
            b.Property(x => x.MimeType).IsRequired().HasMaxLength(100);
            b.Property(x => x.UploadedAt).HasDefaultValueSql("GETUTCDATE()");
            b.Property(x => x.IsRequired).HasDefaultValue(false);
            b.Property(x => x.IsPublished).HasDefaultValue(true);
            b.Property(x => x.ArchiveReason).HasMaxLength(1000);
            b.Property(x => x.ArchivedBy).HasMaxLength(200);
            // Category used to filter documents (e.g., "CV", "Form", "Report")
            b.Property(x => x.Category).HasMaxLength(100);
            b.Property(x => x.Department).HasMaxLength(150);
            b.Property(x => x.Version).HasMaxLength(50).HasDefaultValue("1.0");
            b.Property(x => x.PublishedAt);
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasOne(x => x.Internship).WithMany(x => x.Documents).HasForeignKey(x => x.InternshipId).IsRequired(false).OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.Semester).WithMany().HasForeignKey(x => x.SemesterId).IsRequired(false).OnDelete(DeleteBehavior.SetNull);
            b.HasOne(x => x.UploadedBy).WithMany().HasForeignKey(x => x.UploadedById).OnDelete(DeleteBehavior.SetNull);
            b.HasIndex(x => new { x.SemesterId, x.Department, x.IsPublished });
        });

        modelBuilder.Entity<Evaluation>(b =>
        {
            b.ToTable("Evaluations");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("EvaluationId");
            b.Property(x => x.TechnicalScore).IsRequired();
            b.Property(x => x.CommunicationScore).IsRequired();
            b.Property(x => x.TeamworkScore).IsRequired();
            b.Property(x => x.InitiativeScore).IsRequired();
            b.Property(x => x.FinalGrade).IsRequired().HasPrecision(5, 2);
            b.Property(x => x.QualityLevel).HasPrecision(3, 1);
            b.Property(x => x.OralExamScore).HasPrecision(4, 1);
            b.Property(x => x.Comments).HasMaxLength(3000);
            b.Property(x => x.Strengths).HasMaxLength(2000);
            b.Property(x => x.AreasForImprovement).HasMaxLength(2000);
            b.Property(x => x.EvaluatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.Property(x => x.IsFinalized).HasDefaultValue(false);
            b.Property(x => x.DefenseStatus).HasDefaultValue(DefenseStatus.NotScheduled);
            b.Property(x => x.DefenseCouncilName).HasMaxLength(250);
            b.Property(x => x.DefenseExaminerName).HasMaxLength(250);
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasOne(x => x.Internship).WithOne().HasForeignKey<Evaluation>(x => x.InternshipId);
            b.HasOne(x => x.EvaluatedBy).WithMany().HasForeignKey(x => x.EvaluatedById).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<WeeklyReport>(b =>
        {
            b.ToTable("WeeklyReports");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("WeeklyReportId");
            b.Property(x => x.Title).IsRequired().HasMaxLength(250);
            b.Property(x => x.Content).IsRequired().HasMaxLength(8000);
            b.Property(x => x.FileName).HasMaxLength(250);
            b.Property(x => x.FileUrl).HasMaxLength(1000);
            b.Property(x => x.GoogleDriveFileId).HasMaxLength(200);
            b.Property(x => x.MimeType).HasMaxLength(100);
            b.Property(x => x.Version).HasDefaultValue(1);
            b.Property(x => x.Status).HasDefaultValue(WeeklyReportStatus.Draft);
            b.Property(x => x.LecturerComment).HasMaxLength(2000);
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasOne(x => x.Internship).WithMany(x => x.WeeklyReports).HasForeignKey(x => x.InternshipId);
            b.HasIndex(x => new { x.InternshipId, x.WeekNumber });
            b.HasIndex(x => new { x.InternshipId, x.Status, x.WeekNumber });
        });

        modelBuilder.Entity<WeeklyReportVersion>(b =>
        {
            b.ToTable("WeeklyReportVersions");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("WeeklyReportVersionId");
            b.Property(x => x.FileName).IsRequired().HasMaxLength(250);
            b.Property(x => x.FileUrl).IsRequired().HasMaxLength(1000);
            b.Property(x => x.MimeType).IsRequired().HasMaxLength(100);
            b.Property(x => x.UploadedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasOne(x => x.WeeklyReport).WithMany(x => x.Versions)
                .HasForeignKey(x => x.WeeklyReportId).OnDelete(DeleteBehavior.Cascade);
            b.HasIndex(x => new { x.WeeklyReportId, x.Version }).IsUnique();
        });

        modelBuilder.Entity<DocumentVersion>(b =>
        {
            b.ToTable("DocumentVersions");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("DocumentVersionId");
            b.Property(x => x.FileName).IsRequired().HasMaxLength(250);
            b.Property(x => x.FilePath).IsRequired().HasMaxLength(1000);
            b.Property(x => x.GoogleDriveFileId).HasMaxLength(200);
            b.Property(x => x.MimeType).IsRequired().HasMaxLength(100);
            b.Property(x => x.ChangeNote).HasMaxLength(500);
            b.Property(x => x.UploadedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasOne(x => x.Document).WithMany(x => x.Versions)
                .HasForeignKey(x => x.DocumentId).OnDelete(DeleteBehavior.Cascade);
            b.HasIndex(x => new { x.DocumentId, x.VersionNumber }).IsUnique();
        });

        modelBuilder.Entity<LecturerSemesterSummary>(b =>
        {
            b.ToTable("LecturerSemesterSummaries");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("LecturerSemesterSummaryId");
            b.Property(x => x.Results).IsRequired().HasMaxLength(10000);
            b.Property(x => x.Difficulties).IsRequired().HasMaxLength(10000);
            b.Property(x => x.Recommendations).IsRequired().HasMaxLength(10000);
            b.Property(x => x.Conclusion).IsRequired().HasMaxLength(10000);
            b.Property(x => x.UpdatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasOne(x => x.Semester).WithMany().HasForeignKey(x => x.SemesterId).OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.Lecturer).WithMany().HasForeignKey(x => x.LecturerId).OnDelete(DeleteBehavior.Cascade);
            b.HasIndex(x => new { x.SemesterId, x.LecturerId }).IsUnique();
        });

        modelBuilder.Entity<SemesterFacultySummary>(b =>
        {
            b.ToTable("SemesterFacultySummaries");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("SemesterFacultySummaryId");
            b.Property(x => x.Results).IsRequired().HasMaxLength(10000);
            b.Property(x => x.Difficulties).IsRequired().HasMaxLength(10000);
            b.Property(x => x.Recommendations).IsRequired().HasMaxLength(10000);
            b.Property(x => x.Conclusion).IsRequired().HasMaxLength(10000);
            b.Property(x => x.UpdatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasOne(x => x.Semester).WithMany().HasForeignKey(x => x.SemesterId).OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.Department).WithMany().HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.SetNull);
            // Một báo cáo tổng kết cho mỗi (Kỳ, Khoa). Lưu ý SQL Server: các dòng DepartmentId = NULL
            // không xung đột nhau trong unique index — chỉ SuperAdmin dùng null nên chấp nhận được.
        });

        modelBuilder.Entity<LecturerActivityLog>(b =>
        {
            b.ToTable("LecturerActivityLogs");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("LecturerActivityLogId");
            b.Property(x => x.StudentCode).HasMaxLength(50);
            b.Property(x => x.StudentName).HasMaxLength(200);
            b.Property(x => x.CompanyName).HasMaxLength(250);
            b.Property(x => x.ActivityType).IsRequired().HasMaxLength(50);
            b.Property(x => x.Title).IsRequired().HasMaxLength(250);
            b.Property(x => x.Detail).HasMaxLength(2000);
            b.Property(x => x.OccurredAt).HasColumnType("datetime2");
            b.HasIndex(x => new { x.LecturerId, x.SemesterId, x.OccurredAt });
        });

        modelBuilder.Entity<Notification>(b =>
        {
            b.ToTable("Notifications");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("NotificationId");
            b.Property(x => x.Title).IsRequired().HasMaxLength(200);
            b.Property(x => x.Content).IsRequired().HasMaxLength(2000);
            b.Property(x => x.Link).HasMaxLength(500);
            b.Property(x => x.AttachmentUrl).HasMaxLength(1000);
            b.Property(x => x.AttachmentName).HasMaxLength(250);
            b.Property(x => x.IsRead).HasDefaultValue(false);
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            b.HasIndex(x => new { x.UserId, x.IsRead });
        });

        modelBuilder.Entity<PasswordResetToken>(b =>
        {
            b.ToTable("PasswordResetTokens");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("PasswordResetTokenId");
            b.Property(x => x.TokenHash).IsRequired().HasMaxLength(64);
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            b.HasIndex(x => x.TokenHash).IsUnique();
            b.HasIndex(x => new { x.UserId, x.UsedAt });
        });

        modelBuilder.Entity<RefreshToken>(b =>
        {
            b.ToTable("RefreshTokens");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("RefreshTokenId");
            b.Property(x => x.Token).IsRequired().HasMaxLength(256);
            b.Property(x => x.JwtId).IsRequired().HasMaxLength(128);
            b.Property(x => x.IsUsed).HasDefaultValue(false);
            b.Property(x => x.IsRevoked).HasDefaultValue(false);
            b.Property(x => x.CreatedByIp).HasMaxLength(50);
            b.Property(x => x.RevokedByIp).HasMaxLength(50);
            b.Property(x => x.ReplacedByToken).HasMaxLength(256);
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasOne(x => x.User).WithMany(u => u.RefreshTokens).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            b.HasIndex(x => x.Token).IsUnique();
            b.HasIndex(x => new { x.UserId, x.IsRevoked, x.IsUsed });
        });

        modelBuilder.Entity<EvaluationRubric>(b =>
        {
            b.ToTable("EvaluationRubrics");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("EvaluationRubricId");
            b.Property(x => x.Name).IsRequired().HasMaxLength(250);
            b.Property(x => x.Version).HasDefaultValue(1);
            b.Property(x => x.ApplicationMode).HasDefaultValue(RubricApplicationMode.Required);
            b.Property(x => x.Status).HasDefaultValue(RubricStatus.Draft);
            b.Property(x => x.RejectionReason).HasMaxLength(1000);
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.Property(x => x.RatingLevelsJson).HasColumnType("nvarchar(max)");
            b.HasOne(x => x.Semester).WithMany(s => s.EvaluationRubrics).HasForeignKey(x => x.SemesterId).OnDelete(DeleteBehavior.NoAction);
            b.HasOne(x => x.Department).WithMany(d => d.EvaluationRubrics).HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.NoAction);
            b.HasOne(x => x.SubmittedBy).WithMany().HasForeignKey(x => x.SubmittedById).OnDelete(DeleteBehavior.NoAction);
            b.HasOne(x => x.ApprovedBy).WithMany().HasForeignKey(x => x.ApprovedById).OnDelete(DeleteBehavior.NoAction);
            b.HasIndex(x => new { x.SemesterId, x.DepartmentId })
                .IsUnique()
                .HasFilter("[IsDeleted] = 0");
        });

        modelBuilder.Entity<EvaluationRubricCriterion>(b =>
        {
            b.ToTable("EvaluationRubricCriteria");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("EvaluationRubricCriterionId");
            b.Property(x => x.Name).IsRequired().HasMaxLength(200);
            b.Property(x => x.Description).HasMaxLength(500);
            b.Property(x => x.Weight).IsRequired().HasPrecision(5, 2);
            b.Property(x => x.MaxScore).HasDefaultValue(10);
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasOne(x => x.Rubric).WithMany(r => r.Criteria).HasForeignKey(x => x.RubricId).OnDelete(DeleteBehavior.Cascade);
        });

        // Extend Evaluation with CriteriaScoresJson and RubricId
        modelBuilder.Entity<Evaluation>(b =>
        {
            b.Property(x => x.CriteriaScoresJson).HasMaxLength(8000);
            b.Property(x => x.HasCreativeProduct).HasDefaultValue(false);
            b.HasOne(x => x.Rubric).WithMany().HasForeignKey(x => x.RubricId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<AccountRequest>(b =>
        {
            b.ToTable("AccountRequests");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("AccountRequestId");
            b.Property(x => x.RequesterCode).IsRequired().HasMaxLength(50);
            b.Property(x => x.RequesterName).IsRequired().HasMaxLength(200);
            b.Property(x => x.RequesterEmail).HasMaxLength(200);
            b.Property(x => x.RequesterPhone).HasMaxLength(50);
            b.Property(x => x.DepartmentOrClass).HasMaxLength(200);
            b.Property(x => x.RequestType).IsRequired().HasMaxLength(100);
            b.Property(x => x.Description).HasMaxLength(2000);
            b.Property(x => x.Priority).HasMaxLength(20);
            b.Property(x => x.Status).HasDefaultValue(AccountRequestStatus.Pending);
            b.Property(x => x.ProcessorName).HasMaxLength(200);
            b.Property(x => x.AdminNote).HasMaxLength(2000);
            b.Property(x => x.AttachmentUrl).HasMaxLength(1000);
            b.Property(x => x.AttachmentName).HasMaxLength(250);
            b.Property(x => x.RequestedChangesJson).HasMaxLength(4000);
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasOne(x => x.RequesterUser).WithMany().HasForeignKey(x => x.RequesterUserId).OnDelete(DeleteBehavior.SetNull);
            b.HasIndex(x => x.Status);
            b.HasIndex(x => x.RequesterCode);
        });

        modelBuilder.Entity<SemesterLecturer>(b =>
        {
            b.ToTable("SemesterLecturers");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("SemesterLecturerId");
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasIndex(x => new { x.SemesterId, x.LecturerId }).IsUnique();
            b.HasOne(x => x.Semester).WithMany(x => x.SemesterLecturers).HasForeignKey(x => x.SemesterId);
            b.HasOne(x => x.Lecturer).WithMany(x => x.SemesterLecturers).HasForeignKey(x => x.LecturerId);
        });

        modelBuilder.Entity<SemesterCompany>(b =>
        {
            b.ToTable("SemesterCompanies");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("SemesterCompanyId");
            b.Property(x => x.IsActive).HasDefaultValue(true);
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasIndex(x => new { x.SemesterId, x.CompanyId }).IsUnique();
            b.HasOne(x => x.Semester).WithMany(x => x.SemesterCompanies).HasForeignKey(x => x.SemesterId);
            b.HasOne(x => x.Company).WithMany(x => x.SemesterCompanies).HasForeignKey(x => x.CompanyId);
        });

        modelBuilder.Entity<CompanyPosition>(b =>
        {
            b.ToTable("CompanyPositions");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("CompanyPositionId");
            b.Property(x => x.Title).IsRequired().HasMaxLength(200);
            b.Property(x => x.PositionCode).HasMaxLength(50);
            b.Property(x => x.Description).HasMaxLength(2000);
            b.Property(x => x.RequiredMajor).HasMaxLength(200);
            b.Property(x => x.RequiredSkills).HasMaxLength(1000);
            b.Property(x => x.Location).HasMaxLength(500);
            b.Property(x => x.Slots).HasDefaultValue(1);
            b.Property(x => x.Stipend).HasPrecision(18, 2);
            b.Property(x => x.IsOpen).HasDefaultValue(true);
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasOne(x => x.Company).WithMany(c => c.Positions).HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.Semester).WithMany().HasForeignKey(x => x.SemesterId).OnDelete(DeleteBehavior.SetNull);
            b.HasIndex(x => new { x.CompanyId, x.SemesterId });
            b.HasIndex(x => x.PositionCode).IsUnique().HasFilter("[PositionCode] IS NOT NULL");
        });

        modelBuilder.Entity<SemesterReportSchedule>(b =>
        {
            b.ToTable("SemesterReportSchedules");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("SemesterReportScheduleId");
            b.Property(x => x.Title).IsRequired().HasMaxLength(250);
            b.Property(x => x.Description).HasMaxLength(1000);
            b.Property(x => x.AllowLateSubmission).HasDefaultValue(true);
            b.Property(x => x.IsSubmissionOpen).HasDefaultValue(true);
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasIndex(x => new { x.SemesterId, x.WeekNumber })
                .IsUnique()
                .HasFilter("[LecturerId] IS NULL AND [IsDeleted] = 0");
            b.HasIndex(x => new { x.SemesterId, x.WeekNumber, x.LecturerId })
                .IsUnique()
                .HasFilter("[LecturerId] IS NOT NULL AND [IsDeleted] = 0");
            b.HasOne(x => x.Semester)
                .WithMany(s => s.ReportSchedules)
                .HasForeignKey(x => x.SemesterId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.Lecturer)
                .WithMany()
                .HasForeignKey(x => x.LecturerId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SystemSetting>(b =>
        {
            b.ToTable("SystemSettings");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("SystemSettingId");
            b.Property(x => x.Key).IsRequired().HasMaxLength(100);
            b.Property(x => x.Value).IsRequired().HasMaxLength(4000);
            b.Property(x => x.Category).HasMaxLength(50);
            b.Property(x => x.Description).HasMaxLength(500);
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            b.HasIndex(x => x.Key).IsUnique();
        });

        modelBuilder.Entity<AttendanceSession>(b =>
        {
            b.ToTable("AttendanceSessions");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("AttendanceSessionId");
            b.Property(x => x.Title).IsRequired().HasMaxLength(250);
            b.Property(x => x.Description).HasMaxLength(1000);
            b.Property(x => x.Location).HasMaxLength(500);
            b.Property(x => x.Status).HasConversion<string>().HasMaxLength(50).HasDefaultValue(AttendanceSessionStatus.Scheduled);
            b.Property(x => x.IsLecturerOnly).HasDefaultValue(false);
            b.Property(x => x.IsGeneralSession).HasDefaultValue(false);
            b.Property(x => x.DurationMinutes).HasDefaultValue(60);
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

            b.HasOne(x => x.Semester)
                .WithMany(s => s.AttendanceSessions)
                .HasForeignKey(x => x.SemesterId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.Lecturer)
                .WithMany(l => l.AttendanceSessions)
                .HasForeignKey(x => x.LecturerId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasIndex(x => new { x.SemesterId, x.LecturerId, x.WeekNumber });
        });

        modelBuilder.Entity<AttendanceRecord>(b =>
        {
            b.ToTable("AttendanceRecords");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).HasColumnName("AttendanceRecordId");
            b.Property(x => x.Status).HasConversion<string>().HasMaxLength(50).HasDefaultValue(AttendanceStatus.Present);
            b.Property(x => x.Notes).HasMaxLength(1000);
            b.Property(x => x.MarkedBy).HasMaxLength(100);
            b.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

            b.HasOne(x => x.AttendanceSession)
                .WithMany(s => s.Records)
                .HasForeignKey(x => x.AttendanceSessionId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.Student)
                .WithMany(st => st.AttendanceRecords)
                .HasForeignKey(x => x.StudentId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.Internship)
                .WithMany()
                .HasForeignKey(x => x.InternshipId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasIndex(x => new { x.AttendanceSessionId, x.StudentId }).IsUnique();
        });

        modelBuilder.Entity<SysUser>(b =>
        {
            b.ToTable("Sys_Users");
            b.HasKey(x => x.AutoId);
            b.HasAlternateKey(x => x.PublicId);
            b.Property(x => x.UserName).IsRequired().HasMaxLength(100);
            b.Property(x => x.DisplayName).HasMaxLength(200);
            b.HasIndex(x => x.UserName)
                .IsUnique()
                .HasFilter("[IsDeleted] = 0");
            b.HasOne(x => x.LegacyUser)
                .WithOne()
                .HasForeignKey<SysUser>(x => x.PublicId)
                .HasPrincipalKey<User>(x => x.PublicId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SysRole>(b =>
        {
            b.ToTable("Sys_Roles");
            b.HasKey(x => x.AutoId);
            b.Property(x => x.Code).IsRequired().HasMaxLength(100);
            b.Property(x => x.Name).IsRequired().HasMaxLength(150);
            b.Property(x => x.Description).HasMaxLength(500);
            b.HasIndex(x => x.Code).IsUnique();
        });

        modelBuilder.Entity<SysUserRole>(b =>
        {
            b.ToTable("Sys_UserRoles");
            b.HasKey(x => x.AutoId);
            b.HasOne(x => x.User).WithMany(x => x.Roles).HasForeignKey(x => x.SysUserId);
            b.HasOne(x => x.Role).WithMany(x => x.Users).HasForeignKey(x => x.SysRoleId);
            b.HasIndex(x => new { x.SysUserId, x.SysRoleId }).IsUnique();
        });

        modelBuilder.Entity<SysFunction>(b =>
        {
            b.ToTable("Sys_Functions");
            b.HasKey(x => x.AutoId);
            b.Property(x => x.Code).IsRequired().HasMaxLength(100);
            b.Property(x => x.Name).IsRequired().HasMaxLength(200);
            b.Property(x => x.ModuleCode).IsRequired().HasMaxLength(100);
            b.Property(x => x.Description).HasMaxLength(500);
            b.Property(x => x.FuncUrl).HasMaxLength(500);
            b.Property(x => x.IconName).HasMaxLength(100).HasDefaultValue("Folder");
            b.Property(x => x.BadgeText).HasMaxLength(50);
            b.Property(x => x.IsVisibleInMenu).HasDefaultValue(true);
            b.Property(x => x.IsView).HasDefaultValue(true);
            b.Property(x => x.IsNew).HasDefaultValue(true);
            b.Property(x => x.IsEdit).HasDefaultValue(true);
            b.Property(x => x.IsDelete).HasDefaultValue(true);
            b.Property(x => x.IsExport).HasDefaultValue(true);
            b.HasIndex(x => x.Code).IsUnique();
            b.HasOne(x => x.Parent)
                .WithMany(x => x.Children)
                .HasForeignKey(x => x.ParentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SysRolePermission>(b =>
        {
            b.ToTable("Sys_RolePermissions");
            b.HasKey(x => x.AutoId);
            b.HasOne(x => x.Role).WithMany(x => x.Permissions).HasForeignKey(x => x.SysRoleId);
            b.HasOne(x => x.Function).WithMany(x => x.RolePermissions).HasForeignKey(x => x.SysFunctionId);
            b.HasIndex(x => new { x.SysRoleId, x.SysFunctionId }).IsUnique();
        });

        modelBuilder.Entity<SysGridConfig>(b =>
        {
            b.ToTable("Sys_GridConfigs");
            b.HasKey(x => x.AutoId);
            b.Property(x => x.FeatureCode).IsRequired().HasMaxLength(100);
            b.Property(x => x.FieldCode).IsRequired().HasMaxLength(100);
            b.Property(x => x.HeaderTitle).IsRequired().HasMaxLength(200);
            b.Property(x => x.ColumnWidth).HasDefaultValue(120);
            b.Property(x => x.IsVisible).HasDefaultValue(true);
            b.Property(x => x.FrozenSide).IsRequired().HasMaxLength(5).HasDefaultValue("left");
            b.Property(x => x.TenantId).HasMaxLength(50);
            b.Property(x => x.HeaderBgColor).HasMaxLength(9);
            b.Property(x => x.HeaderTextColor).HasMaxLength(9);
            b.Property(x => x.CellFormatType).IsRequired().HasMaxLength(30).HasDefaultValue("text");
            b.Property(x => x.CellColorRuleJson).HasMaxLength(4000);
            b.HasIndex(x => x.PublicId).IsUnique();
            b.HasIndex(x => new { x.FeatureCode, x.RoleId, x.TenantId, x.FieldCode }).IsUnique();
        });

        modelBuilder.Entity<SysLoginLog>(b =>
        {
            b.ToTable("Sys_LoginLogs");
            b.HasKey(x => x.AutoId);
            b.Property(x => x.Username).IsRequired().HasMaxLength(200);
            b.Property(x => x.IpAddress).HasMaxLength(45);
            b.Property(x => x.Status).IsRequired().HasMaxLength(20);
            b.HasIndex(x => x.PublicId).IsUnique();
            b.HasIndex(x => new { x.Username, x.LoginAt });
        });

        modelBuilder.Entity<SysGradingRuleSet>(b =>
        {
            b.ToTable("Sys_GradingRuleSets");
            b.HasKey(x => x.AutoId);
            b.Property(x => x.RuleSetName).IsRequired().HasMaxLength(200);
            b.Property(x => x.ProcessScoreWeight).HasPrecision(5, 2).HasDefaultValue(0.40m);
            b.Property(x => x.ExamScoreWeight).HasPrecision(5, 2).HasDefaultValue(0.60m);
            b.Property(x => x.EmployerScoreWeight).HasPrecision(5, 2).HasDefaultValue(0.00m);
            b.Property(x => x.RequiredWeeklyReportsCount).HasDefaultValue(6);
            b.Property(x => x.StepPenaltyPerLateReport).HasPrecision(5, 2).HasDefaultValue(0.5m);
            b.Property(x => x.StepPenaltyPerMissingReport).HasPrecision(5, 2).HasDefaultValue(2.0m);
            b.Property(x => x.RequireFinalReportForExamEligibility).HasDefaultValue(true);
            b.Property(x => x.WeeklyDeadlineDay).HasDefaultValue(5);
            b.Property(x => x.LatePenaltyPointsPerDay).HasPrecision(5, 2);
            b.Property(x => x.MinimumPassingScore).HasPrecision(4, 2).HasDefaultValue(5.0m);
            b.HasIndex(x => x.PublicId).IsUnique();
            b.HasIndex(x => new { x.SemesterId, x.DepartmentId })
                .IsUnique()
                .HasFilter("[IsDeleted] = 0");
        });

        modelBuilder.Entity<EmployerEvaluation>(b =>
        {
            b.ToTable("EmployerEvaluations");
            b.HasKey(x => x.AutoId);
            b.Property(x => x.RubricScoresJson).HasColumnType("nvarchar(max)");
            b.Property(x => x.Strengths).HasMaxLength(2000);
            b.Property(x => x.AreasForImprovement).HasMaxLength(2000);
            b.Property(x => x.Comments).HasMaxLength(3000);
            b.Property(x => x.ConfirmedMentorName).IsRequired().HasMaxLength(200);
            b.Property(x => x.FinalScore).HasPrecision(4, 2);
            b.HasIndex(x => x.PublicId).IsUnique();
            b.HasIndex(x => x.InternshipId);
            b.HasIndex(x => x.TokenId);
            b.HasOne(x => x.Internship).WithMany().HasForeignKey(x => x.InternshipId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.Token)
                .WithMany()
                .HasForeignKey(x => x.TokenId)
                .HasPrincipalKey(x => x.PublicId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<EmployerEvaluationToken>(b =>
        {
            b.ToTable("EmployerEvaluationTokens");
            b.HasKey(x => x.AutoId);
            b.HasAlternateKey(x => x.PublicId);
            b.Property(x => x.Token).IsRequired().HasMaxLength(64);
            b.Property(x => x.MentorEmail).IsRequired().HasMaxLength(200);
            b.Property(x => x.MentorName).IsRequired().HasMaxLength(200);
            b.Property(x => x.RubricSnapshotJson).HasColumnType("nvarchar(max)");
            b.Property(x => x.IsUsed).HasDefaultValue(false);
            b.HasIndex(x => x.PublicId).IsUnique();
            b.HasIndex(x => x.Token).IsUnique();
            b.HasOne(x => x.Internship).WithMany().HasForeignKey(x => x.InternshipId);
        });

        modelBuilder.Entity<SysAuditLog>(b =>
        {
            b.ToTable("Sys_AuditLogs");
            b.HasKey(x => x.AutoId);
            b.Property(x => x.TableName).IsRequired().HasMaxLength(200);
            b.Property(x => x.ActionType).IsRequired().HasMaxLength(30);
            b.Property(x => x.RecordId).IsRequired().HasMaxLength(100);
            b.Property(x => x.FunctionCode).HasMaxLength(100);
            b.Property(x => x.IpAddress).HasMaxLength(45);
            b.Property(x => x.Username).HasMaxLength(200);
            b.HasIndex(x => x.PublicId).IsUnique();
            b.HasIndex(x => new { x.UserId, x.CreatedAt });
            b.HasIndex(x => new { x.TableName, x.RecordId, x.CreatedAt });
        });

        modelBuilder.Entity<SysWebhook>(b =>
        {
            b.ToTable("Sys_Webhooks");
            b.HasKey(x => x.AutoId);
            b.Property(x => x.WebhookUrl).IsRequired().HasMaxLength(2048);
            b.Property(x => x.EventType).IsRequired().HasMaxLength(100);
            b.Property(x => x.SecretKey).IsRequired().HasMaxLength(512);
            b.Property(x => x.IsActive).HasDefaultValue(true);
            b.Property(x => x.LastStatus).HasMaxLength(1000);
            b.HasIndex(x => x.PublicId).IsUnique();
            b.HasQueryFilter(x => !x.IsDeleted);
        });

        modelBuilder.Entity<SysFieldPolicy>(b =>
        {
            b.ToTable("Sys_FieldPolicies");
            b.HasKey(x => x.AutoId);
            b.Property(x => x.FormCode).IsRequired().HasMaxLength(100);
            b.Property(x => x.FieldKey).IsRequired().HasMaxLength(100);
            b.Property(x => x.CustomLabel).HasMaxLength(200);
            b.Property(x => x.DefaultValue).HasMaxLength(1000);
            b.Property(x => x.ValidationRegex).HasMaxLength(500);
            b.Property(x => x.ErrorMessage).HasMaxLength(500);
            b.HasIndex(x => x.PublicId).IsUnique();
            b.HasIndex(x => new { x.FormCode, x.FieldKey, x.RoleId })
                .IsUnique()
                .HasFilter("[IsDeleted] = 0");
            b.HasOne(x => x.Role)
                .WithMany()
                .HasForeignKey(x => x.RoleId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static readonly HashSet<string> SensitivePropertyNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "SecretKey",
        "PasswordHash",
        "Password",
        "RefreshToken",
        "Token"
    };

    public override int SaveChanges()
    {
        ProcessAuditLogs();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ProcessAuditLogs();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void ProcessAuditLogs()
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.Entity is not SysAuditLog && e.Entity is not SysLoginLog && (e.State == EntityState.Added || e.State == EntityState.Modified || e.State == EntityState.Deleted))
            .ToList();

        if (entries.Count == 0) return;

        var logsToAdd = new List<SysAuditLog>();
        var now = DateTime.UtcNow;

        foreach (var entry in entries)
        {
            var tableName = entry.Metadata.GetTableName() ?? entry.Metadata.ClrType.Name;
            var recordId = entry.Entity is BaseEntity baseEntity
                ? (baseEntity.PublicId != Guid.Empty ? baseEntity.PublicId.ToString() : baseEntity.AutoId.ToString())
                : entry.Properties.FirstOrDefault(p => p.Metadata.IsPrimaryKey())?.CurrentValue?.ToString() ?? string.Empty;

            if (entry.Entity is BaseEntity be)
            {
                if (entry.State == EntityState.Added)
                {
                    if (be.PublicId == Guid.Empty) be.PublicId = Guid.NewGuid();
                    recordId = be.PublicId.ToString();
                    if (be.CreatedAt == default)
                    {
                        be.CreatedAt = now;
                    }
                }
                else if (entry.State == EntityState.Modified)
                {
                    be.UpdatedAt = now;
                }
            }

            if (entry.State == EntityState.Added)
            {
                var newValues = new Dictionary<string, object?>();
                foreach (var prop in entry.Properties)
                {
                    if (!SensitivePropertyNames.Contains(prop.Metadata.Name))
                    {
                        newValues[prop.Metadata.Name] = prop.CurrentValue;
                    }
                }

                logsToAdd.Add(new SysAuditLog
                {
                    TableName = tableName,
                    ActionType = "CREATE",
                    RecordId = recordId,
                    NewValuesJson = JsonSerializer.Serialize(newValues),
                    CreatedAt = now
                });
            }
            else if (entry.State == EntityState.Modified)
            {
                var oldValues = new Dictionary<string, object?>();
                var newValues = new Dictionary<string, object?>();
                foreach (var prop in entry.Properties)
                {
                    if (prop.IsModified && !SensitivePropertyNames.Contains(prop.Metadata.Name))
                    {
                        oldValues[prop.Metadata.Name] = prop.OriginalValue;
                        newValues[prop.Metadata.Name] = prop.CurrentValue;
                    }
                }

                logsToAdd.Add(new SysAuditLog
                {
                    TableName = tableName,
                    ActionType = "UPDATE",
                    RecordId = recordId,
                    OldValuesJson = JsonSerializer.Serialize(oldValues),
                    NewValuesJson = JsonSerializer.Serialize(newValues),
                    CreatedAt = now
                });
            }
            else if (entry.State == EntityState.Deleted)
            {
                if (entry.Entity is SysWebhook)
                {
                    entry.State = EntityState.Modified;
                    if (entry.Entity is BaseEntity softEntity)
                    {
                        softEntity.IsDeleted = true;
                        softEntity.DeletedAt = now;
                    }

                    var oldValues = new Dictionary<string, object?>();
                    foreach (var prop in entry.Properties)
                    {
                        if (!SensitivePropertyNames.Contains(prop.Metadata.Name))
                        {
                            oldValues[prop.Metadata.Name] = prop.OriginalValue ?? prop.CurrentValue;
                        }
                    }

                    logsToAdd.Add(new SysAuditLog
                    {
                        TableName = tableName,
                        ActionType = "SOFT_DELETE",
                        RecordId = recordId,
                        OldValuesJson = JsonSerializer.Serialize(oldValues),
                        CreatedAt = now
                    });
                }
                else
                {
                    var oldValues = new Dictionary<string, object?>();
                    foreach (var prop in entry.Properties)
                    {
                        if (!SensitivePropertyNames.Contains(prop.Metadata.Name))
                        {
                            oldValues[prop.Metadata.Name] = prop.OriginalValue ?? prop.CurrentValue;
                        }
                    }

                    logsToAdd.Add(new SysAuditLog
                    {
                        TableName = tableName,
                        ActionType = "DELETE",
                        RecordId = recordId,
                        OldValuesJson = JsonSerializer.Serialize(oldValues),
                        CreatedAt = now
                    });
                }
            }
        }

        if (logsToAdd.Count > 0)
        {
            SysAuditLogs.AddRange(logsToAdd);
        }
    }
}

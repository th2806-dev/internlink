using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Add_Enterprise_BaseEntity_And_Audit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AccountRequests_Users_RequesterUserId",
                table: "AccountRequests");

            migrationBuilder.DropForeignKey(
                name: "FK_AttendanceRecords_AttendanceSessions_AttendanceSessionId",
                table: "AttendanceRecords");

            migrationBuilder.DropForeignKey(
                name: "FK_AttendanceRecords_Internships_InternshipId",
                table: "AttendanceRecords");

            migrationBuilder.DropForeignKey(
                name: "FK_AttendanceSessions_Lecturers_LecturerId",
                table: "AttendanceSessions");

            migrationBuilder.DropForeignKey(
                name: "FK_AttendanceSessions_Semesters_SemesterId",
                table: "AttendanceSessions");

            migrationBuilder.DropForeignKey(
                name: "FK_Companies_Departments_DepartmentId",
                table: "Companies");

            migrationBuilder.DropForeignKey(
                name: "FK_CompanyPositions_Companies_CompanyId",
                table: "CompanyPositions");

            migrationBuilder.DropForeignKey(
                name: "FK_CompanyPositions_Semesters_SemesterId",
                table: "CompanyPositions");

            migrationBuilder.DropForeignKey(
                name: "FK_Documents_Internships_InternshipId",
                table: "Documents");

            migrationBuilder.DropForeignKey(
                name: "FK_Documents_Lecturers_UploadedById",
                table: "Documents");

            migrationBuilder.DropForeignKey(
                name: "FK_Documents_Semesters_SemesterId",
                table: "Documents");

            migrationBuilder.DropForeignKey(
                name: "FK_DocumentVersions_Documents_DocumentId",
                table: "DocumentVersions");

            migrationBuilder.DropForeignKey(
                name: "FK_EvaluationRubricCriteria_EvaluationRubrics_RubricId",
                table: "EvaluationRubricCriteria");

            migrationBuilder.DropForeignKey(
                name: "FK_EvaluationRubrics_Semesters_SemesterId",
                table: "EvaluationRubrics");

            migrationBuilder.DropForeignKey(
                name: "FK_EvaluationRubrics_Users_ApprovedById",
                table: "EvaluationRubrics");

            migrationBuilder.DropForeignKey(
                name: "FK_EvaluationRubrics_Users_SubmittedById",
                table: "EvaluationRubrics");

            migrationBuilder.DropForeignKey(
                name: "FK_Evaluations_EvaluationRubrics_RubricId",
                table: "Evaluations");

            migrationBuilder.DropForeignKey(
                name: "FK_Evaluations_Internships_InternshipId",
                table: "Evaluations");

            migrationBuilder.DropForeignKey(
                name: "FK_Evaluations_Users_EvaluatedById",
                table: "Evaluations");

            migrationBuilder.DropForeignKey(
                name: "FK_Feedbacks_Lecturers_LecturerId",
                table: "Feedbacks");

            migrationBuilder.DropForeignKey(
                name: "FK_Feedbacks_Submissions_SubmissionId",
                table: "Feedbacks");

            migrationBuilder.DropForeignKey(
                name: "FK_Feedbacks_WeeklyReports_WeeklyReportId",
                table: "Feedbacks");

            migrationBuilder.DropForeignKey(
                name: "FK_Internships_Companies_CompanyId",
                table: "Internships");

            migrationBuilder.DropForeignKey(
                name: "FK_Internships_Lecturers_LecturerId",
                table: "Internships");

            migrationBuilder.DropForeignKey(
                name: "FK_Internships_Semesters_SemesterId",
                table: "Internships");

            migrationBuilder.DropForeignKey(
                name: "FK_Internships_Students_StudentId",
                table: "Internships");

            migrationBuilder.DropForeignKey(
                name: "FK_Lecturers_Departments_DepartmentId",
                table: "Lecturers");

            migrationBuilder.DropForeignKey(
                name: "FK_Lecturers_Users_UserId",
                table: "Lecturers");

            migrationBuilder.DropForeignKey(
                name: "FK_LecturerSemesterSummaries_Lecturers_LecturerId",
                table: "LecturerSemesterSummaries");

            migrationBuilder.DropForeignKey(
                name: "FK_LecturerSemesterSummaries_Semesters_SemesterId",
                table: "LecturerSemesterSummaries");

            migrationBuilder.DropForeignKey(
                name: "FK_Notifications_Users_UserId",
                table: "Notifications");

            migrationBuilder.DropForeignKey(
                name: "FK_PasswordResetTokens_Users_UserId",
                table: "PasswordResetTokens");

            migrationBuilder.DropForeignKey(
                name: "FK_RefreshTokens_Users_UserId",
                table: "RefreshTokens");

            migrationBuilder.DropForeignKey(
                name: "FK_SemesterCompanies_Companies_CompanyId",
                table: "SemesterCompanies");

            migrationBuilder.DropForeignKey(
                name: "FK_SemesterCompanies_Semesters_SemesterId",
                table: "SemesterCompanies");

            migrationBuilder.DropForeignKey(
                name: "FK_SemesterFacultySummaries_Departments_DepartmentId",
                table: "SemesterFacultySummaries");

            migrationBuilder.DropForeignKey(
                name: "FK_SemesterFacultySummaries_Semesters_SemesterId",
                table: "SemesterFacultySummaries");

            migrationBuilder.DropForeignKey(
                name: "FK_SemesterLecturers_Lecturers_LecturerId",
                table: "SemesterLecturers");

            migrationBuilder.DropForeignKey(
                name: "FK_SemesterLecturers_Semesters_SemesterId",
                table: "SemesterLecturers");

            migrationBuilder.DropForeignKey(
                name: "FK_SemesterReportSchedules_Lecturers_LecturerId",
                table: "SemesterReportSchedules");

            migrationBuilder.DropForeignKey(
                name: "FK_SemesterReportSchedules_Semesters_SemesterId",
                table: "SemesterReportSchedules");

            migrationBuilder.DropForeignKey(
                name: "FK_Semesters_Departments_DepartmentId",
                table: "Semesters");

            migrationBuilder.DropForeignKey(
                name: "FK_Students_Departments_DepartmentId",
                table: "Students");

            migrationBuilder.DropForeignKey(
                name: "FK_Students_Users_UserId",
                table: "Students");

            migrationBuilder.DropForeignKey(
                name: "FK_SubmissionAssets_Submissions_SubmissionId",
                table: "SubmissionAssets");

            migrationBuilder.DropForeignKey(
                name: "FK_Submissions_Internships_InternshipId",
                table: "Submissions");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Departments_DepartmentId",
                table: "Users");

            migrationBuilder.DropForeignKey(
                name: "FK_WeeklyReports_Internships_InternshipId",
                table: "WeeklyReports");

            migrationBuilder.DropForeignKey(
                name: "FK_WeeklyReportVersions_WeeklyReports_WeeklyReportId",
                table: "WeeklyReportVersions");

            migrationBuilder.RenameColumn(
                name: "Notes",
                table: "Internships",
                newName: "Ghi_Chu");

            migrationBuilder.RenameColumn(
                name: "Notes",
                table: "AttendanceRecords",
                newName: "Ghi_Chu");

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "WeeklyReportVersions",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "WeeklyReportVersions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "WeeklyReportVersions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "WeeklyReportVersions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "WeeklyReportVersions",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "WeeklyReportVersions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "WeeklyReports",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "WeeklyReports",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "WeeklyReports",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "WeeklyReports",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "WeeklyReports",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "WeeklyReports",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "Users",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "Users",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "Users",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "Users",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "Users",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "SystemSettings",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "SystemSettings",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "SystemSettings",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "SystemSettings",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "SystemSettings",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "SystemSettings",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "Submissions",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "Submissions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "Submissions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "Submissions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "Submissions",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "Submissions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "SubmissionAssets",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "SubmissionAssets",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "SubmissionAssets",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "SubmissionAssets",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "SubmissionAssets",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "SubmissionAssets",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "Students",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "Students",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "Students",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "Students",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "Students",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "Students",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "Semesters",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "Semesters",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "Semesters",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "Semesters",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "Semesters",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "Semesters",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "SemesterReportSchedules",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "SemesterReportSchedules",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "SemesterReportSchedules",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "SemesterReportSchedules",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "SemesterReportSchedules",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "SemesterReportSchedules",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "SemesterLecturers",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "SemesterLecturers",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "SemesterLecturers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "SemesterLecturers",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "SemesterLecturers",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "SemesterLecturers",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "SemesterFacultySummaries",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "SemesterFacultySummaries",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "SemesterFacultySummaries",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "SemesterFacultySummaries",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "SemesterFacultySummaries",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "SemesterFacultySummaries",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "SemesterCompanies",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "SemesterCompanies",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "SemesterCompanies",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "SemesterCompanies",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "SemesterCompanies",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "SemesterCompanies",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "SchoolAcademicTerms",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "SchoolAcademicTerms",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "SchoolAcademicTerms",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "SchoolAcademicTerms",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "SchoolAcademicTerms",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "SchoolAcademicTerms",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "RefreshTokens",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "RefreshTokens",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "RefreshTokens",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "RefreshTokens",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "RefreshTokens",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "RefreshTokens",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "PasswordResetTokens",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "PasswordResetTokens",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "PasswordResetTokens",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "PasswordResetTokens",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "PasswordResetTokens",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "PasswordResetTokens",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "Notifications",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "Notifications",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "Notifications",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "Notifications",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "Notifications",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "Notifications",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "LecturerSemesterSummaries",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "LecturerSemesterSummaries",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "LecturerSemesterSummaries",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "LecturerSemesterSummaries",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "LecturerSemesterSummaries",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "LecturerSemesterSummaries",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "Lecturers",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "Lecturers",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "Lecturers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "Lecturers",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "Lecturers",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "Lecturers",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "LecturerActivityLogs",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "LecturerActivityLogs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "LecturerActivityLogs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "LecturerActivityLogs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "LecturerActivityLogs",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "LecturerActivityLogs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Ghi_Chu",
                table: "Internships",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "Internships",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "Internships",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "Internships",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "Internships",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "Internships",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "Feedbacks",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "Feedbacks",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "Feedbacks",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "Feedbacks",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "Feedbacks",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "Feedbacks",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "Evaluations",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "Evaluations",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "Evaluations",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "Evaluations",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "Evaluations",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "Evaluations",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "EvaluationRubrics",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "EvaluationRubrics",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "EvaluationRubrics",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "EvaluationRubrics",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "EvaluationRubrics",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "EvaluationRubrics",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "EvaluationRubricCriteria",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "EvaluationRubricCriteria",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "EvaluationRubricCriteria",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "EvaluationRubricCriteria",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "EvaluationRubricCriteria",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "EvaluationRubricCriteria",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "DocumentVersions",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "DocumentVersions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "DocumentVersions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "DocumentVersions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "DocumentVersions",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "DocumentVersions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "Documents",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "Documents",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "Documents",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "Documents",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "Documents",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "Documents",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "Departments",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "Departments",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "Departments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "Departments",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "Departments",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "Departments",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "CompanyPositions",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "CompanyPositions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "CompanyPositions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "CompanyPositions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "CompanyPositions",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "CompanyPositions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "Companies",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "Companies",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "Companies",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "Companies",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "Companies",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "Companies",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "AttendanceSessions",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "AttendanceSessions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "AttendanceSessions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "AttendanceSessions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "AttendanceSessions",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "AttendanceSessions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "AttendanceRecords",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "AttendanceRecords",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "AttendanceRecords",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "AttendanceRecords",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "AttendanceRecords",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "Auto_ID",
                table: "AccountRequests",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "Created_By_Function",
                table: "AccountRequests",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deleted_At",
                table: "AccountRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Deleted_By",
                table: "AccountRequests",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ghi_Chu",
                table: "AccountRequests",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Updated_By_Function",
                table: "AccountRequests",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "UX_WeeklyReportVersions_Auto_ID",
                table: "WeeklyReportVersions",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_WeeklyReports_Auto_ID",
                table: "WeeklyReports",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_Users_Auto_ID",
                table: "Users",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_SystemSettings_Auto_ID",
                table: "SystemSettings",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_Submissions_Auto_ID",
                table: "Submissions",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_SubmissionAssets_Auto_ID",
                table: "SubmissionAssets",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_Students_Auto_ID",
                table: "Students",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_Semesters_Auto_ID",
                table: "Semesters",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_SemesterReportSchedules_Auto_ID",
                table: "SemesterReportSchedules",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_SemesterLecturers_Auto_ID",
                table: "SemesterLecturers",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_SemesterFacultySummaries_Auto_ID",
                table: "SemesterFacultySummaries",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_SemesterCompanies_Auto_ID",
                table: "SemesterCompanies",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_SchoolAcademicTerms_Auto_ID",
                table: "SchoolAcademicTerms",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_RefreshTokens_Auto_ID",
                table: "RefreshTokens",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_PasswordResetTokens_Auto_ID",
                table: "PasswordResetTokens",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_Notifications_Auto_ID",
                table: "Notifications",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_LecturerSemesterSummaries_Auto_ID",
                table: "LecturerSemesterSummaries",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_Lecturers_Auto_ID",
                table: "Lecturers",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_LecturerActivityLogs_Auto_ID",
                table: "LecturerActivityLogs",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_Internships_Auto_ID",
                table: "Internships",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_Feedbacks_Auto_ID",
                table: "Feedbacks",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_Evaluations_Auto_ID",
                table: "Evaluations",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_EvaluationRubrics_Auto_ID",
                table: "EvaluationRubrics",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_EvaluationRubricCriteria_Auto_ID",
                table: "EvaluationRubricCriteria",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_DocumentVersions_Auto_ID",
                table: "DocumentVersions",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_Documents_Auto_ID",
                table: "Documents",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_Departments_Auto_ID",
                table: "Departments",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_CompanyPositions_Auto_ID",
                table: "CompanyPositions",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_Companies_Auto_ID",
                table: "Companies",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_AttendanceSessions_Auto_ID",
                table: "AttendanceSessions",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_AttendanceRecords_Auto_ID",
                table: "AttendanceRecords",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_AccountRequests_Auto_ID",
                table: "AccountRequests",
                column: "Auto_ID",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_AccountRequests_Users_RequesterUserId",
                table: "AccountRequests",
                column: "RequesterUserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_AttendanceRecords_AttendanceSessions_AttendanceSessionId",
                table: "AttendanceRecords",
                column: "AttendanceSessionId",
                principalTable: "AttendanceSessions",
                principalColumn: "AttendanceSessionId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_AttendanceRecords_Internships_InternshipId",
                table: "AttendanceRecords",
                column: "InternshipId",
                principalTable: "Internships",
                principalColumn: "InternshipId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_AttendanceSessions_Lecturers_LecturerId",
                table: "AttendanceSessions",
                column: "LecturerId",
                principalTable: "Lecturers",
                principalColumn: "LecturerId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_AttendanceSessions_Semesters_SemesterId",
                table: "AttendanceSessions",
                column: "SemesterId",
                principalTable: "Semesters",
                principalColumn: "SemesterId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Companies_Departments_DepartmentId",
                table: "Companies",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "DepartmentId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_CompanyPositions_Companies_CompanyId",
                table: "CompanyPositions",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "CompanyId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_CompanyPositions_Semesters_SemesterId",
                table: "CompanyPositions",
                column: "SemesterId",
                principalTable: "Semesters",
                principalColumn: "SemesterId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Documents_Internships_InternshipId",
                table: "Documents",
                column: "InternshipId",
                principalTable: "Internships",
                principalColumn: "InternshipId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Documents_Lecturers_UploadedById",
                table: "Documents",
                column: "UploadedById",
                principalTable: "Lecturers",
                principalColumn: "LecturerId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Documents_Semesters_SemesterId",
                table: "Documents",
                column: "SemesterId",
                principalTable: "Semesters",
                principalColumn: "SemesterId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_DocumentVersions_Documents_DocumentId",
                table: "DocumentVersions",
                column: "DocumentId",
                principalTable: "Documents",
                principalColumn: "DocumentId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_EvaluationRubricCriteria_EvaluationRubrics_RubricId",
                table: "EvaluationRubricCriteria",
                column: "RubricId",
                principalTable: "EvaluationRubrics",
                principalColumn: "EvaluationRubricId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_EvaluationRubrics_Semesters_SemesterId",
                table: "EvaluationRubrics",
                column: "SemesterId",
                principalTable: "Semesters",
                principalColumn: "SemesterId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_EvaluationRubrics_Users_ApprovedById",
                table: "EvaluationRubrics",
                column: "ApprovedById",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_EvaluationRubrics_Users_SubmittedById",
                table: "EvaluationRubrics",
                column: "SubmittedById",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Evaluations_EvaluationRubrics_RubricId",
                table: "Evaluations",
                column: "RubricId",
                principalTable: "EvaluationRubrics",
                principalColumn: "EvaluationRubricId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Evaluations_Internships_InternshipId",
                table: "Evaluations",
                column: "InternshipId",
                principalTable: "Internships",
                principalColumn: "InternshipId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Evaluations_Users_EvaluatedById",
                table: "Evaluations",
                column: "EvaluatedById",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Feedbacks_Lecturers_LecturerId",
                table: "Feedbacks",
                column: "LecturerId",
                principalTable: "Lecturers",
                principalColumn: "LecturerId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Feedbacks_Submissions_SubmissionId",
                table: "Feedbacks",
                column: "SubmissionId",
                principalTable: "Submissions",
                principalColumn: "SubmissionId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Feedbacks_WeeklyReports_WeeklyReportId",
                table: "Feedbacks",
                column: "WeeklyReportId",
                principalTable: "WeeklyReports",
                principalColumn: "WeeklyReportId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Internships_Companies_CompanyId",
                table: "Internships",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "CompanyId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Internships_Lecturers_LecturerId",
                table: "Internships",
                column: "LecturerId",
                principalTable: "Lecturers",
                principalColumn: "LecturerId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Internships_Semesters_SemesterId",
                table: "Internships",
                column: "SemesterId",
                principalTable: "Semesters",
                principalColumn: "SemesterId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Internships_Students_StudentId",
                table: "Internships",
                column: "StudentId",
                principalTable: "Students",
                principalColumn: "StudentId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Lecturers_Departments_DepartmentId",
                table: "Lecturers",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "DepartmentId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Lecturers_Users_UserId",
                table: "Lecturers",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_LecturerSemesterSummaries_Lecturers_LecturerId",
                table: "LecturerSemesterSummaries",
                column: "LecturerId",
                principalTable: "Lecturers",
                principalColumn: "LecturerId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_LecturerSemesterSummaries_Semesters_SemesterId",
                table: "LecturerSemesterSummaries",
                column: "SemesterId",
                principalTable: "Semesters",
                principalColumn: "SemesterId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Notifications_Users_UserId",
                table: "Notifications",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PasswordResetTokens_Users_UserId",
                table: "PasswordResetTokens",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_RefreshTokens_Users_UserId",
                table: "RefreshTokens",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_SemesterCompanies_Companies_CompanyId",
                table: "SemesterCompanies",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "CompanyId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_SemesterCompanies_Semesters_SemesterId",
                table: "SemesterCompanies",
                column: "SemesterId",
                principalTable: "Semesters",
                principalColumn: "SemesterId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_SemesterFacultySummaries_Departments_DepartmentId",
                table: "SemesterFacultySummaries",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "DepartmentId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_SemesterFacultySummaries_Semesters_SemesterId",
                table: "SemesterFacultySummaries",
                column: "SemesterId",
                principalTable: "Semesters",
                principalColumn: "SemesterId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_SemesterLecturers_Lecturers_LecturerId",
                table: "SemesterLecturers",
                column: "LecturerId",
                principalTable: "Lecturers",
                principalColumn: "LecturerId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_SemesterLecturers_Semesters_SemesterId",
                table: "SemesterLecturers",
                column: "SemesterId",
                principalTable: "Semesters",
                principalColumn: "SemesterId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_SemesterReportSchedules_Lecturers_LecturerId",
                table: "SemesterReportSchedules",
                column: "LecturerId",
                principalTable: "Lecturers",
                principalColumn: "LecturerId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_SemesterReportSchedules_Semesters_SemesterId",
                table: "SemesterReportSchedules",
                column: "SemesterId",
                principalTable: "Semesters",
                principalColumn: "SemesterId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Semesters_Departments_DepartmentId",
                table: "Semesters",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "DepartmentId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Students_Departments_DepartmentId",
                table: "Students",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "DepartmentId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Students_Users_UserId",
                table: "Students",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_SubmissionAssets_Submissions_SubmissionId",
                table: "SubmissionAssets",
                column: "SubmissionId",
                principalTable: "Submissions",
                principalColumn: "SubmissionId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Submissions_Internships_InternshipId",
                table: "Submissions",
                column: "InternshipId",
                principalTable: "Internships",
                principalColumn: "InternshipId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Departments_DepartmentId",
                table: "Users",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "DepartmentId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WeeklyReports_Internships_InternshipId",
                table: "WeeklyReports",
                column: "InternshipId",
                principalTable: "Internships",
                principalColumn: "InternshipId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WeeklyReportVersions_WeeklyReports_WeeklyReportId",
                table: "WeeklyReportVersions",
                column: "WeeklyReportId",
                principalTable: "WeeklyReports",
                principalColumn: "WeeklyReportId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AccountRequests_Users_RequesterUserId",
                table: "AccountRequests");

            migrationBuilder.DropForeignKey(
                name: "FK_AttendanceRecords_AttendanceSessions_AttendanceSessionId",
                table: "AttendanceRecords");

            migrationBuilder.DropForeignKey(
                name: "FK_AttendanceRecords_Internships_InternshipId",
                table: "AttendanceRecords");

            migrationBuilder.DropForeignKey(
                name: "FK_AttendanceSessions_Lecturers_LecturerId",
                table: "AttendanceSessions");

            migrationBuilder.DropForeignKey(
                name: "FK_AttendanceSessions_Semesters_SemesterId",
                table: "AttendanceSessions");

            migrationBuilder.DropForeignKey(
                name: "FK_Companies_Departments_DepartmentId",
                table: "Companies");

            migrationBuilder.DropForeignKey(
                name: "FK_CompanyPositions_Companies_CompanyId",
                table: "CompanyPositions");

            migrationBuilder.DropForeignKey(
                name: "FK_CompanyPositions_Semesters_SemesterId",
                table: "CompanyPositions");

            migrationBuilder.DropForeignKey(
                name: "FK_Documents_Internships_InternshipId",
                table: "Documents");

            migrationBuilder.DropForeignKey(
                name: "FK_Documents_Lecturers_UploadedById",
                table: "Documents");

            migrationBuilder.DropForeignKey(
                name: "FK_Documents_Semesters_SemesterId",
                table: "Documents");

            migrationBuilder.DropForeignKey(
                name: "FK_DocumentVersions_Documents_DocumentId",
                table: "DocumentVersions");

            migrationBuilder.DropForeignKey(
                name: "FK_EvaluationRubricCriteria_EvaluationRubrics_RubricId",
                table: "EvaluationRubricCriteria");

            migrationBuilder.DropForeignKey(
                name: "FK_EvaluationRubrics_Semesters_SemesterId",
                table: "EvaluationRubrics");

            migrationBuilder.DropForeignKey(
                name: "FK_EvaluationRubrics_Users_ApprovedById",
                table: "EvaluationRubrics");

            migrationBuilder.DropForeignKey(
                name: "FK_EvaluationRubrics_Users_SubmittedById",
                table: "EvaluationRubrics");

            migrationBuilder.DropForeignKey(
                name: "FK_Evaluations_EvaluationRubrics_RubricId",
                table: "Evaluations");

            migrationBuilder.DropForeignKey(
                name: "FK_Evaluations_Internships_InternshipId",
                table: "Evaluations");

            migrationBuilder.DropForeignKey(
                name: "FK_Evaluations_Users_EvaluatedById",
                table: "Evaluations");

            migrationBuilder.DropForeignKey(
                name: "FK_Feedbacks_Lecturers_LecturerId",
                table: "Feedbacks");

            migrationBuilder.DropForeignKey(
                name: "FK_Feedbacks_Submissions_SubmissionId",
                table: "Feedbacks");

            migrationBuilder.DropForeignKey(
                name: "FK_Feedbacks_WeeklyReports_WeeklyReportId",
                table: "Feedbacks");

            migrationBuilder.DropForeignKey(
                name: "FK_Internships_Companies_CompanyId",
                table: "Internships");

            migrationBuilder.DropForeignKey(
                name: "FK_Internships_Lecturers_LecturerId",
                table: "Internships");

            migrationBuilder.DropForeignKey(
                name: "FK_Internships_Semesters_SemesterId",
                table: "Internships");

            migrationBuilder.DropForeignKey(
                name: "FK_Internships_Students_StudentId",
                table: "Internships");

            migrationBuilder.DropForeignKey(
                name: "FK_Lecturers_Departments_DepartmentId",
                table: "Lecturers");

            migrationBuilder.DropForeignKey(
                name: "FK_Lecturers_Users_UserId",
                table: "Lecturers");

            migrationBuilder.DropForeignKey(
                name: "FK_LecturerSemesterSummaries_Lecturers_LecturerId",
                table: "LecturerSemesterSummaries");

            migrationBuilder.DropForeignKey(
                name: "FK_LecturerSemesterSummaries_Semesters_SemesterId",
                table: "LecturerSemesterSummaries");

            migrationBuilder.DropForeignKey(
                name: "FK_Notifications_Users_UserId",
                table: "Notifications");

            migrationBuilder.DropForeignKey(
                name: "FK_PasswordResetTokens_Users_UserId",
                table: "PasswordResetTokens");

            migrationBuilder.DropForeignKey(
                name: "FK_RefreshTokens_Users_UserId",
                table: "RefreshTokens");

            migrationBuilder.DropForeignKey(
                name: "FK_SemesterCompanies_Companies_CompanyId",
                table: "SemesterCompanies");

            migrationBuilder.DropForeignKey(
                name: "FK_SemesterCompanies_Semesters_SemesterId",
                table: "SemesterCompanies");

            migrationBuilder.DropForeignKey(
                name: "FK_SemesterFacultySummaries_Departments_DepartmentId",
                table: "SemesterFacultySummaries");

            migrationBuilder.DropForeignKey(
                name: "FK_SemesterFacultySummaries_Semesters_SemesterId",
                table: "SemesterFacultySummaries");

            migrationBuilder.DropForeignKey(
                name: "FK_SemesterLecturers_Lecturers_LecturerId",
                table: "SemesterLecturers");

            migrationBuilder.DropForeignKey(
                name: "FK_SemesterLecturers_Semesters_SemesterId",
                table: "SemesterLecturers");

            migrationBuilder.DropForeignKey(
                name: "FK_SemesterReportSchedules_Lecturers_LecturerId",
                table: "SemesterReportSchedules");

            migrationBuilder.DropForeignKey(
                name: "FK_SemesterReportSchedules_Semesters_SemesterId",
                table: "SemesterReportSchedules");

            migrationBuilder.DropForeignKey(
                name: "FK_Semesters_Departments_DepartmentId",
                table: "Semesters");

            migrationBuilder.DropForeignKey(
                name: "FK_Students_Departments_DepartmentId",
                table: "Students");

            migrationBuilder.DropForeignKey(
                name: "FK_Students_Users_UserId",
                table: "Students");

            migrationBuilder.DropForeignKey(
                name: "FK_SubmissionAssets_Submissions_SubmissionId",
                table: "SubmissionAssets");

            migrationBuilder.DropForeignKey(
                name: "FK_Submissions_Internships_InternshipId",
                table: "Submissions");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Departments_DepartmentId",
                table: "Users");

            migrationBuilder.DropForeignKey(
                name: "FK_WeeklyReports_Internships_InternshipId",
                table: "WeeklyReports");

            migrationBuilder.DropForeignKey(
                name: "FK_WeeklyReportVersions_WeeklyReports_WeeklyReportId",
                table: "WeeklyReportVersions");

            migrationBuilder.DropIndex(
                name: "UX_WeeklyReportVersions_Auto_ID",
                table: "WeeklyReportVersions");

            migrationBuilder.DropIndex(
                name: "UX_WeeklyReports_Auto_ID",
                table: "WeeklyReports");

            migrationBuilder.DropIndex(
                name: "UX_Users_Auto_ID",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "UX_SystemSettings_Auto_ID",
                table: "SystemSettings");

            migrationBuilder.DropIndex(
                name: "UX_Submissions_Auto_ID",
                table: "Submissions");

            migrationBuilder.DropIndex(
                name: "UX_SubmissionAssets_Auto_ID",
                table: "SubmissionAssets");

            migrationBuilder.DropIndex(
                name: "UX_Students_Auto_ID",
                table: "Students");

            migrationBuilder.DropIndex(
                name: "UX_Semesters_Auto_ID",
                table: "Semesters");

            migrationBuilder.DropIndex(
                name: "UX_SemesterReportSchedules_Auto_ID",
                table: "SemesterReportSchedules");

            migrationBuilder.DropIndex(
                name: "UX_SemesterLecturers_Auto_ID",
                table: "SemesterLecturers");

            migrationBuilder.DropIndex(
                name: "UX_SemesterFacultySummaries_Auto_ID",
                table: "SemesterFacultySummaries");

            migrationBuilder.DropIndex(
                name: "UX_SemesterCompanies_Auto_ID",
                table: "SemesterCompanies");

            migrationBuilder.DropIndex(
                name: "UX_SchoolAcademicTerms_Auto_ID",
                table: "SchoolAcademicTerms");

            migrationBuilder.DropIndex(
                name: "UX_RefreshTokens_Auto_ID",
                table: "RefreshTokens");

            migrationBuilder.DropIndex(
                name: "UX_PasswordResetTokens_Auto_ID",
                table: "PasswordResetTokens");

            migrationBuilder.DropIndex(
                name: "UX_Notifications_Auto_ID",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "UX_LecturerSemesterSummaries_Auto_ID",
                table: "LecturerSemesterSummaries");

            migrationBuilder.DropIndex(
                name: "UX_Lecturers_Auto_ID",
                table: "Lecturers");

            migrationBuilder.DropIndex(
                name: "UX_LecturerActivityLogs_Auto_ID",
                table: "LecturerActivityLogs");

            migrationBuilder.DropIndex(
                name: "UX_Internships_Auto_ID",
                table: "Internships");

            migrationBuilder.DropIndex(
                name: "UX_Feedbacks_Auto_ID",
                table: "Feedbacks");

            migrationBuilder.DropIndex(
                name: "UX_Evaluations_Auto_ID",
                table: "Evaluations");

            migrationBuilder.DropIndex(
                name: "UX_EvaluationRubrics_Auto_ID",
                table: "EvaluationRubrics");

            migrationBuilder.DropIndex(
                name: "UX_EvaluationRubricCriteria_Auto_ID",
                table: "EvaluationRubricCriteria");

            migrationBuilder.DropIndex(
                name: "UX_DocumentVersions_Auto_ID",
                table: "DocumentVersions");

            migrationBuilder.DropIndex(
                name: "UX_Documents_Auto_ID",
                table: "Documents");

            migrationBuilder.DropIndex(
                name: "UX_Departments_Auto_ID",
                table: "Departments");

            migrationBuilder.DropIndex(
                name: "UX_CompanyPositions_Auto_ID",
                table: "CompanyPositions");

            migrationBuilder.DropIndex(
                name: "UX_Companies_Auto_ID",
                table: "Companies");

            migrationBuilder.DropIndex(
                name: "UX_AttendanceSessions_Auto_ID",
                table: "AttendanceSessions");

            migrationBuilder.DropIndex(
                name: "UX_AttendanceRecords_Auto_ID",
                table: "AttendanceRecords");

            migrationBuilder.DropIndex(
                name: "UX_AccountRequests_Auto_ID",
                table: "AccountRequests");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "WeeklyReportVersions");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "WeeklyReportVersions");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "WeeklyReportVersions");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "WeeklyReportVersions");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "WeeklyReportVersions");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "WeeklyReportVersions");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "WeeklyReports");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "WeeklyReports");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "WeeklyReports");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "WeeklyReports");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "WeeklyReports");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "WeeklyReports");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "SystemSettings");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "SystemSettings");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "SystemSettings");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "SystemSettings");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "SystemSettings");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "SystemSettings");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "SubmissionAssets");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "SubmissionAssets");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "SubmissionAssets");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "SubmissionAssets");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "SubmissionAssets");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "SubmissionAssets");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "Semesters");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "Semesters");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "Semesters");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "Semesters");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "Semesters");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "Semesters");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "SemesterReportSchedules");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "SemesterReportSchedules");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "SemesterReportSchedules");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "SemesterReportSchedules");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "SemesterReportSchedules");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "SemesterReportSchedules");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "SemesterLecturers");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "SemesterLecturers");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "SemesterLecturers");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "SemesterLecturers");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "SemesterLecturers");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "SemesterLecturers");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "SemesterFacultySummaries");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "SemesterFacultySummaries");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "SemesterFacultySummaries");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "SemesterFacultySummaries");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "SemesterFacultySummaries");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "SemesterFacultySummaries");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "SemesterCompanies");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "SemesterCompanies");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "SemesterCompanies");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "SemesterCompanies");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "SemesterCompanies");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "SemesterCompanies");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "SchoolAcademicTerms");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "SchoolAcademicTerms");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "SchoolAcademicTerms");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "SchoolAcademicTerms");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "SchoolAcademicTerms");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "SchoolAcademicTerms");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "RefreshTokens");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "RefreshTokens");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "RefreshTokens");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "RefreshTokens");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "RefreshTokens");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "RefreshTokens");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "PasswordResetTokens");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "PasswordResetTokens");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "PasswordResetTokens");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "PasswordResetTokens");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "PasswordResetTokens");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "PasswordResetTokens");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "LecturerSemesterSummaries");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "LecturerSemesterSummaries");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "LecturerSemesterSummaries");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "LecturerSemesterSummaries");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "LecturerSemesterSummaries");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "LecturerSemesterSummaries");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "Lecturers");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "Lecturers");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "Lecturers");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "Lecturers");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "Lecturers");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "Lecturers");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "LecturerActivityLogs");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "LecturerActivityLogs");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "LecturerActivityLogs");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "LecturerActivityLogs");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "LecturerActivityLogs");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "LecturerActivityLogs");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "Internships");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "Internships");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "Internships");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "Internships");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "Internships");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "Feedbacks");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "Feedbacks");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "Feedbacks");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "Feedbacks");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "Feedbacks");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "Feedbacks");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "Evaluations");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "Evaluations");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "Evaluations");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "Evaluations");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "Evaluations");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "Evaluations");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "EvaluationRubrics");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "EvaluationRubrics");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "EvaluationRubrics");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "EvaluationRubrics");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "EvaluationRubrics");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "EvaluationRubrics");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "EvaluationRubricCriteria");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "EvaluationRubricCriteria");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "EvaluationRubricCriteria");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "EvaluationRubricCriteria");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "EvaluationRubricCriteria");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "EvaluationRubricCriteria");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "DocumentVersions");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "DocumentVersions");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "DocumentVersions");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "DocumentVersions");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "DocumentVersions");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "DocumentVersions");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "Documents");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "Documents");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "Documents");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "Documents");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "Documents");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "Documents");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "CompanyPositions");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "CompanyPositions");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "CompanyPositions");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "CompanyPositions");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "CompanyPositions");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "CompanyPositions");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "AttendanceSessions");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "AttendanceSessions");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "AttendanceSessions");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "AttendanceSessions");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "AttendanceSessions");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "AttendanceSessions");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "Auto_ID",
                table: "AccountRequests");

            migrationBuilder.DropColumn(
                name: "Created_By_Function",
                table: "AccountRequests");

            migrationBuilder.DropColumn(
                name: "Deleted_At",
                table: "AccountRequests");

            migrationBuilder.DropColumn(
                name: "Deleted_By",
                table: "AccountRequests");

            migrationBuilder.DropColumn(
                name: "Ghi_Chu",
                table: "AccountRequests");

            migrationBuilder.DropColumn(
                name: "Updated_By_Function",
                table: "AccountRequests");

            migrationBuilder.RenameColumn(
                name: "Ghi_Chu",
                table: "Internships",
                newName: "Notes");

            migrationBuilder.RenameColumn(
                name: "Ghi_Chu",
                table: "AttendanceRecords",
                newName: "Notes");

            migrationBuilder.AlterColumn<string>(
                name: "Notes",
                table: "Internships",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(1000)",
                oldMaxLength: 1000,
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_AccountRequests_Users_RequesterUserId",
                table: "AccountRequests",
                column: "RequesterUserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_AttendanceRecords_AttendanceSessions_AttendanceSessionId",
                table: "AttendanceRecords",
                column: "AttendanceSessionId",
                principalTable: "AttendanceSessions",
                principalColumn: "AttendanceSessionId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_AttendanceRecords_Internships_InternshipId",
                table: "AttendanceRecords",
                column: "InternshipId",
                principalTable: "Internships",
                principalColumn: "InternshipId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_AttendanceSessions_Lecturers_LecturerId",
                table: "AttendanceSessions",
                column: "LecturerId",
                principalTable: "Lecturers",
                principalColumn: "LecturerId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_AttendanceSessions_Semesters_SemesterId",
                table: "AttendanceSessions",
                column: "SemesterId",
                principalTable: "Semesters",
                principalColumn: "SemesterId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Companies_Departments_DepartmentId",
                table: "Companies",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "DepartmentId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_CompanyPositions_Companies_CompanyId",
                table: "CompanyPositions",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "CompanyId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CompanyPositions_Semesters_SemesterId",
                table: "CompanyPositions",
                column: "SemesterId",
                principalTable: "Semesters",
                principalColumn: "SemesterId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Documents_Internships_InternshipId",
                table: "Documents",
                column: "InternshipId",
                principalTable: "Internships",
                principalColumn: "InternshipId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Documents_Lecturers_UploadedById",
                table: "Documents",
                column: "UploadedById",
                principalTable: "Lecturers",
                principalColumn: "LecturerId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Documents_Semesters_SemesterId",
                table: "Documents",
                column: "SemesterId",
                principalTable: "Semesters",
                principalColumn: "SemesterId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_DocumentVersions_Documents_DocumentId",
                table: "DocumentVersions",
                column: "DocumentId",
                principalTable: "Documents",
                principalColumn: "DocumentId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_EvaluationRubricCriteria_EvaluationRubrics_RubricId",
                table: "EvaluationRubricCriteria",
                column: "RubricId",
                principalTable: "EvaluationRubrics",
                principalColumn: "EvaluationRubricId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_EvaluationRubrics_Semesters_SemesterId",
                table: "EvaluationRubrics",
                column: "SemesterId",
                principalTable: "Semesters",
                principalColumn: "SemesterId");

            migrationBuilder.AddForeignKey(
                name: "FK_EvaluationRubrics_Users_ApprovedById",
                table: "EvaluationRubrics",
                column: "ApprovedById",
                principalTable: "Users",
                principalColumn: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_EvaluationRubrics_Users_SubmittedById",
                table: "EvaluationRubrics",
                column: "SubmittedById",
                principalTable: "Users",
                principalColumn: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Evaluations_EvaluationRubrics_RubricId",
                table: "Evaluations",
                column: "RubricId",
                principalTable: "EvaluationRubrics",
                principalColumn: "EvaluationRubricId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Evaluations_Internships_InternshipId",
                table: "Evaluations",
                column: "InternshipId",
                principalTable: "Internships",
                principalColumn: "InternshipId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Evaluations_Users_EvaluatedById",
                table: "Evaluations",
                column: "EvaluatedById",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Feedbacks_Lecturers_LecturerId",
                table: "Feedbacks",
                column: "LecturerId",
                principalTable: "Lecturers",
                principalColumn: "LecturerId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Feedbacks_Submissions_SubmissionId",
                table: "Feedbacks",
                column: "SubmissionId",
                principalTable: "Submissions",
                principalColumn: "SubmissionId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Feedbacks_WeeklyReports_WeeklyReportId",
                table: "Feedbacks",
                column: "WeeklyReportId",
                principalTable: "WeeklyReports",
                principalColumn: "WeeklyReportId");

            migrationBuilder.AddForeignKey(
                name: "FK_Internships_Companies_CompanyId",
                table: "Internships",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "CompanyId");

            migrationBuilder.AddForeignKey(
                name: "FK_Internships_Lecturers_LecturerId",
                table: "Internships",
                column: "LecturerId",
                principalTable: "Lecturers",
                principalColumn: "LecturerId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Internships_Semesters_SemesterId",
                table: "Internships",
                column: "SemesterId",
                principalTable: "Semesters",
                principalColumn: "SemesterId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Internships_Students_StudentId",
                table: "Internships",
                column: "StudentId",
                principalTable: "Students",
                principalColumn: "StudentId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Lecturers_Departments_DepartmentId",
                table: "Lecturers",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "DepartmentId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Lecturers_Users_UserId",
                table: "Lecturers",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_LecturerSemesterSummaries_Lecturers_LecturerId",
                table: "LecturerSemesterSummaries",
                column: "LecturerId",
                principalTable: "Lecturers",
                principalColumn: "LecturerId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LecturerSemesterSummaries_Semesters_SemesterId",
                table: "LecturerSemesterSummaries",
                column: "SemesterId",
                principalTable: "Semesters",
                principalColumn: "SemesterId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Notifications_Users_UserId",
                table: "Notifications",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_PasswordResetTokens_Users_UserId",
                table: "PasswordResetTokens",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_RefreshTokens_Users_UserId",
                table: "RefreshTokens",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SemesterCompanies_Companies_CompanyId",
                table: "SemesterCompanies",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "CompanyId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SemesterCompanies_Semesters_SemesterId",
                table: "SemesterCompanies",
                column: "SemesterId",
                principalTable: "Semesters",
                principalColumn: "SemesterId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SemesterFacultySummaries_Departments_DepartmentId",
                table: "SemesterFacultySummaries",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "DepartmentId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_SemesterFacultySummaries_Semesters_SemesterId",
                table: "SemesterFacultySummaries",
                column: "SemesterId",
                principalTable: "Semesters",
                principalColumn: "SemesterId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SemesterLecturers_Lecturers_LecturerId",
                table: "SemesterLecturers",
                column: "LecturerId",
                principalTable: "Lecturers",
                principalColumn: "LecturerId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SemesterLecturers_Semesters_SemesterId",
                table: "SemesterLecturers",
                column: "SemesterId",
                principalTable: "Semesters",
                principalColumn: "SemesterId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SemesterReportSchedules_Lecturers_LecturerId",
                table: "SemesterReportSchedules",
                column: "LecturerId",
                principalTable: "Lecturers",
                principalColumn: "LecturerId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SemesterReportSchedules_Semesters_SemesterId",
                table: "SemesterReportSchedules",
                column: "SemesterId",
                principalTable: "Semesters",
                principalColumn: "SemesterId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Semesters_Departments_DepartmentId",
                table: "Semesters",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "DepartmentId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Students_Departments_DepartmentId",
                table: "Students",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "DepartmentId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Students_Users_UserId",
                table: "Students",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_SubmissionAssets_Submissions_SubmissionId",
                table: "SubmissionAssets",
                column: "SubmissionId",
                principalTable: "Submissions",
                principalColumn: "SubmissionId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Submissions_Internships_InternshipId",
                table: "Submissions",
                column: "InternshipId",
                principalTable: "Internships",
                principalColumn: "InternshipId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Departments_DepartmentId",
                table: "Users",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "DepartmentId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_WeeklyReports_Internships_InternshipId",
                table: "WeeklyReports",
                column: "InternshipId",
                principalTable: "Internships",
                principalColumn: "InternshipId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_WeeklyReportVersions_WeeklyReports_WeeklyReportId",
                table: "WeeklyReportVersions",
                column: "WeeklyReportId",
                principalTable: "WeeklyReports",
                principalColumn: "WeeklyReportId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}

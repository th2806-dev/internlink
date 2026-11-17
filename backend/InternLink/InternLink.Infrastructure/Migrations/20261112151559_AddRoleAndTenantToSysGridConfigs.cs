using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRoleAndTenantToSysGridConfigs : Migration
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
                name: "FK_EmployerEvaluationTokens_Internships_InternshipId",
                table: "EmployerEvaluationTokens");

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
                name: "FK_Sys_Functions_Sys_Functions_ParentId",
                table: "Sys_Functions");

            migrationBuilder.DropForeignKey(
                name: "FK_Sys_GradingRuleSets_Departments_DepartmentId",
                table: "Sys_GradingRuleSets");

            migrationBuilder.DropForeignKey(
                name: "FK_Sys_GradingRuleSets_Semesters_SemesterId",
                table: "Sys_GradingRuleSets");

            migrationBuilder.DropForeignKey(
                name: "FK_Sys_RolePermissions_Sys_Functions_SysFunctionId",
                table: "Sys_RolePermissions");

            migrationBuilder.DropForeignKey(
                name: "FK_Sys_RolePermissions_Sys_Roles_SysRoleId",
                table: "Sys_RolePermissions");

            migrationBuilder.DropForeignKey(
                name: "FK_Sys_UserRoles_Sys_Roles_SysRoleId",
                table: "Sys_UserRoles");

            migrationBuilder.DropForeignKey(
                name: "FK_Sys_UserRoles_Sys_Users_SysUserId",
                table: "Sys_UserRoles");

            migrationBuilder.DropForeignKey(
                name: "FK_Sys_Users_Users_Public_ID",
                table: "Sys_Users");

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
                name: "IX_Sys_Users_Public_ID",
                table: "Sys_Users");

            migrationBuilder.DropIndex(
                name: "IX_Sys_UserRoles_Public_ID",
                table: "Sys_UserRoles");

            migrationBuilder.DropIndex(
                name: "IX_Sys_Roles_Public_ID",
                table: "Sys_Roles");

            migrationBuilder.DropIndex(
                name: "IX_Sys_RolePermissions_Public_ID",
                table: "Sys_RolePermissions");

            migrationBuilder.DropIndex(
                name: "IX_Sys_GridConfigs_FeatureCode_FieldCode",
                table: "Sys_GridConfigs");

            migrationBuilder.AddColumn<long>(
                name: "RoleId",
                table: "Sys_GridConfigs",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TenantId",
                table: "Sys_GridConfigs",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FrozenSide",
                table: "Sys_GridConfigs",
                type: "nvarchar(5)",
                maxLength: 5,
                nullable: false,
                defaultValue: "left");

            migrationBuilder.DropIndex(
                name: "IX_Sys_GradingRuleSets_DepartmentId",
                table: "Sys_GradingRuleSets");

            migrationBuilder.DropIndex(
                name: "IX_Sys_Functions_Public_ID",
                table: "Sys_Functions");

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
                name: "IX_EmployerEvaluations_InternshipId",
                table: "EmployerEvaluations");

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


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "WeeklyReportVersions",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            // Preserve each legacy GUID key as its new Public_ID so existing FK/report lookups remain stable.
            migrationBuilder.Sql("UPDATE [WeeklyReportVersions] SET [Public_ID] = [WeeklyReportVersionId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "WeeklyReports",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [WeeklyReports] SET [Public_ID] = [WeeklyReportId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "Users",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [Users] SET [Public_ID] = [UserId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "SystemSettings",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [SystemSettings] SET [Public_ID] = [SystemSettingId];");

            migrationBuilder.AlterColumn<bool>(
                name: "DefaultPermissionsApplied",
                table: "Sys_Roles",
                type: "bit",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<decimal>(
                name: "ProcessScoreWeight",
                table: "Sys_GradingRuleSets",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0.40m,
                oldClrType: typeof(decimal),
                oldType: "decimal(5,4)",
                oldPrecision: 5,
                oldScale: 4,
                oldDefaultValue: 0.40m);

            migrationBuilder.AlterColumn<decimal>(
                name: "MinimumPassingScore",
                table: "Sys_GradingRuleSets",
                type: "decimal(4,2)",
                precision: 4,
                scale: 2,
                nullable: false,
                defaultValue: 5.0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(5,2)",
                oldPrecision: 5,
                oldScale: 2,
                oldDefaultValue: 5m);

            migrationBuilder.AlterColumn<decimal>(
                name: "LatePenaltyPointsPerDay",
                table: "Sys_GradingRuleSets",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(5,2)",
                oldPrecision: 5,
                oldScale: 2,
                oldDefaultValue: 0m);

            migrationBuilder.AlterColumn<decimal>(
                name: "ExamScoreWeight",
                table: "Sys_GradingRuleSets",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0.60m,
                oldClrType: typeof(decimal),
                oldType: "decimal(5,4)",
                oldPrecision: 5,
                oldScale: 4,
                oldDefaultValue: 0.60m);

            migrationBuilder.AlterColumn<decimal>(
                name: "EmployerScoreWeight",
                table: "Sys_GradingRuleSets",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0.00m,
                oldClrType: typeof(decimal),
                oldType: "decimal(5,4)",
                oldPrecision: 5,
                oldScale: 4,
                oldDefaultValue: 0.00m);

            migrationBuilder.AlterColumn<string>(
                name: "Code",
                table: "Sys_Functions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(150)",
                oldMaxLength: 150);


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "Submissions",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [Submissions] SET [Public_ID] = [SubmissionId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "SubmissionAssets",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [SubmissionAssets] SET [Public_ID] = [SubmissionAssetId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "Students",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [Students] SET [Public_ID] = [StudentId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "Semesters",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [Semesters] SET [Public_ID] = [SemesterId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "SemesterReportSchedules",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [SemesterReportSchedules] SET [Public_ID] = [SemesterReportScheduleId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "SemesterLecturers",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [SemesterLecturers] SET [Public_ID] = [SemesterLecturerId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "SemesterFacultySummaries",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [SemesterFacultySummaries] SET [Public_ID] = [SemesterFacultySummaryId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "SemesterCompanies",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [SemesterCompanies] SET [Public_ID] = [SemesterCompanyId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "SchoolAcademicTerms",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [SchoolAcademicTerms] SET [Public_ID] = [SchoolAcademicTermId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "RefreshTokens",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [RefreshTokens] SET [Public_ID] = [RefreshTokenId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "PasswordResetTokens",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [PasswordResetTokens] SET [Public_ID] = [PasswordResetTokenId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "Notifications",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [Notifications] SET [Public_ID] = [NotificationId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "LecturerSemesterSummaries",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [LecturerSemesterSummaries] SET [Public_ID] = [LecturerSemesterSummaryId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "Lecturers",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [Lecturers] SET [Public_ID] = [LecturerId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "LecturerActivityLogs",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [LecturerActivityLogs] SET [Public_ID] = [LecturerActivityLogId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "Internships",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [Internships] SET [Public_ID] = [InternshipId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "Feedbacks",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [Feedbacks] SET [Public_ID] = [FeedbackId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "Evaluations",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [Evaluations] SET [Public_ID] = [EvaluationId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "EvaluationRubrics",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [EvaluationRubrics] SET [Public_ID] = [EvaluationRubricId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "EvaluationRubricCriteria",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [EvaluationRubricCriteria] SET [Public_ID] = [EvaluationRubricCriterionId];");

            migrationBuilder.AlterColumn<string>(
                name: "RubricScoresJson",
                table: "EmployerEvaluations",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(4000)",
                oldMaxLength: 4000,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "FinalScore",
                table: "EmployerEvaluations",
                type: "decimal(4,2)",
                precision: 4,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(5,2)",
                oldPrecision: 5,
                oldScale: 2);


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "DocumentVersions",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [DocumentVersions] SET [Public_ID] = [DocumentVersionId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "Documents",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [Documents] SET [Public_ID] = [DocumentId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "Departments",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [Departments] SET [Public_ID] = [DepartmentId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "CompanyPositions",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [CompanyPositions] SET [Public_ID] = [CompanyPositionId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "Companies",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [Companies] SET [Public_ID] = [CompanyId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "AttendanceSessions",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [AttendanceSessions] SET [Public_ID] = [AttendanceSessionId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "AttendanceRecords",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [AttendanceRecords] SET [Public_ID] = [AttendanceRecordId];");


            migrationBuilder.AddColumn<Guid>(
                name: "Public_ID",
                table: "AccountRequests",
                type: "uniqueidentifier",
                nullable: false,
                defaultValueSql: "NEWID()");

            migrationBuilder.Sql("UPDATE [AccountRequests] SET [Public_ID] = [AccountRequestId];");

            migrationBuilder.AddUniqueConstraint(
                name: "AK_Users_Public_ID",
                table: "Users",
                column: "Public_ID");

            migrationBuilder.AddUniqueConstraint(
                name: "AK_Sys_Users_Public_ID",
                table: "Sys_Users",
                column: "Public_ID");

            migrationBuilder.CreateIndex(
                name: "IX_Sys_GridConfigs_FeatureCode_RoleId_TenantId_FieldCode",
                table: "Sys_GridConfigs",
                columns: new[] { "FeatureCode", "RoleId", "TenantId", "FieldCode" },
                unique: true,
                filter: "[RoleId] IS NOT NULL AND [TenantId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_EmployerEvaluations_InternshipId",
                table: "EmployerEvaluations",
                column: "InternshipId");

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
                name: "FK_EmployerEvaluationTokens_Internships_InternshipId",
                table: "EmployerEvaluationTokens",
                column: "InternshipId",
                principalTable: "Internships",
                principalColumn: "InternshipId",
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
                name: "FK_Sys_Functions_Sys_Functions_ParentId",
                table: "Sys_Functions",
                column: "ParentId",
                principalTable: "Sys_Functions",
                principalColumn: "Auto_ID");

            migrationBuilder.AddForeignKey(
                name: "FK_Sys_RolePermissions_Sys_Functions_SysFunctionId",
                table: "Sys_RolePermissions",
                column: "SysFunctionId",
                principalTable: "Sys_Functions",
                principalColumn: "Auto_ID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Sys_RolePermissions_Sys_Roles_SysRoleId",
                table: "Sys_RolePermissions",
                column: "SysRoleId",
                principalTable: "Sys_Roles",
                principalColumn: "Auto_ID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Sys_UserRoles_Sys_Roles_SysRoleId",
                table: "Sys_UserRoles",
                column: "SysRoleId",
                principalTable: "Sys_Roles",
                principalColumn: "Auto_ID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Sys_UserRoles_Sys_Users_SysUserId",
                table: "Sys_UserRoles",
                column: "SysUserId",
                principalTable: "Sys_Users",
                principalColumn: "Auto_ID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Sys_Users_Users_Public_ID",
                table: "Sys_Users",
                column: "Public_ID",
                principalTable: "Users",
                principalColumn: "Public_ID",
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
                name: "FK_EmployerEvaluationTokens_Internships_InternshipId",
                table: "EmployerEvaluationTokens");

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
                name: "FK_Sys_Functions_Sys_Functions_ParentId",
                table: "Sys_Functions");

            migrationBuilder.DropForeignKey(
                name: "FK_Sys_RolePermissions_Sys_Functions_SysFunctionId",
                table: "Sys_RolePermissions");

            migrationBuilder.DropForeignKey(
                name: "FK_Sys_RolePermissions_Sys_Roles_SysRoleId",
                table: "Sys_RolePermissions");

            migrationBuilder.DropForeignKey(
                name: "FK_Sys_UserRoles_Sys_Roles_SysRoleId",
                table: "Sys_UserRoles");

            migrationBuilder.DropForeignKey(
                name: "FK_Sys_UserRoles_Sys_Users_SysUserId",
                table: "Sys_UserRoles");

            migrationBuilder.DropForeignKey(
                name: "FK_Sys_Users_Users_Public_ID",
                table: "Sys_Users");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Departments_DepartmentId",
                table: "Users");

            migrationBuilder.DropForeignKey(
                name: "FK_WeeklyReports_Internships_InternshipId",
                table: "WeeklyReports");

            migrationBuilder.DropForeignKey(
                name: "FK_WeeklyReportVersions_WeeklyReports_WeeklyReportId",
                table: "WeeklyReportVersions");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_Users_Public_ID",
                table: "Users");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_Sys_Users_Public_ID",
                table: "Sys_Users");

            migrationBuilder.DropIndex(
                name: "IX_Sys_GridConfigs_FeatureCode_RoleId_TenantId_FieldCode",
                table: "Sys_GridConfigs");

            migrationBuilder.DropColumn(
                name: "FrozenSide",
                table: "Sys_GridConfigs");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Sys_GridConfigs");

            migrationBuilder.DropColumn(
                name: "RoleId",
                table: "Sys_GridConfigs");

            migrationBuilder.DropIndex(
                name: "IX_EmployerEvaluations_InternshipId",
                table: "EmployerEvaluations");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "WeeklyReportVersions");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "WeeklyReports");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "SystemSettings");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "SubmissionAssets");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "Semesters");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "SemesterReportSchedules");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "SemesterLecturers");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "SemesterFacultySummaries");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "SemesterCompanies");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "SchoolAcademicTerms");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "RefreshTokens");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "PasswordResetTokens");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "LecturerSemesterSummaries");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "Lecturers");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "LecturerActivityLogs");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "Internships");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "Feedbacks");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "Evaluations");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "EvaluationRubrics");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "EvaluationRubricCriteria");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "DocumentVersions");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "Documents");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "CompanyPositions");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "AttendanceSessions");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "Public_ID",
                table: "AccountRequests");





            migrationBuilder.AlterColumn<bool>(
                name: "DefaultPermissionsApplied",
                table: "Sys_Roles",
                type: "bit",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "bit");

            migrationBuilder.AlterColumn<decimal>(
                name: "ProcessScoreWeight",
                table: "Sys_GradingRuleSets",
                type: "decimal(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.40m,
                oldClrType: typeof(decimal),
                oldType: "decimal(5,2)",
                oldPrecision: 5,
                oldScale: 2,
                oldDefaultValue: 0.40m);

            migrationBuilder.AlterColumn<decimal>(
                name: "MinimumPassingScore",
                table: "Sys_GradingRuleSets",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 5m,
                oldClrType: typeof(decimal),
                oldType: "decimal(4,2)",
                oldPrecision: 4,
                oldScale: 2,
                oldDefaultValue: 5.0m);

            migrationBuilder.AlterColumn<decimal>(
                name: "LatePenaltyPointsPerDay",
                table: "Sys_GradingRuleSets",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(5,2)",
                oldPrecision: 5,
                oldScale: 2);

            migrationBuilder.AlterColumn<decimal>(
                name: "ExamScoreWeight",
                table: "Sys_GradingRuleSets",
                type: "decimal(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.60m,
                oldClrType: typeof(decimal),
                oldType: "decimal(5,2)",
                oldPrecision: 5,
                oldScale: 2,
                oldDefaultValue: 0.60m);

            migrationBuilder.AlterColumn<decimal>(
                name: "EmployerScoreWeight",
                table: "Sys_GradingRuleSets",
                type: "decimal(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.00m,
                oldClrType: typeof(decimal),
                oldType: "decimal(5,2)",
                oldPrecision: 5,
                oldScale: 2,
                oldDefaultValue: 0.00m);

            migrationBuilder.AlterColumn<string>(
                name: "Code",
                table: "Sys_Functions",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);





















            migrationBuilder.AlterColumn<string>(
                name: "RubricScoresJson",
                table: "EmployerEvaluations",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "FinalScore",
                table: "EmployerEvaluations",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(4,2)",
                oldPrecision: 4,
                oldScale: 2);









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
                name: "IX_Sys_Users_Public_ID",
                table: "Sys_Users",
                column: "Public_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_UserRoles_Public_ID",
                table: "Sys_UserRoles",
                column: "Public_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_Roles_Public_ID",
                table: "Sys_Roles",
                column: "Public_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_RolePermissions_Public_ID",
                table: "Sys_RolePermissions",
                column: "Public_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_GridConfigs_FeatureCode_FieldCode",
                table: "Sys_GridConfigs",
                columns: new[] { "FeatureCode", "FieldCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_GradingRuleSets_DepartmentId",
                table: "Sys_GradingRuleSets",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Sys_Functions_Public_ID",
                table: "Sys_Functions",
                column: "Public_ID",
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
                name: "IX_EmployerEvaluations_InternshipId",
                table: "EmployerEvaluations",
                column: "InternshipId",
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
                name: "FK_EmployerEvaluationTokens_Internships_InternshipId",
                table: "EmployerEvaluationTokens",
                column: "InternshipId",
                principalTable: "Internships",
                principalColumn: "InternshipId",
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
                name: "FK_Sys_Functions_Sys_Functions_ParentId",
                table: "Sys_Functions",
                column: "ParentId",
                principalTable: "Sys_Functions",
                principalColumn: "Auto_ID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Sys_GradingRuleSets_Departments_DepartmentId",
                table: "Sys_GradingRuleSets",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "DepartmentId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Sys_GradingRuleSets_Semesters_SemesterId",
                table: "Sys_GradingRuleSets",
                column: "SemesterId",
                principalTable: "Semesters",
                principalColumn: "SemesterId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Sys_RolePermissions_Sys_Functions_SysFunctionId",
                table: "Sys_RolePermissions",
                column: "SysFunctionId",
                principalTable: "Sys_Functions",
                principalColumn: "Auto_ID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Sys_RolePermissions_Sys_Roles_SysRoleId",
                table: "Sys_RolePermissions",
                column: "SysRoleId",
                principalTable: "Sys_Roles",
                principalColumn: "Auto_ID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Sys_UserRoles_Sys_Roles_SysRoleId",
                table: "Sys_UserRoles",
                column: "SysRoleId",
                principalTable: "Sys_Roles",
                principalColumn: "Auto_ID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Sys_UserRoles_Sys_Users_SysUserId",
                table: "Sys_UserRoles",
                column: "SysUserId",
                principalTable: "Sys_Users",
                principalColumn: "Auto_ID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Sys_Users_Users_Public_ID",
                table: "Sys_Users",
                column: "Public_ID",
                principalTable: "Users",
                principalColumn: "UserId",
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
    }
}

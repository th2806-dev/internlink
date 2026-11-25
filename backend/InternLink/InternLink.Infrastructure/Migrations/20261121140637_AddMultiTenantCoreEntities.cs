using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    public partial class AddMultiTenantCoreEntities : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "AccountRequests",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[AccountRequests] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "AccountRequests",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "AttendanceRecords",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[AttendanceRecords] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "AttendanceRecords",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "AttendanceSessions",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[AttendanceSessions] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "AttendanceSessions",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Companies",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[Companies] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "Companies",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "CompanyPositions",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[CompanyPositions] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "CompanyPositions",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Departments",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[Departments] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "Departments",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Documents",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[Documents] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "Documents",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "DocumentVersions",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[DocumentVersions] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "DocumentVersions",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "EmployerEvaluationTokens",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[EmployerEvaluationTokens] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "EmployerEvaluationTokens",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "EmployerEvaluations",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[EmployerEvaluations] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "EmployerEvaluations",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "EvaluationRubricCriteria",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[EvaluationRubricCriteria] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "EvaluationRubricCriteria",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "EvaluationRubrics",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[EvaluationRubrics] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "EvaluationRubrics",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Evaluations",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[Evaluations] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "Evaluations",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Feedbacks",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[Feedbacks] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "Feedbacks",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Internships",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[Internships] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "Internships",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "LecturerActivityLogs",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[LecturerActivityLogs] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "LecturerActivityLogs",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "LecturerSemesterSummaries",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[LecturerSemesterSummaries] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "LecturerSemesterSummaries",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Lecturers",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[Lecturers] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "Lecturers",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Notifications",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[Notifications] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "Notifications",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "PasswordResetTokens",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[PasswordResetTokens] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "PasswordResetTokens",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "RefreshTokens",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[RefreshTokens] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "RefreshTokens",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "SchoolAcademicTerms",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[SchoolAcademicTerms] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "SchoolAcademicTerms",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "SemesterCompanies",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[SemesterCompanies] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "SemesterCompanies",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "SemesterFacultySummaries",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[SemesterFacultySummaries] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "SemesterFacultySummaries",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "SemesterLecturers",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[SemesterLecturers] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "SemesterLecturers",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "SemesterReportSchedules",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[SemesterReportSchedules] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "SemesterReportSchedules",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Semesters",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[Semesters] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "Semesters",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Students",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[Students] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "Students",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "SubmissionAssets",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[SubmissionAssets] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "SubmissionAssets",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Submissions",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[Submissions] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "Submissions",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Sys_AuditLogs",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[Sys_AuditLogs] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "Sys_AuditLogs",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Sys_Excel_Mapping_Details",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[Sys_Excel_Mapping_Details] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "Sys_Excel_Mapping_Details",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Sys_GradingRuleSets",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[Sys_GradingRuleSets] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "Sys_GradingRuleSets",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Sys_LoginLogs",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[Sys_LoginLogs] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "Sys_LoginLogs",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Sys_UserRoles",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[Sys_UserRoles] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "Sys_UserRoles",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Sys_Users",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[Sys_Users] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "Sys_Users",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Sys_Webhooks",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[Sys_Webhooks] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "Sys_Webhooks",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "SystemSettings",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[SystemSettings] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "SystemSettings",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Users",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[Users] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "Users",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "WeeklyReports",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[WeeklyReports] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "WeeklyReports",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "WeeklyReportVersions",
                type: "uniqueidentifier",
                nullable: true);
            migrationBuilder.Sql("UPDATE [dbo].[WeeklyReportVersions] SET [TenantId] = 'b8246f9d-4c85-4fc7-a13a-5ec77f940001';");
            migrationBuilder.AlterColumn<Guid>(
                name: "TenantId",
                table: "WeeklyReportVersions",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

migrationBuilder.CreateTable(
                name: "Sys_Tenants",
                columns: table => new
                {
                    Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    LegalName = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    Domain = table.Column<string>(type: "nvarchar(253)", maxLength: 253, nullable: true),
                    Subdomain = table.Column<string>(type: "nvarchar(63)", maxLength: 63, nullable: false),
                    TenantType = table.Column<int>(type: "int", nullable: false),
                    LogoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ContactEmail = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ContactPhone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    Public_ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Ghi_Chu = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Created_By_Function = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Updated_By_Function = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    Deleted_At = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Deleted_By = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sys_Tenants", x => x.Auto_ID);
                    table.UniqueConstraint("AK_Sys_Tenants_Public_ID", x => x.Public_ID);
                });

migrationBuilder.CreateTable(
                name: "Sys_ApiKeys",
                columns: table => new
                {
                    Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    KeyPrefix = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    KeyHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ScopesJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RateLimitPerMinute = table.Column<int>(type: "int", nullable: false, defaultValue: 120),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastUsedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    Public_ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Ghi_Chu = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Created_By_Function = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Updated_By_Function = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    Deleted_At = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Deleted_By = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sys_ApiKeys", x => x.Auto_ID);
                    table.ForeignKey(
                        name: "FK_Sys_ApiKeys_Sys_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Sys_Tenants",
                        principalColumn: "Public_ID",
                        onDelete: ReferentialAction.Restrict);
                });

migrationBuilder.CreateTable(
                name: "Sys_TenantLicenses",
                columns: table => new
                {
                    Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LicenseTier = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    MaxStudentsQuota = table.Column<int>(type: "int", nullable: false, defaultValue: 5000),
                    MaxLecturersQuota = table.Column<int>(type: "int", nullable: false, defaultValue: 200),
                    StorageQuotaBytes = table.Column<long>(type: "bigint", nullable: false, defaultValue: 107374182400L),
                    CurrentStorageBytes = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    ValidFrom = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ValidTo = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AutoRenew = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    Public_ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Ghi_Chu = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Created_By_Function = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Updated_By_Function = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    Deleted_At = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Deleted_By = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sys_TenantLicenses", x => x.Auto_ID);
                    table.ForeignKey(
                        name: "FK_Sys_TenantLicenses_Sys_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Sys_Tenants",
                        principalColumn: "Public_ID",
                        onDelete: ReferentialAction.Restrict);
                });

migrationBuilder.CreateTable(
                name: "Sys_TenantSsoConfigs",
                columns: table => new
                {
                    Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProviderType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ClientId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    EncryptedClientSecret = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: false),
                    DiscoveryUrl = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: false),
                    AllowedEmailDomains = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    IsEnforced = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    Public_ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Ghi_Chu = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Created_By_Function = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Updated_By_Function = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    Deleted_At = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Deleted_By = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sys_TenantSsoConfigs", x => x.Auto_ID);
                    table.ForeignKey(
                        name: "FK_Sys_TenantSsoConfigs_Sys_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Sys_Tenants",
                        principalColumn: "Public_ID",
                        onDelete: ReferentialAction.Restrict);
                });

migrationBuilder.CreateIndex(
                name: "IX_AccountRequests_TenantId",
                table: "AccountRequests",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_AttendanceRecords_TenantId",
                table: "AttendanceRecords",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_AttendanceSessions_TenantId",
                table: "AttendanceSessions",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_Companies_TenantId",
                table: "Companies",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_CompanyPositions_TenantId",
                table: "CompanyPositions",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_Departments_TenantId",
                table: "Departments",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_Documents_TenantId",
                table: "Documents",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_DocumentVersions_TenantId",
                table: "DocumentVersions",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_EmployerEvaluations_TenantId",
                table: "EmployerEvaluations",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_EmployerEvaluationTokens_TenantId",
                table: "EmployerEvaluationTokens",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_EvaluationRubricCriteria_TenantId",
                table: "EvaluationRubricCriteria",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_EvaluationRubrics_TenantId",
                table: "EvaluationRubrics",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_Evaluations_TenantId",
                table: "Evaluations",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_Feedbacks_TenantId",
                table: "Feedbacks",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_Internships_TenantId",
                table: "Internships",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_LecturerActivityLogs_TenantId",
                table: "LecturerActivityLogs",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_Lecturers_TenantId",
                table: "Lecturers",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_LecturerSemesterSummaries_TenantId",
                table: "LecturerSemesterSummaries",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_Notifications_TenantId",
                table: "Notifications",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_PasswordResetTokens_TenantId",
                table: "PasswordResetTokens",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_TenantId",
                table: "RefreshTokens",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_SchoolAcademicTerms_TenantId",
                table: "SchoolAcademicTerms",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_SemesterCompanies_TenantId",
                table: "SemesterCompanies",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_SemesterFacultySummaries_TenantId",
                table: "SemesterFacultySummaries",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_SemesterLecturers_TenantId",
                table: "SemesterLecturers",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_SemesterReportSchedules_TenantId",
                table: "SemesterReportSchedules",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_Semesters_TenantId",
                table: "Semesters",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_Students_TenantId",
                table: "Students",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_SubmissionAssets_TenantId",
                table: "SubmissionAssets",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_Submissions_TenantId",
                table: "Submissions",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_Sys_ApiKeys_KeyHash",
                table: "Sys_ApiKeys",
                column: "KeyHash",
                unique: true);

migrationBuilder.CreateIndex(
                name: "IX_Sys_ApiKeys_KeyPrefix",
                table: "Sys_ApiKeys",
                column: "KeyPrefix");

migrationBuilder.CreateIndex(
                name: "IX_Sys_ApiKeys_Public_ID",
                table: "Sys_ApiKeys",
                column: "Public_ID",
                unique: true);

migrationBuilder.CreateIndex(
                name: "IX_Sys_ApiKeys_TenantId",
                table: "Sys_ApiKeys",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_Sys_AuditLogs_TenantId",
                table: "Sys_AuditLogs",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_Sys_Excel_Mapping_Details_TenantId",
                table: "Sys_Excel_Mapping_Details",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_Sys_GradingRuleSets_TenantId",
                table: "Sys_GradingRuleSets",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_Sys_LoginLogs_TenantId",
                table: "Sys_LoginLogs",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_Sys_TenantLicenses_Public_ID",
                table: "Sys_TenantLicenses",
                column: "Public_ID",
                unique: true);

migrationBuilder.CreateIndex(
                name: "IX_Sys_TenantLicenses_TenantId",
                table: "Sys_TenantLicenses",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_Sys_Tenants_Domain",
                table: "Sys_Tenants",
                column: "Domain",
                unique: true,
                filter: "[Domain] IS NOT NULL");

migrationBuilder.CreateIndex(
                name: "IX_Sys_Tenants_Public_ID",
                table: "Sys_Tenants",
                column: "Public_ID",
                unique: true);

migrationBuilder.CreateIndex(
                name: "IX_Sys_Tenants_Subdomain",
                table: "Sys_Tenants",
                column: "Subdomain",
                unique: true);

migrationBuilder.CreateIndex(
                name: "IX_Sys_Tenants_TenantCode",
                table: "Sys_Tenants",
                column: "TenantCode",
                unique: true);

migrationBuilder.CreateIndex(
                name: "IX_Sys_TenantSsoConfigs_Public_ID",
                table: "Sys_TenantSsoConfigs",
                column: "Public_ID",
                unique: true);

migrationBuilder.CreateIndex(
                name: "IX_Sys_TenantSsoConfigs_TenantId",
                table: "Sys_TenantSsoConfigs",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_Sys_UserRoles_TenantId",
                table: "Sys_UserRoles",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_Sys_Users_TenantId",
                table: "Sys_Users",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_Sys_Webhooks_TenantId",
                table: "Sys_Webhooks",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_SystemSettings_TenantId",
                table: "SystemSettings",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_Users_TenantId",
                table: "Users",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_WeeklyReports_TenantId",
                table: "WeeklyReports",
                column: "TenantId");

migrationBuilder.CreateIndex(
                name: "IX_WeeklyReportVersions_TenantId",
                table: "WeeklyReportVersions",
                column: "TenantId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "Sys_TenantSsoConfigs");
            migrationBuilder.DropTable(name: "Sys_TenantLicenses");
            migrationBuilder.DropTable(name: "Sys_ApiKeys");
            migrationBuilder.DropIndex(name: "IX_WeeklyReportVersions_TenantId", table: "WeeklyReportVersions");
            migrationBuilder.DropColumn(name: "TenantId", table: "WeeklyReportVersions");
            migrationBuilder.DropIndex(name: "IX_WeeklyReports_TenantId", table: "WeeklyReports");
            migrationBuilder.DropColumn(name: "TenantId", table: "WeeklyReports");
            migrationBuilder.DropIndex(name: "IX_Users_TenantId", table: "Users");
            migrationBuilder.DropColumn(name: "TenantId", table: "Users");
            migrationBuilder.DropIndex(name: "IX_SystemSettings_TenantId", table: "SystemSettings");
            migrationBuilder.DropColumn(name: "TenantId", table: "SystemSettings");
            migrationBuilder.DropIndex(name: "IX_Sys_Webhooks_TenantId", table: "Sys_Webhooks");
            migrationBuilder.DropColumn(name: "TenantId", table: "Sys_Webhooks");
            migrationBuilder.DropIndex(name: "IX_Sys_Users_TenantId", table: "Sys_Users");
            migrationBuilder.DropColumn(name: "TenantId", table: "Sys_Users");
            migrationBuilder.DropIndex(name: "IX_Sys_UserRoles_TenantId", table: "Sys_UserRoles");
            migrationBuilder.DropColumn(name: "TenantId", table: "Sys_UserRoles");
            migrationBuilder.DropIndex(name: "IX_Sys_LoginLogs_TenantId", table: "Sys_LoginLogs");
            migrationBuilder.DropColumn(name: "TenantId", table: "Sys_LoginLogs");
            migrationBuilder.DropIndex(name: "IX_Sys_GradingRuleSets_TenantId", table: "Sys_GradingRuleSets");
            migrationBuilder.DropColumn(name: "TenantId", table: "Sys_GradingRuleSets");
            migrationBuilder.DropIndex(name: "IX_Sys_Excel_Mapping_Details_TenantId", table: "Sys_Excel_Mapping_Details");
            migrationBuilder.DropColumn(name: "TenantId", table: "Sys_Excel_Mapping_Details");
            migrationBuilder.DropIndex(name: "IX_Sys_AuditLogs_TenantId", table: "Sys_AuditLogs");
            migrationBuilder.DropColumn(name: "TenantId", table: "Sys_AuditLogs");
            migrationBuilder.DropIndex(name: "IX_Submissions_TenantId", table: "Submissions");
            migrationBuilder.DropColumn(name: "TenantId", table: "Submissions");
            migrationBuilder.DropIndex(name: "IX_SubmissionAssets_TenantId", table: "SubmissionAssets");
            migrationBuilder.DropColumn(name: "TenantId", table: "SubmissionAssets");
            migrationBuilder.DropIndex(name: "IX_Students_TenantId", table: "Students");
            migrationBuilder.DropColumn(name: "TenantId", table: "Students");
            migrationBuilder.DropIndex(name: "IX_Semesters_TenantId", table: "Semesters");
            migrationBuilder.DropColumn(name: "TenantId", table: "Semesters");
            migrationBuilder.DropIndex(name: "IX_SemesterReportSchedules_TenantId", table: "SemesterReportSchedules");
            migrationBuilder.DropColumn(name: "TenantId", table: "SemesterReportSchedules");
            migrationBuilder.DropIndex(name: "IX_SemesterLecturers_TenantId", table: "SemesterLecturers");
            migrationBuilder.DropColumn(name: "TenantId", table: "SemesterLecturers");
            migrationBuilder.DropIndex(name: "IX_SemesterFacultySummaries_TenantId", table: "SemesterFacultySummaries");
            migrationBuilder.DropColumn(name: "TenantId", table: "SemesterFacultySummaries");
            migrationBuilder.DropIndex(name: "IX_SemesterCompanies_TenantId", table: "SemesterCompanies");
            migrationBuilder.DropColumn(name: "TenantId", table: "SemesterCompanies");
            migrationBuilder.DropIndex(name: "IX_SchoolAcademicTerms_TenantId", table: "SchoolAcademicTerms");
            migrationBuilder.DropColumn(name: "TenantId", table: "SchoolAcademicTerms");
            migrationBuilder.DropIndex(name: "IX_RefreshTokens_TenantId", table: "RefreshTokens");
            migrationBuilder.DropColumn(name: "TenantId", table: "RefreshTokens");
            migrationBuilder.DropIndex(name: "IX_PasswordResetTokens_TenantId", table: "PasswordResetTokens");
            migrationBuilder.DropColumn(name: "TenantId", table: "PasswordResetTokens");
            migrationBuilder.DropIndex(name: "IX_Notifications_TenantId", table: "Notifications");
            migrationBuilder.DropColumn(name: "TenantId", table: "Notifications");
            migrationBuilder.DropIndex(name: "IX_Lecturers_TenantId", table: "Lecturers");
            migrationBuilder.DropColumn(name: "TenantId", table: "Lecturers");
            migrationBuilder.DropIndex(name: "IX_LecturerSemesterSummaries_TenantId", table: "LecturerSemesterSummaries");
            migrationBuilder.DropColumn(name: "TenantId", table: "LecturerSemesterSummaries");
            migrationBuilder.DropIndex(name: "IX_LecturerActivityLogs_TenantId", table: "LecturerActivityLogs");
            migrationBuilder.DropColumn(name: "TenantId", table: "LecturerActivityLogs");
            migrationBuilder.DropIndex(name: "IX_Internships_TenantId", table: "Internships");
            migrationBuilder.DropColumn(name: "TenantId", table: "Internships");
            migrationBuilder.DropIndex(name: "IX_Feedbacks_TenantId", table: "Feedbacks");
            migrationBuilder.DropColumn(name: "TenantId", table: "Feedbacks");
            migrationBuilder.DropIndex(name: "IX_Evaluations_TenantId", table: "Evaluations");
            migrationBuilder.DropColumn(name: "TenantId", table: "Evaluations");
            migrationBuilder.DropIndex(name: "IX_EvaluationRubrics_TenantId", table: "EvaluationRubrics");
            migrationBuilder.DropColumn(name: "TenantId", table: "EvaluationRubrics");
            migrationBuilder.DropIndex(name: "IX_EvaluationRubricCriteria_TenantId", table: "EvaluationRubricCriteria");
            migrationBuilder.DropColumn(name: "TenantId", table: "EvaluationRubricCriteria");
            migrationBuilder.DropIndex(name: "IX_EmployerEvaluations_TenantId", table: "EmployerEvaluations");
            migrationBuilder.DropColumn(name: "TenantId", table: "EmployerEvaluations");
            migrationBuilder.DropIndex(name: "IX_EmployerEvaluationTokens_TenantId", table: "EmployerEvaluationTokens");
            migrationBuilder.DropColumn(name: "TenantId", table: "EmployerEvaluationTokens");
            migrationBuilder.DropIndex(name: "IX_DocumentVersions_TenantId", table: "DocumentVersions");
            migrationBuilder.DropColumn(name: "TenantId", table: "DocumentVersions");
            migrationBuilder.DropIndex(name: "IX_Documents_TenantId", table: "Documents");
            migrationBuilder.DropColumn(name: "TenantId", table: "Documents");
            migrationBuilder.DropIndex(name: "IX_Departments_TenantId", table: "Departments");
            migrationBuilder.DropColumn(name: "TenantId", table: "Departments");
            migrationBuilder.DropIndex(name: "IX_CompanyPositions_TenantId", table: "CompanyPositions");
            migrationBuilder.DropColumn(name: "TenantId", table: "CompanyPositions");
            migrationBuilder.DropIndex(name: "IX_Companies_TenantId", table: "Companies");
            migrationBuilder.DropColumn(name: "TenantId", table: "Companies");
            migrationBuilder.DropIndex(name: "IX_AttendanceSessions_TenantId", table: "AttendanceSessions");
            migrationBuilder.DropColumn(name: "TenantId", table: "AttendanceSessions");
            migrationBuilder.DropIndex(name: "IX_AttendanceRecords_TenantId", table: "AttendanceRecords");
            migrationBuilder.DropColumn(name: "TenantId", table: "AttendanceRecords");
            migrationBuilder.DropIndex(name: "IX_AccountRequests_TenantId", table: "AccountRequests");
            migrationBuilder.DropColumn(name: "TenantId", table: "AccountRequests");
            migrationBuilder.DropTable(name: "Sys_Tenants");
        }
    }
}

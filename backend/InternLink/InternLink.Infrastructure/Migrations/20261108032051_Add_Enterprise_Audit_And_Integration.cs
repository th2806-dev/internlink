using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Add_Enterprise_Audit_And_Integration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Sys_AuditLogs",
                columns: table => new
                {
                    Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TableName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ActionType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    RecordId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    OldValuesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NewValuesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Username = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    FunctionCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IpAddress = table.Column<string>(type: "nvarchar(45)", maxLength: 45, nullable: true),
                    Public_ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Ghi_Chu = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
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
                    table.PrimaryKey("PK_Sys_AuditLogs", x => x.Auto_ID);
                });

            migrationBuilder.CreateTable(
                name: "Sys_DailyJobs",
                columns: table => new
                {
                    Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    JobCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    JobName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CronExpression = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LastRunAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    NextRunAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Public_ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Ghi_Chu = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
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
                    table.PrimaryKey("PK_Sys_DailyJobs", x => x.Auto_ID);
                });

            migrationBuilder.CreateTable(
                name: "Sys_LoginLogs",
                columns: table => new
                {
                    Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LoginAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Username = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IpAddress = table.Column<string>(type: "nvarchar(45)", maxLength: 45, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Public_ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Ghi_Chu = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
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
                    table.PrimaryKey("PK_Sys_LoginLogs", x => x.Auto_ID);
                });

            migrationBuilder.CreateTable(
                name: "Sys_Webhooks",
                columns: table => new
                {
                    Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WebhookUrl = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: false),
                    EventType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SecretKey = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    LastTriggeredAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastStatus = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Public_ID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Ghi_Chu = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
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
                    table.PrimaryKey("PK_Sys_Webhooks", x => x.Auto_ID);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Sys_AuditLogs_Public_ID",
                table: "Sys_AuditLogs",
                column: "Public_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_AuditLogs_TableName_RecordId_CreatedAt",
                table: "Sys_AuditLogs",
                columns: new[] { "TableName", "RecordId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Sys_AuditLogs_UserId_CreatedAt",
                table: "Sys_AuditLogs",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Sys_DailyJobs_JobCode",
                table: "Sys_DailyJobs",
                column: "JobCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_DailyJobs_Public_ID",
                table: "Sys_DailyJobs",
                column: "Public_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_LoginLogs_Public_ID",
                table: "Sys_LoginLogs",
                column: "Public_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_LoginLogs_Username_LoginAt",
                table: "Sys_LoginLogs",
                columns: new[] { "Username", "LoginAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Sys_Webhooks_Public_ID",
                table: "Sys_Webhooks",
                column: "Public_ID",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Sys_AuditLogs");

            migrationBuilder.DropTable(
                name: "Sys_DailyJobs");

            migrationBuilder.DropTable(
                name: "Sys_LoginLogs");

            migrationBuilder.DropTable(
                name: "Sys_Webhooks");
        }
    }
}

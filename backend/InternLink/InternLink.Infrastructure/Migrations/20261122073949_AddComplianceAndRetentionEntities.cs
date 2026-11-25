using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261122073949_AddComplianceAndRetentionEntities")]
public partial class AddComplianceAndRetentionEntities : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_Sys_TenantSsoConfigs_TenantId",
            table: "Sys_TenantSsoConfigs");

        migrationBuilder.CreateTable(
            name: "Sys_ComplianceLogs",
            columns: table => new
            {
                Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                OperationCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                AffectedCount = table.Column<int>(type: "int", nullable: false),
                RetentionYears = table.Column<int>(type: "int", nullable: false),
                CutoffAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                TriggeredBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                ExecutedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                Details = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
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
            constraints: table => table.PrimaryKey("PK_Sys_ComplianceLogs", x => x.Auto_ID));

        migrationBuilder.CreateTable(
            name: "Sys_DataRetentionPolicies",
            columns: table => new
            {
                Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                Code = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                RetentionYears = table.Column<int>(type: "int", nullable: false),
                IsEnabled = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
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
            constraints: table => table.PrimaryKey("PK_Sys_DataRetentionPolicies", x => x.Auto_ID));

        migrationBuilder.CreateIndex(
            name: "IX_Sys_TenantSsoConfigs_TenantId",
            table: "Sys_TenantSsoConfigs",
            column: "TenantId",
            unique: true,
            filter: "[IsDeleted] = 0");
        migrationBuilder.CreateIndex(
            name: "IX_Sys_ComplianceLogs_OperationCode_ExecutedAt",
            table: "Sys_ComplianceLogs",
            columns: new[] { "OperationCode", "ExecutedAt" });
        migrationBuilder.CreateIndex(
            name: "IX_Sys_ComplianceLogs_Public_ID",
            table: "Sys_ComplianceLogs",
            column: "Public_ID",
            unique: true);
        migrationBuilder.CreateIndex(
            name: "IX_Sys_DataRetentionPolicies_Code",
            table: "Sys_DataRetentionPolicies",
            column: "Code",
            unique: true);
        migrationBuilder.CreateIndex(
            name: "IX_Sys_DataRetentionPolicies_Public_ID",
            table: "Sys_DataRetentionPolicies",
            column: "Public_ID",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "Sys_ComplianceLogs");
        migrationBuilder.DropTable(name: "Sys_DataRetentionPolicies");
        migrationBuilder.DropIndex(
            name: "IX_Sys_TenantSsoConfigs_TenantId",
            table: "Sys_TenantSsoConfigs");
        migrationBuilder.CreateIndex(
            name: "IX_Sys_TenantSsoConfigs_TenantId",
            table: "Sys_TenantSsoConfigs",
            column: "TenantId");
    }
}

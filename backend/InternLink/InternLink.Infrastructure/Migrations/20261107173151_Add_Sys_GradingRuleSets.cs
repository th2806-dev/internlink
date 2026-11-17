using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Add_Sys_GradingRuleSets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Sys_GradingRuleSets",
                columns: table => new
                {
                    Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SemesterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepartmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RuleSetName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ProcessScoreWeight = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false, defaultValue: 0.40m),
                    ExamScoreWeight = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false, defaultValue: 0.60m),
                    EmployerScoreWeight = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false, defaultValue: 0.00m),
                    RequiredWeeklyReportsCount = table.Column<int>(type: "int", nullable: false, defaultValue: 6),
                    StepPenaltyPerLateReport = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false, defaultValue: 0.5m),
                    StepPenaltyPerMissingReport = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false, defaultValue: 2.0m),
                    RequireFinalReportForExamEligibility = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
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
                    table.PrimaryKey("PK_Sys_GradingRuleSets", x => x.Auto_ID);
                    table.ForeignKey(
                        name: "FK_Sys_GradingRuleSets_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "DepartmentId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Sys_GradingRuleSets_Semesters_SemesterId",
                        column: x => x.SemesterId,
                        principalTable: "Semesters",
                        principalColumn: "SemesterId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Sys_GradingRuleSets_DepartmentId",
                table: "Sys_GradingRuleSets",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Sys_GradingRuleSets_Public_ID",
                table: "Sys_GradingRuleSets",
                column: "Public_ID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sys_GradingRuleSets_SemesterId_DepartmentId",
                table: "Sys_GradingRuleSets",
                columns: new[] { "SemesterId", "DepartmentId" },
                unique: true,
                filter: "[IsDeleted] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Sys_GradingRuleSets");
        }
    }
}

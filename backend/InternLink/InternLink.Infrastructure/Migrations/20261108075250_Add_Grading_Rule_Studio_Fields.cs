using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Add_Grading_Rule_Studio_Fields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "LatePenaltyPointsPerDay",
                table: "Sys_GradingRuleSets",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "MinimumPassingScore",
                table: "Sys_GradingRuleSets",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 5m);

            migrationBuilder.AddColumn<int>(
                name: "WeeklyDeadlineDay",
                table: "Sys_GradingRuleSets",
                type: "int",
                nullable: false,
                defaultValue: 5);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LatePenaltyPointsPerDay",
                table: "Sys_GradingRuleSets");

            migrationBuilder.DropColumn(
                name: "MinimumPassingScore",
                table: "Sys_GradingRuleSets");

            migrationBuilder.DropColumn(
                name: "WeeklyDeadlineDay",
                table: "Sys_GradingRuleSets");
        }
    }
}

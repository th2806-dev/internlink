using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddC23GradingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSubmissionOpen",
                table: "SemesterReportSchedules",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "StartDate",
                table: "SemesterReportSchedules",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "HasCreativeProduct",
                table: "Evaluations",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "OralExamScore",
                table: "Evaluations",
                type: "decimal(4,1)",
                precision: 4,
                scale: 1,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "QualityLevel",
                table: "Evaluations",
                type: "decimal(3,1)",
                precision: 3,
                scale: 1,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsSubmissionOpen",
                table: "SemesterReportSchedules");

            migrationBuilder.DropColumn(
                name: "StartDate",
                table: "SemesterReportSchedules");

            migrationBuilder.DropColumn(
                name: "HasCreativeProduct",
                table: "Evaluations");

            migrationBuilder.DropColumn(
                name: "OralExamScore",
                table: "Evaluations");

            migrationBuilder.DropColumn(
                name: "QualityLevel",
                table: "Evaluations");
        }
    }
}

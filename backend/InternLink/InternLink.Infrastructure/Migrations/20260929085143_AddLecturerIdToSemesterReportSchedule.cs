using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLecturerIdToSemesterReportSchedule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SemesterReportSchedules_SemesterId_WeekNumber",
                table: "SemesterReportSchedules");

            migrationBuilder.AddColumn<Guid>(
                name: "LecturerId",
                table: "SemesterReportSchedules",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SemesterReportSchedules_LecturerId",
                table: "SemesterReportSchedules",
                column: "LecturerId");

            migrationBuilder.CreateIndex(
                name: "IX_SemesterReportSchedules_SemesterId_WeekNumber_LecturerId",
                table: "SemesterReportSchedules",
                columns: new[] { "SemesterId", "WeekNumber", "LecturerId" },
                unique: true,
                filter: "[LecturerId] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_SemesterReportSchedules_Lecturers_LecturerId",
                table: "SemesterReportSchedules",
                column: "LecturerId",
                principalTable: "Lecturers",
                principalColumn: "LecturerId",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SemesterReportSchedules_Lecturers_LecturerId",
                table: "SemesterReportSchedules");

            migrationBuilder.DropIndex(
                name: "IX_SemesterReportSchedules_LecturerId",
                table: "SemesterReportSchedules");

            migrationBuilder.DropIndex(
                name: "IX_SemesterReportSchedules_SemesterId_WeekNumber_LecturerId",
                table: "SemesterReportSchedules");

            migrationBuilder.DropColumn(
                name: "LecturerId",
                table: "SemesterReportSchedules");

            migrationBuilder.CreateIndex(
                name: "IX_SemesterReportSchedules_SemesterId_WeekNumber",
                table: "SemesterReportSchedules",
                columns: new[] { "SemesterId", "WeekNumber" },
                unique: true);
        }
    }
}

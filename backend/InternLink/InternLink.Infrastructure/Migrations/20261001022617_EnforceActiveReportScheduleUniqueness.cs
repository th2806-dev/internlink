using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EnforceActiveReportScheduleUniqueness : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
WITH RankedSchedules AS
(
    SELECT [SemesterReportScheduleId],
        ROW_NUMBER() OVER (
            PARTITION BY [SemesterId], [WeekNumber], [LecturerId]
            ORDER BY COALESCE([UpdatedAt], [CreatedAt]) DESC, [CreatedAt] DESC, [SemesterReportScheduleId] DESC
        ) AS [RowNumber]
    FROM [SemesterReportSchedules]
    WHERE [IsDeleted] = 0
)
UPDATE schedules
SET [IsDeleted] = 1, [UpdatedAt] = SYSUTCDATETIME()
FROM [SemesterReportSchedules] AS schedules
INNER JOIN RankedSchedules AS ranked ON ranked.[SemesterReportScheduleId] = schedules.[SemesterReportScheduleId]
WHERE ranked.[RowNumber] > 1;

UPDATE internship
SET [Status] = 1, [UpdatedAt] = SYSUTCDATETIME()
FROM [Internships] AS internship
INNER JOIN [Semesters] AS semester ON semester.[SemesterId] = internship.[SemesterId]
WHERE semester.[Status] = 1
    AND semester.[IsDeleted] = 0
    AND internship.[IsDeleted] = 0
    AND internship.[Status] = 0
    AND internship.[CompanyId] IS NOT NULL
    AND internship.[LecturerId] IS NOT NULL;");

            migrationBuilder.DropIndex(
                name: "IX_SemesterReportSchedules_SemesterId_WeekNumber_LecturerId",
                table: "SemesterReportSchedules");

            migrationBuilder.CreateIndex(
                name: "IX_SemesterReportSchedules_SemesterId_WeekNumber",
                table: "SemesterReportSchedules",
                columns: new[] { "SemesterId", "WeekNumber" },
                unique: true,
                filter: "[LecturerId] IS NULL AND [IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_SemesterReportSchedules_SemesterId_WeekNumber_LecturerId",
                table: "SemesterReportSchedules",
                columns: new[] { "SemesterId", "WeekNumber", "LecturerId" },
                unique: true,
                filter: "[LecturerId] IS NOT NULL AND [IsDeleted] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SemesterReportSchedules_SemesterId_WeekNumber",
                table: "SemesterReportSchedules");

            migrationBuilder.DropIndex(
                name: "IX_SemesterReportSchedules_SemesterId_WeekNumber_LecturerId",
                table: "SemesterReportSchedules");

            migrationBuilder.CreateIndex(
                name: "IX_SemesterReportSchedules_SemesterId_WeekNumber_LecturerId",
                table: "SemesterReportSchedules",
                columns: new[] { "SemesterId", "WeekNumber", "LecturerId" },
                unique: true,
                filter: "[LecturerId] IS NOT NULL");
        }
    }
}

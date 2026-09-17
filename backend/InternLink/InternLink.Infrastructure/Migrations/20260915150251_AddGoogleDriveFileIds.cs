using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddGoogleDriveFileIds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GoogleDriveFileId",
                table: "WeeklyReportVersions",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GoogleDriveFileId",
                table: "WeeklyReports",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GoogleDriveFileId",
                table: "Submissions",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GoogleDriveFileId",
                table: "SubmissionAssets",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GoogleDriveFileId",
                table: "DocumentVersions",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GoogleDriveFileId",
                table: "Documents",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GoogleDriveFileId",
                table: "WeeklyReportVersions");

            migrationBuilder.DropColumn(
                name: "GoogleDriveFileId",
                table: "WeeklyReports");

            migrationBuilder.DropColumn(
                name: "GoogleDriveFileId",
                table: "Submissions");

            migrationBuilder.DropColumn(
                name: "GoogleDriveFileId",
                table: "SubmissionAssets");

            migrationBuilder.DropColumn(
                name: "GoogleDriveFileId",
                table: "DocumentVersions");

            migrationBuilder.DropColumn(
                name: "GoogleDriveFileId",
                table: "Documents");
        }
    }
}

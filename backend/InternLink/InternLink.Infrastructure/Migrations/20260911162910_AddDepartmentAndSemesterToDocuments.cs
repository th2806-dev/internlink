using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDepartmentAndSemesterToDocuments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "InternshipId",
                table: "Documents",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<string>(
                name: "Department",
                table: "Documents",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PublishedAt",
                table: "Documents",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SemesterId",
                table: "Documents",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Version",
                table: "Documents",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "1.0");

            migrationBuilder.CreateIndex(
                name: "IX_Documents_SemesterId_Department_IsPublished",
                table: "Documents",
                columns: new[] { "SemesterId", "Department", "IsPublished" });

            migrationBuilder.AddForeignKey(
                name: "FK_Documents_Semesters_SemesterId",
                table: "Documents",
                column: "SemesterId",
                principalTable: "Semesters",
                principalColumn: "SemesterId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Documents_Semesters_SemesterId",
                table: "Documents");

            migrationBuilder.DropIndex(
                name: "IX_Documents_SemesterId_Department_IsPublished",
                table: "Documents");

            migrationBuilder.DropColumn(
                name: "Department",
                table: "Documents");

            migrationBuilder.DropColumn(
                name: "PublishedAt",
                table: "Documents");

            migrationBuilder.DropColumn(
                name: "SemesterId",
                table: "Documents");

            migrationBuilder.DropColumn(
                name: "Version",
                table: "Documents");

            migrationBuilder.AlterColumn<Guid>(
                name: "InternshipId",
                table: "Documents",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
        }
    }
}

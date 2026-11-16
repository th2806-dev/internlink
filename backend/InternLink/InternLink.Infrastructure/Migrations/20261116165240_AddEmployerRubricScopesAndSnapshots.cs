using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployerRubricScopesAndSnapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_EvaluationRubrics_SemesterId",
                table: "EvaluationRubrics");

            migrationBuilder.AddColumn<Guid>(
                name: "DepartmentId",
                table: "EvaluationRubrics",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RatingLevelsJson",
                table: "EvaluationRubrics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Version",
                table: "EvaluationRubrics",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "RubricSnapshotJson",
                table: "EmployerEvaluationTokens",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_EvaluationRubrics_DepartmentId",
                table: "EvaluationRubrics",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_EvaluationRubrics_SemesterId_DepartmentId",
                table: "EvaluationRubrics",
                columns: new[] { "SemesterId", "DepartmentId" },
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.AddForeignKey(
                name: "FK_EvaluationRubrics_Departments_DepartmentId",
                table: "EvaluationRubrics",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "DepartmentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_EvaluationRubrics_Departments_DepartmentId",
                table: "EvaluationRubrics");

            migrationBuilder.DropIndex(
                name: "IX_EvaluationRubrics_DepartmentId",
                table: "EvaluationRubrics");

            migrationBuilder.DropIndex(
                name: "IX_EvaluationRubrics_SemesterId_DepartmentId",
                table: "EvaluationRubrics");

            migrationBuilder.DropColumn(
                name: "DepartmentId",
                table: "EvaluationRubrics");

            migrationBuilder.DropColumn(
                name: "RatingLevelsJson",
                table: "EvaluationRubrics");

            migrationBuilder.DropColumn(
                name: "Version",
                table: "EvaluationRubrics");

            migrationBuilder.DropColumn(
                name: "RubricSnapshotJson",
                table: "EmployerEvaluationTokens");

            migrationBuilder.CreateIndex(
                name: "IX_EvaluationRubrics_SemesterId",
                table: "EvaluationRubrics",
                column: "SemesterId",
                unique: true);
        }
    }
}

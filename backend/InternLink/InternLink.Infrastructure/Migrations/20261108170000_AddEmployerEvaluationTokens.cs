using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace InternLink.Infrastructure.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261108170000_AddEmployerEvaluationTokens")]
public sealed class AddEmployerEvaluationTokens : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "EmployerEvaluationTokens",
            columns: table => new
            {
                Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
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
                Deleted_By = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                Token = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                InternshipId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                MentorEmail = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                MentorName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                ExpiredAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                IsUsed = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                UsedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_EmployerEvaluationTokens", x => x.Auto_ID);
                table.UniqueConstraint("AK_EmployerEvaluationTokens_Public_ID", x => x.Public_ID);
                table.ForeignKey(
                    name: "FK_EmployerEvaluationTokens_Internships_InternshipId",
                    column: x => x.InternshipId,
                    principalTable: "Internships",
                    principalColumn: "InternshipId",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateTable(
            name: "EmployerEvaluations",
            columns: table => new
            {
                Auto_ID = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
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
                Deleted_By = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                InternshipId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                TokenId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                AttendanceScore = table.Column<int>(type: "int", nullable: false),
                SkillsScore = table.Column<int>(type: "int", nullable: false),
                AttitudeScore = table.Column<int>(type: "int", nullable: false),
                FinalScore = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                RubricScoresJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                Strengths = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                AreasForImprovement = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                Comments = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: true),
                ConfirmedMentorName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                ConfirmedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_EmployerEvaluations", x => x.Auto_ID);
                table.ForeignKey(
                    name: "FK_EmployerEvaluations_EmployerEvaluationTokens_TokenId",
                    column: x => x.TokenId,
                    principalTable: "EmployerEvaluationTokens",
                    principalColumn: "Public_ID",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "FK_EmployerEvaluations_Internships_InternshipId",
                    column: x => x.InternshipId,
                    principalTable: "Internships",
                    principalColumn: "InternshipId",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "IX_EmployerEvaluationTokens_InternshipId",
            table: "EmployerEvaluationTokens",
            column: "InternshipId");
        migrationBuilder.CreateIndex(
            name: "IX_EmployerEvaluationTokens_Public_ID",
            table: "EmployerEvaluationTokens",
            column: "Public_ID",
            unique: true);
        migrationBuilder.CreateIndex(
            name: "IX_EmployerEvaluationTokens_Token",
            table: "EmployerEvaluationTokens",
            column: "Token",
            unique: true);
        migrationBuilder.CreateIndex(
            name: "IX_EmployerEvaluations_InternshipId",
            table: "EmployerEvaluations",
            column: "InternshipId",
            unique: true);
        migrationBuilder.CreateIndex(
            name: "IX_EmployerEvaluations_Public_ID",
            table: "EmployerEvaluations",
            column: "Public_ID",
            unique: true);
        migrationBuilder.CreateIndex(
            name: "IX_EmployerEvaluations_TokenId",
            table: "EmployerEvaluations",
            column: "TokenId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "EmployerEvaluations");
        migrationBuilder.DropTable(name: "EmployerEvaluationTokens");
    }
}

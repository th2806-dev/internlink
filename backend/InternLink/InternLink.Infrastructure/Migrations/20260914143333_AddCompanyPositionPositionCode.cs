using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCompanyPositionPositionCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PositionCode",
                table: "CompanyPositions",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_CompanyPositions_PositionCode",
                table: "CompanyPositions",
                column: "PositionCode",
                unique: true,
                filter: "[PositionCode] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CompanyPositions_PositionCode",
                table: "CompanyPositions");

            migrationBuilder.DropColumn(
                name: "PositionCode",
                table: "CompanyPositions");
        }
    }
}

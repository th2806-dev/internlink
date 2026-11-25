using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InternLink.Infrastructure.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261120223216_AddRefreshTokenUserAgent")]
public partial class AddRefreshTokenUserAgent : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "UserAgent",
            table: "RefreshTokens",
            type: "nvarchar(512)",
            maxLength: 512,
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "UserAgent",
            table: "RefreshTokens");
    }
}

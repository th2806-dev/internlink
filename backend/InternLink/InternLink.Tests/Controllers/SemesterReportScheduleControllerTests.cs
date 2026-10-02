using System.Security.Claims;
using FluentAssertions;
using InternLink.API.Controllers;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace InternLink.Tests.Controllers;

public class SemesterReportScheduleControllerTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task SaveEvidenceDeadline_DepartmentAdminCannotWriteOtherOrSharedSemester(bool isSharedSemester)
    {
        var departmentId = Guid.NewGuid();
        Guid? semesterDepartmentId = isSharedSemester ? null : Guid.NewGuid();
        var semesterId = Guid.NewGuid();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        await using var db = new AppDbContext(options);
        db.Semesters.Add(new Semester
        {
            Id = semesterId,
            Name = "Other department semester",
            Term = "Học kỳ I",
            AcademicYear = "2026 - 2027",
            DepartmentId = semesterDepartmentId,
            Status = SemesterStatus.Upcoming,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var departmentScope = new Mock<IDepartmentScopeService>();
        departmentScope.Setup(scope => scope.GetCurrentDepartmentId(It.IsAny<ClaimsPrincipal>()))
            .Returns(departmentId);
        departmentScope.Setup(scope => scope.HasAccess(It.IsAny<ClaimsPrincipal>(), semesterDepartmentId))
            .Returns(false);

        var controller = new SemesterReportScheduleController(
            Mock.Of<ISemesterService>(),
            Mock.Of<ILecturerAccessService>(),
            departmentScope.Object,
            db)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(ClaimTypes.Role, "DepartmentAdmin"),
                        new Claim("DepartmentId", departmentId.ToString()),
                    ], "test")),
                },
            },
        };

        var result = await controller.SaveEvidenceDeadline(semesterId, new SupplementalDeadlineDto
        {
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddDays(1),
        });

        result.Should().BeOfType<ObjectResult>().Which.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
        (await db.SystemSettings.CountAsync()).Should().Be(0);
    }
}
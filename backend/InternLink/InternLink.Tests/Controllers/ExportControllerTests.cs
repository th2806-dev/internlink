using System.Security.Claims;
using FluentAssertions;
using InternLink.API.Controllers;
using InternLink.Application.Interfaces;
using InternLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace InternLink.Tests.Controllers;

public class ExportControllerTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static ExportController CreateController(
        IExcelExportService exportService,
        ILecturerAccessService lecturerAccess,
        IDepartmentScopeService departmentScope,
        ClaimsPrincipal user)
    {
        var controller = new ExportController(
            exportService,
            Mock.Of<IInternshipReportService>(),
            NullLogger<ExportController>.Instance,
            lecturerAccess,
            departmentScope,
            CreateDb())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            }
        };
        return controller;
    }

    private static ClaimsPrincipal LecturerUser(Guid userId) =>
        new(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, "Lecturer")
        ], "test"));

    private static ClaimsPrincipal DepartmentAdminUser(Guid userId) =>
        new(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, "DepartmentAdmin")
        ], "test"));

    [Fact]
    public async Task ExportInternshipExcel_DepartmentAdminUsesEffectiveDepartmentScope()
    {
        var departmentId = Guid.NewGuid();
        var semesterId = Guid.NewGuid();
        var bytes = new byte[] { 7, 8, 9 };
        var exportService = new Mock<IExcelExportService>();
        exportService
            .Setup(service => service.GenerateInternshipExportExcelAsync(
                semesterId,
                null,
                null,
                departmentId,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(bytes);
        var departmentScope = new Mock<IDepartmentScopeService>();
        departmentScope.Setup(service => service.ResolveEffectiveDepartmentId(
                It.IsAny<ClaimsPrincipal>(),
                null))
            .Returns(departmentId);
        var controller = CreateController(
            exportService.Object,
            Mock.Of<ILecturerAccessService>(),
            departmentScope.Object,
            DepartmentAdminUser(Guid.NewGuid()));

        var result = await controller.ExportInternshipExcel(semesterId);

        var file = result.Should().BeOfType<FileContentResult>().Subject;
        file.ContentType.Should().Be("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        file.FileContents.Should().Equal(bytes);
        exportService.Verify(service => service.GenerateInternshipExportExcelAsync(
            semesterId,
            null,
            null,
            departmentId,
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExportInternshipExcel_LecturerCannotOverrideResolvedLecturerScope()
    {
        var userId = Guid.NewGuid();
        var assignedLecturerId = Guid.NewGuid();
        var requestedLecturerId = Guid.NewGuid();
        var semesterId = Guid.NewGuid();
        var bytes = new byte[] { 1, 2, 3 };
        var exportService = new Mock<IExcelExportService>();
        exportService
            .Setup(service => service.GenerateInternshipExportExcelAsync(
                semesterId,
                assignedLecturerId,
                null,
                null,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(bytes);
        var lecturerAccess = new Mock<ILecturerAccessService>();
        lecturerAccess.Setup(service => service.ResolveLecturerIdAsync(userId))
            .ReturnsAsync(assignedLecturerId);
        var departmentScope = new Mock<IDepartmentScopeService>();
        departmentScope.Setup(service => service.ResolveEffectiveDepartmentId(
                It.IsAny<ClaimsPrincipal>(),
                null))
            .Returns((Guid?)null);
        var controller = CreateController(
            exportService.Object,
            lecturerAccess.Object,
            departmentScope.Object,
            LecturerUser(userId));

        var result = await controller.ExportInternshipExcel(
            semesterId,
            requestedLecturerId,
            cancellationToken: CancellationToken.None);

        var file = result.Should().BeOfType<FileContentResult>().Subject;
        file.ContentType.Should().Be("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        file.FileContents.Should().Equal(bytes);
        exportService.Verify(service => service.GenerateInternshipExportExcelAsync(
            semesterId,
            assignedLecturerId,
            null,
            null,
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExportLecturerInternshipExcel_UsesAuthenticatedLecturerScope()
    {
        var userId = Guid.NewGuid();
        var assignedLecturerId = Guid.NewGuid();
        var semesterId = Guid.NewGuid();
        var bytes = new byte[] { 4, 5, 6 };
        var exportService = new Mock<IExcelExportService>();
        exportService
            .Setup(service => service.GenerateInternshipExportExcelAsync(
                semesterId,
                assignedLecturerId,
                null,
                null,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(bytes);
        var lecturerAccess = new Mock<ILecturerAccessService>();
        lecturerAccess.Setup(service => service.ResolveLecturerIdAsync(userId))
            .ReturnsAsync(assignedLecturerId);
        var controller = CreateController(
            exportService.Object,
            lecturerAccess.Object,
            Mock.Of<IDepartmentScopeService>(),
            LecturerUser(userId));

        var result = await controller.ExportLecturerInternshipExcel(semesterId);

        var file = result.Should().BeOfType<FileContentResult>().Subject;
        file.ContentType.Should().Be("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        file.FileContents.Should().Equal(bytes);
        exportService.Verify(service => service.GenerateInternshipExportExcelAsync(
            semesterId,
            assignedLecturerId,
            null,
            null,
            It.IsAny<CancellationToken>()), Times.Once);
    }
}

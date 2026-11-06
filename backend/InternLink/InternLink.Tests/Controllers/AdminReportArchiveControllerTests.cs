using System.Security.Claims;
using FluentAssertions;
using InternLink.API.Controllers;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace InternLink.Tests.Controllers;

public class AdminReportArchiveControllerTests
{
    [Fact]
    public async Task Download_ArchiveReportFilter_ReturnsZip()
    {
        var semesterId = Guid.NewGuid();
        var departmentId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var archiveService = new Mock<IWeeklyReportArchiveService>();
        archiveService
            .Setup(service => service.CreateZipAsync(
                semesterId,
                departmentId,
                userId,
                null,
                "archive"))
            .ReturnsAsync(new WeeklyReportArchiveZipDto
            {
                Content = [1, 2, 3],
                FileName = "archive.zip",
            });
        var departmentScope = new Mock<IDepartmentScopeService>();
        departmentScope
            .Setup(scope => scope.GetCurrentDepartmentId(It.IsAny<ClaimsPrincipal>()))
            .Returns(departmentId);
        var controller = new AdminReportArchiveController(archiveService.Object, departmentScope.Object)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                    ], "test")),
                },
            },
        };

        var result = await controller.Download(semesterId, documentType: "archive");

        var file = result.Should().BeOfType<FileContentResult>().Subject;
        file.ContentType.Should().Be("application/zip");
        file.FileDownloadName.Should().Be("archive.zip");
        file.FileContents.Should().Equal([1, 2, 3]);
        archiveService.Verify(
            service => service.CreateZipAsync(semesterId, departmentId, userId, null, "archive"),
            Times.Once);
    }
}

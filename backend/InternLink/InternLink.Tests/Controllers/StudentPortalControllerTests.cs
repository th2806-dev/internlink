using System.Security.Claims;
using System.Text;
using FluentAssertions;
using InternLink.API.Controllers;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace InternLink.Tests.Controllers;

public class StudentPortalControllerTests
{
    [Fact]
    public async Task DownloadCertificate_WithoutCompany_ShouldReturnBadRequest()
    {
        var userId = Guid.NewGuid();
        var internshipId = Guid.NewGuid();
        var studentService = new Mock<IStudentService>();
        studentService
            .Setup(service => service.GetPortalProfileByUserIdAsync(userId))
            .ReturnsAsync(new StudentPortalProfileDto
            {
                Student = new StudentDto { StudentCode = "SV001", FullName = "Sinh viên" },
                Internship = new InternshipDto
                {
                    Id = internshipId,
                    CompanyId = null,
                    Status = "InProgress"
                }
            });
        var pdfService = new Mock<IPdfExportService>();
        var protector = new Mock<IDataProtector>();
        var dataProtectionProvider = new Mock<IDataProtectionProvider>();
        dataProtectionProvider
            .Setup(provider => provider.CreateProtector(It.IsAny<string>()))
            .Returns(protector.Object);
        var controller = new StudentPortalController(
            studentService.Object,
            pdfService.Object,
            dataProtectionProvider.Object)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                        new Claim(ClaimTypes.Role, "Student")
                    ], "test"))
                }
            }
        };

        var result = await controller.DownloadCertificate();

        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequest.Value.Should()
            .BeOfType<InternLink.Shared.Responses.ApiResponse<object>>().Subject;
        response.Error!.Title.Should().Be(
            "Sinh viên chưa được phân công đơn vị thực tập, không thể xuất phiếu đánh giá.");
        pdfService.Verify(service => service.GenerateStudentEvaluationPdfAsync(
            It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task GetDashboardProgress_ReturnsConfiguredWeeksForCurrentStudent()
    {
        var userId = Guid.NewGuid();
        var response = new StudentDashboardProgressResponse(
            new StudentPortalProfileDto
            {
                Student = new StudentDto { Id = Guid.NewGuid(), StudentCode = "SV001", FullName = "Sinh viên" },
                ProgressPercent = 35
            },
            Guid.NewGuid(),
            "Học kỳ 1",
            "Active",
            12,
            6,
            5,
            0.5m,
            [new StudentDashboardWeekResponse(
                4,
                "Báo cáo tuần 4",
                true,
                false,
                false,
                null,
                DateTimeOffset.UtcNow.AddDays(1))]);
        var studentService = new Mock<IStudentService>();
        studentService
            .Setup(service => service.GetDashboardProgressByUserIdAsync(
                userId,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(response);
        var controller = CreateController(userId, studentService.Object, new Mock<IPdfExportService>().Object);

        var result = await controller.GetDashboardProgress(CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = ok.Value.Should()
            .BeOfType<InternLink.Shared.Responses.ApiResponse<StudentDashboardProgressResponse>>().Subject;
        apiResponse.Data!.Weeks.Should().ContainSingle(week => week.WeekNumber == 4);
    }

    [Fact]
    public async Task GetIntroductionLetter_ProtectsTokenAndReturnsStudentReference()
    {
        var userId = Guid.NewGuid();
        var internshipId = Guid.NewGuid();
        var studentService = new Mock<IStudentService>();
        studentService
            .Setup(service => service.GetPortalProfileByUserIdAsync(
                userId,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new StudentPortalProfileDto
            {
                Student = new StudentDto
                {
                    Id = Guid.NewGuid(),
                    StudentCode = "SV001",
                    FullName = "Sinh viên"
                },
                Internship = new InternshipDto
                {
                    Id = internshipId,
                    CompanyId = Guid.NewGuid(),
                    Status = "InProgress",
                    StartDate = new DateTime(2026, 9, 1),
                    Company = new CompanySummaryDto { CompanyName = "Công ty" }
                }
            });
        var protector = new Mock<IDataProtector>();
        protector.Setup(item => item.Protect(It.IsAny<byte[]>()))
            .Returns(Encoding.UTF8.GetBytes("protected-token"));
        var provider = new Mock<IDataProtectionProvider>();
        provider.Setup(item => item.CreateProtector(It.IsAny<string>())).Returns(protector.Object);
        var controller = CreateController(userId, studentService.Object, new Mock<IPdfExportService>().Object, provider.Object);

        var result = await controller.GetIntroductionLetter(CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var apiResponse = ok.Value.Should()
            .BeOfType<InternLink.Shared.Responses.ApiResponse<StudentIntroductionLetterResponse>>().Subject;
        apiResponse.Data!.ReferenceCode.Should().StartWith("IL-ACC-2026-");
        apiResponse.Data.Token.Should().NotBeNullOrWhiteSpace();
        apiResponse.Data.ExpiresAt.Should().BeAfter(DateTimeOffset.UtcNow);
        protector.Verify(item => item.Protect(It.Is<byte[]>(payload =>
            Encoding.UTF8.GetString(payload).Contains(internshipId.ToString(), StringComparison.OrdinalIgnoreCase))), Times.Once);
    }

    private static StudentPortalController CreateController(
        Guid userId,
        IStudentService studentService,
        IPdfExportService pdfService,
        IDataProtectionProvider? dataProtectionProvider = null)
    {
        if (dataProtectionProvider == null)
        {
            var protector = new Mock<IDataProtector>();
            var provider = new Mock<IDataProtectionProvider>();
            provider.Setup(item => item.CreateProtector(It.IsAny<string>())).Returns(protector.Object);
            dataProtectionProvider = provider.Object;
        }

        return new StudentPortalController(studentService, pdfService, dataProtectionProvider)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                    [
                        new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                        new Claim(ClaimTypes.Role, "Student")
                    ], "test"))
                }
            }
        };
    }
}

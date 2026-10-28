using System.Security.Claims;
using FluentAssertions;
using InternLink.API.Controllers;
using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
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
        var controller = new StudentPortalController(studentService.Object, pdfService.Object)
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
}

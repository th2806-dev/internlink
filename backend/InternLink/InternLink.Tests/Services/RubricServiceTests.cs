using FluentAssertions;
using InternLink.Application.DTOs;
using InternLink.Domain.Entities;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using InternLink.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InternLink.Tests.Services;

public class RubricServiceTests
{
    private static AppDbContext GetDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public async Task CreateAsync_ShouldCreateRubricInApprovedStatus()
    {
        var db = GetDb();
        var semester = new Semester
        {
            Id = Guid.NewGuid(),
            Name = "Kỳ thực tập 2026",
            Term = "HK1",
            AcademicYear = "2026-2027",
            TotalWeeks = 6,
        };

        await db.Semesters.AddAsync(semester);
        await db.SaveChangesAsync();

        var service = new RubricService(db);
        var adminUserId = Guid.NewGuid();

        var request = new CreateRubricRequest
        {
            Name = "Rubric chuẩn",
            ApplicationMode = "Required",
            Criteria = new List<CreateRubricCriterionRequest>
            {
                new() { Name = "Chuyên môn", Description = "Mô tả 1", Weight = 40, MaxScore = 10, OrderIndex = 1 },
                new() { Name = "Thái độ", Description = "Mô tả 2", Weight = 30, MaxScore = 10, OrderIndex = 2 },
                new() { Name = "Kỹ năng", Description = "Mô tả 3", Weight = 30, MaxScore = 10, OrderIndex = 3 },
            },
        };

        var result = await service.CreateAsync(semester.Id, request, adminUserId);

        result.Should().NotBeNull();
        result!.Status.Should().Be("Approved");

        var savedRubric = await db.Set<EvaluationRubric>()
            .SingleAsync(r => r.SemesterId == semester.Id);

        savedRubric.Status.Should().Be(InternLink.Domain.Enums.RubricStatus.Approved);
        savedRubric.ApprovedById.Should().Be(adminUserId);
        savedRubric.ApprovedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateAsync_ShouldKeepRubricApprovedAfterAdminSave()
    {
        var db = GetDb();
        var semester = new Semester
        {
            Id = Guid.NewGuid(),
            Name = "Kỳ thực tập 2026",
            Term = "HK1",
            AcademicYear = "2026-2027",
            TotalWeeks = 6,
        };

        await db.Semesters.AddAsync(semester);
        await db.SaveChangesAsync();

        var service = new RubricService(db);
        var adminUserId = Guid.NewGuid();

        var initial = await service.CreateAsync(
            semester.Id,
            new CreateRubricRequest
            {
                Name = "Rubric ban đầu",
                ApplicationMode = "Required",
                Criteria = new List<CreateRubricCriterionRequest>
                {
                    new() { Name = "Chuyên môn", Description = "Mô tả 1", Weight = 50, MaxScore = 10, OrderIndex = 1 },
                    new() { Name = "Thái độ", Description = "Mô tả 2", Weight = 50, MaxScore = 10, OrderIndex = 2 },
                },
            },
            adminUserId);

        var updated = await service.UpdateAsync(
            initial!.Id,
            new UpdateRubricRequest
            {
                Name = "Rubric đã cập nhật",
                ApplicationMode = "Required",
                Criteria = new List<UpdateRubricCriterionRequest>
                {
                    new() { Name = "Chuyên môn", Description = "Mô tả mới 1", Weight = 40, MaxScore = 10, OrderIndex = 1 },
                    new() { Name = "Thái độ", Description = "Mô tả mới 2", Weight = 60, MaxScore = 10, OrderIndex = 2 },
                },
            },
            adminUserId);

        updated.Should().NotBeNull();
        updated!.Status.Should().Be("Approved");

        var savedRubric = await db.Set<EvaluationRubric>()
            .SingleAsync(r => r.SemesterId == semester.Id);

        savedRubric.Status.Should().Be(InternLink.Domain.Enums.RubricStatus.Approved);
        savedRubric.ApprovedById.Should().Be(adminUserId);
        savedRubric.ApprovedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task GetEmployerConfig_PrefersDepartmentRubricAndFallsBackToSchoolRubric()
    {
        await using var db = GetDb();
        var semester = new Semester
        {
            Id = Guid.NewGuid(),
            Name = "Học kỳ I",
            Term = "Học kỳ I",
            AcademicYear = "2026 - 2027",
            CreatedAt = DateTime.UtcNow
        };
        var department = new Department
        {
            Id = Guid.NewGuid(),
            Code = "CNTT",
            Name = "Khoa Công nghệ thông tin",
            CreatedAt = DateTime.UtcNow
        };
        var schoolRubric = CreateEmployerRubric(semester.Id, null, "Rubric trường");
        var departmentRubric = CreateEmployerRubric(semester.Id, department.Id, "Rubric khoa");
        db.Semesters.Add(semester);
        db.Departments.Add(department);
        db.EvaluationRubrics.AddRange(schoolRubric, departmentRubric);
        await db.SaveChangesAsync();
        var service = new RubricService(db);

        var departmentConfig = await service.GetEmployerConfigAsync(semester.Id, department.Id, CancellationToken.None);

        departmentConfig!.Name.Should().Be("Rubric khoa");
        departmentConfig.IsInherited.Should().BeFalse();

        departmentRubric.IsDeleted = true;
        await db.SaveChangesAsync();

        var inheritedConfig = await service.GetEmployerConfigAsync(semester.Id, department.Id, CancellationToken.None);

        inheritedConfig!.Name.Should().Be("Rubric trường");
        inheritedConfig.IsInherited.Should().BeTrue();
    }

    [Fact]
    public async Task SaveEmployerConfig_CreatesNextVersionAndRetainsPreviousVersion()
    {
        await using var db = GetDb();
        var semester = new Semester
        {
            Id = Guid.NewGuid(),
            Name = "Học kỳ I",
            Term = "Học kỳ I",
            AcademicYear = "2026 - 2027",
            CreatedAt = DateTime.UtcNow
        };
        var department = new Department
        {
            Id = Guid.NewGuid(),
            Code = "CNTT",
            Name = "Khoa Công nghệ thông tin",
            CreatedAt = DateTime.UtcNow
        };
        var previousRubric = CreateEmployerRubric(semester.Id, department.Id, "Rubric cũ");
        db.Semesters.Add(semester);
        db.Departments.Add(department);
        db.EvaluationRubrics.Add(previousRubric);
        await db.SaveChangesAsync();
        var service = new RubricService(db);

        var saved = await service.SaveEmployerConfigAsync(
            semester.Id,
            department.Id,
            new SaveEmployerRubricRequest
            {
                Name = "Rubric mới",
                RatingLevels =
                [
                    new(0, "Chưa đáp ứng", "Mô tả mức 0"),
                    new(1, "Cần cải thiện", "Mô tả mức 1"),
                    new(2, "Đạt một phần", "Mô tả mức 2"),
                    new(3, "Đạt yêu cầu", "Mô tả mức 3"),
                    new(4, "Vượt yêu cầu", "Mô tả mức 4")
                ],
                Criteria = Enumerable.Range(1, 8)
                    .Select(index => new SaveEmployerRubricCriterionRequest
                    {
                        Name = $"Tiêu chí {index}",
                        Weight = 12.5m
                    })
                    .ToList()
            },
            Guid.NewGuid(),
            CancellationToken.None);

        saved.Name.Should().Be("Rubric mới");
        saved.Version.Should().Be(2);
        saved.IsInherited.Should().BeFalse();
        previousRubric.IsDeleted.Should().BeTrue();
        db.EvaluationRubrics.Count(rubric =>
            rubric.SemesterId == semester.Id && rubric.DepartmentId == department.Id).Should().Be(2);
    }

    private static EvaluationRubric CreateEmployerRubric(Guid semesterId, Guid? departmentId, string name) => new()
    {
        Id = Guid.NewGuid(),
        SemesterId = semesterId,
        DepartmentId = departmentId,
        Name = name,
        Version = 1,
        Status = RubricStatus.Approved,
        CreatedAt = DateTime.UtcNow
    };
}

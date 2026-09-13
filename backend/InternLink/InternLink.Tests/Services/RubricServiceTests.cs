using FluentAssertions;
using InternLink.Application.DTOs;
using InternLink.Domain.Entities;
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
}

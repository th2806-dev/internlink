using System.Data;
using System.Text.Json;
using System.Text.Json.Nodes;
using InternLink.Application.DTOs;
using InternLink.Application.Exceptions;
using InternLink.Application.Interfaces;
using InternLink.Domain.Entities;
using InternLink.Domain.Entities.Rbac;
using InternLink.Domain.Entities.System;
using InternLink.Domain.Enums;
using InternLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InternLink.Infrastructure.Services;

public sealed class SystemComplianceService(AppDbContext context) : ISystemComplianceService
{
    private const string StudentPiiPolicyCode = "STUDENT_PII";
    private const string AnonymizationOperationCode = "STUDENT_PII_ANONYMIZATION";
    private const string AnonymizedFullName = "Sinh viên đã ẩn danh";
    private static readonly HashSet<string> PiiAuditProperties = new(StringComparer.OrdinalIgnoreCase)
    {
        "FullName",
        "DisplayName",
        "Email",
        "Phone",
        "ResumeUrl",
        "AvatarUrl"
    };

    public async Task<IReadOnlyList<DataRetentionPolicyResponse>> GetPoliciesAsync(
        CancellationToken cancellationToken)
    {
        var policies = await context.SysDataRetentionPolicies
            .AsNoTracking()
            .Where(item => !item.IsDeleted)
            .OrderBy(item => item.Code)
            .ToListAsync(cancellationToken);
        return policies.Select(MapPolicy).ToArray();
    }

    public async Task<DataRetentionPolicyResponse?> UpdatePolicyAsync(
        string code,
        UpdateDataRetentionPolicyRequest request,
        CancellationToken cancellationToken)
    {
        var normalizedCode = code.Trim().ToUpperInvariant();
        var policy = await context.SysDataRetentionPolicies
            .FirstOrDefaultAsync(item => item.Code == normalizedCode && !item.IsDeleted, cancellationToken);
        if (policy == null)
            return null;

        policy.RetentionYears = request.RetentionYears;
        policy.IsEnabled = request.IsEnabled;
        await context.SaveChangesAsync(cancellationToken);
        return MapPolicy(policy);
    }

    public async Task<AnonymizationPreviewResponse> GetAnonymizationPreviewAsync(
        CancellationToken cancellationToken)
    {
        var policy = await GetStudentPiiPolicyAsync(cancellationToken);
        var cutoff = DateTime.UtcNow.AddYears(-policy.RetentionYears);
        var count = policy.IsEnabled
            ? await EligibleStudentsQuery(cutoff).CountAsync(cancellationToken)
            : 0;

        return new AnonymizationPreviewResponse(
            count,
            policy.RetentionYears,
            ToOffset(cutoff),
            policy.IsEnabled);
    }

    public async Task<ComplianceExecutionResponse> ExecuteAnonymizationAsync(
        int expectedEligibleCount,
        string triggeredBy,
        CancellationToken cancellationToken)
    {
        await using var transaction = context.Database.IsRelational()
            ? await context.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken)
            : null;

        var policy = await GetStudentPiiPolicyAsync(cancellationToken);
        if (!policy.IsEnabled)
            throw new InvalidOperationException("Chính sách ẩn danh hồ sơ sinh viên hiện đang tắt.");

        var executedAt = DateTime.UtcNow;
        var cutoff = executedAt.AddYears(-policy.RetentionYears);
        var students = await EligibleStudentsQuery(cutoff)
            .Include(student => student.User)
            .ToListAsync(cancellationToken);
        if (students.Count != expectedEligibleCount)
            throw new AnonymizationPreviewChangedException();

        var studentIds = students.Select(item => item.PublicId).ToArray();
        var userIds = students.Where(item => item.User != null)
            .Select(item => item.User!.PublicId)
            .Distinct()
            .ToArray();
        var anonymizedUsers = await context.SysUsers.IgnoreQueryFilters()
            .Where(item => userIds.Contains(item.PublicId) && !item.IsDeleted)
            .ToListAsync(cancellationToken);

        foreach (var student in students)
        {
            var anonymizedEmail = BuildAnonymizedEmail(student.PublicId);
            student.FullName = AnonymizedFullName;
            student.Email = anonymizedEmail;
            student.Phone = null;
            student.ResumeUrl = null;
            if (student.User != null)
            {
                student.User.FullName = AnonymizedFullName;
                student.User.Email = anonymizedEmail;
                student.User.AvatarUrl = null;
            }
        }

        foreach (var systemUser in anonymizedUsers)
            systemUser.DisplayName = AnonymizedFullName;

        await RedactHistoricalAuditPiiAsync(studentIds, userIds, cancellationToken);

        var log = new SysComplianceLog
        {
            OperationCode = AnonymizationOperationCode,
            Status = "Completed",
            AffectedCount = students.Count,
            RetentionYears = policy.RetentionYears,
            CutoffAt = cutoff,
            TriggeredBy = string.IsNullOrWhiteSpace(triggeredBy) ? "system" : triggeredBy.Trim(),
            ExecutedAt = executedAt,
            Details = "Đã ẩn danh hồ sơ đủ điều kiện; MSSV, Khoa, kỳ thực tập và kết quả đánh giá được bảo lưu."
        };
        context.SysComplianceLogs.Add(log);
        await context.SaveChangesAsync(cancellationToken);
        if (transaction != null)
            await transaction.CommitAsync(cancellationToken);

        return new ComplianceExecutionResponse(
            log.PublicId,
            log.OperationCode,
            log.Status,
            log.AffectedCount,
            log.RetentionYears,
            ToOffset(log.CutoffAt),
            ToOffset(log.ExecutedAt),
            log.TriggeredBy);
    }

    public async Task<IReadOnlyList<ComplianceLogResponse>> GetAuditLogsAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var logs = await context.SysComplianceLogs
            .AsNoTracking()
            .Where(item => !item.IsDeleted)
            .OrderByDescending(item => item.ExecutedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
        return logs.Select(item => new ComplianceLogResponse(
            item.PublicId,
            item.OperationCode,
            item.Status,
            item.AffectedCount,
            item.RetentionYears,
            ToOffset(item.CutoffAt),
            ToOffset(item.ExecutedAt),
            item.TriggeredBy,
            item.Details)).ToArray();
    }

    private async Task<SysDataRetentionPolicy> GetStudentPiiPolicyAsync(CancellationToken cancellationToken) =>
        await context.SysDataRetentionPolicies
            .FirstOrDefaultAsync(item => item.Code == StudentPiiPolicyCode && !item.IsDeleted, cancellationToken)
        ?? throw new InvalidOperationException("Chưa cấu hình chính sách lưu trữ định danh sinh viên.");

    private IQueryable<Student> EligibleStudentsQuery(DateTime cutoff) =>
        context.Students.IgnoreQueryFilters()
            .Where(student => !student.IsDeleted
                && student.Internships.Any(internship => !internship.IsDeleted)
                && !student.Internships.Any(internship => !internship.IsDeleted
                    && (internship.Status != InternshipStatus.Completed
                        || internship.Semester == null
                        || internship.Semester.IsDeleted
                        || internship.Semester.EndDate == null
                        || internship.Semester.EndDate > cutoff)));

    private async Task RedactHistoricalAuditPiiAsync(
        IReadOnlyCollection<Guid> studentIds,
        IReadOnlyCollection<Guid> userIds,
        CancellationToken cancellationToken)
    {
        await RedactAuditRowsAsync("Students", studentIds, cancellationToken);
        await RedactAuditRowsAsync("Users", userIds, cancellationToken);
        await RedactAuditRowsAsync("Sys_Users", userIds, cancellationToken);
    }

    private async Task RedactAuditRowsAsync(
        string tableName,
        IReadOnlyCollection<Guid> publicIds,
        CancellationToken cancellationToken)
    {
        foreach (var idBatch in publicIds.Select(item => item.ToString()).Chunk(500))
        {
            var rows = await context.SysAuditLogs.IgnoreQueryFilters()
                .Where(item => item.TableName == tableName && idBatch.Contains(item.RecordId))
                .ToListAsync(cancellationToken);
            foreach (var row in rows)
            {
                row.OldValuesJson = RemovePiiProperties(row.OldValuesJson);
                row.NewValuesJson = RemovePiiProperties(row.NewValuesJson);
            }
        }
    }

    private static string? RemovePiiProperties(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return json;

        try
        {
            if (JsonNode.Parse(json) is not JsonObject values)
                return null;

            foreach (var propertyName in values
                         .Select(item => item.Key)
                         .Where(PiiAuditProperties.Contains)
                         .ToArray())
            {
                values.Remove(propertyName);
            }

            return values.ToJsonString();
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string BuildAnonymizedEmail(Guid publicId) =>
        $"anonymized_{publicId:N}@internlink.vn";

    private static DataRetentionPolicyResponse MapPolicy(SysDataRetentionPolicy policy) =>
        new(
            policy.Code,
            policy.Name,
            policy.Description,
            policy.RetentionYears,
            policy.IsEnabled,
            policy.UpdatedAt.HasValue ? ToOffset(policy.UpdatedAt.Value) : null);

    private static DateTimeOffset ToOffset(DateTime value) =>
        new(DateTime.SpecifyKind(value, DateTimeKind.Utc));
}

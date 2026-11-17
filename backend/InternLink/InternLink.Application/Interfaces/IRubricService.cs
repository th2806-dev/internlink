using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

/// <summary>
/// Service for managing evaluation rubrics: CRUD, workflow (submit/approve/reject),
/// and fetching the active rubric for a semester.
/// </summary>
public interface IRubricService
{
    /// <summary>
    /// Get rubric for a specific semester
    /// </summary>
    Task<RubricDto?> GetBySemesterAsync(Guid semesterId);

    Task<EmployerRubricConfigDto?> GetEmployerConfigAsync(
        Guid semesterId,
        Guid? departmentId,
        CancellationToken cancellationToken);

    Task<EmployerRubricConfigDto> SaveEmployerConfigAsync(
        Guid semesterId,
        Guid? departmentId,
        SaveEmployerRubricRequest request,
        Guid updatedByUserId,
        CancellationToken cancellationToken);

    /// <summary>
    /// Create a new rubric for a semester (status = Approved for Admin-created rubrics)
    /// </summary>
    Task<RubricDto> CreateAsync(Guid semesterId, CreateRubricRequest request, Guid createdByUserId);

    /// <summary>
    /// Update an existing rubric unless it is Locked. Admin changes remain applied immediately.
    /// </summary>
    Task<RubricDto?> UpdateAsync(Guid rubricId, UpdateRubricRequest request, Guid updatedByUserId);

    /// <summary>
    /// Delete a rubric (only if Draft or Rejected)
    /// </summary>
    Task<bool> DeleteAsync(Guid rubricId);

    /// <summary>
    /// Submit rubric for approval (Draft → PendingApproval)
    /// </summary>
    Task<RubricDto?> SubmitForApprovalAsync(Guid rubricId, Guid submittedByUserId, string? note);

    /// <summary>
    /// Approve rubric (PendingApproval → Approved). SuperAdmin acts as DepartmentHead.
    /// </summary>
    Task<RubricDto?> ApproveAsync(Guid rubricId, Guid approvedByUserId, string? note);

    /// <summary>
    /// Reject rubric (PendingApproval → Rejected)
    /// </summary>
    Task<RubricDto?> RejectAsync(Guid rubricId, string rejectionReason);

    /// <summary>
    /// Lock rubric (Approved → Locked). Called when semester starts grading.
    /// </summary>
    Task<RubricDto?> LockAsync(Guid rubricId);

    /// <summary>
    /// Get approved rubric for a semester (used by Lecturer to score students)
    /// Returns null if no approved rubric exists.
    /// </summary>
    Task<RubricDto?> GetApprovedRubricAsync(Guid semesterId);
}

namespace InternLink.Application.DTOs;

/// <summary>
/// Request for creating a new department.
/// </summary>
public class CreateDepartmentRequest
{
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Request for updating an existing department (soft fields only; code/name can be changed).
/// </summary>
public class UpdateDepartmentRequest
{
    public string? Code { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
}

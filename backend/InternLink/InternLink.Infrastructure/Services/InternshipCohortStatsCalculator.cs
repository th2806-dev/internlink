namespace InternLink.Infrastructure.Services;

internal static class InternshipCohortStatsCalculator
{
    public static int CountNotInterningStudents(
        IEnumerable<(Guid StudentId, string? ClassName)> internshipStudents,
        IEnumerable<(Guid StudentId, string? ClassName)> departmentStudents)
    {
        var internships = internshipStudents.ToList();
        if (internships.Count == 0)
            return 0;

        var internshipStudentIds = internships.Select(item => item.StudentId).ToHashSet();
        var cohortClasses = internships
            .Select(item => item.ClassName?.Trim())
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Select(name => name!)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        return departmentStudents.Count(student =>
            !internshipStudentIds.Contains(student.StudentId)
            && !string.IsNullOrWhiteSpace(student.ClassName)
            && cohortClasses.Contains(student.ClassName.Trim()));
    }
}

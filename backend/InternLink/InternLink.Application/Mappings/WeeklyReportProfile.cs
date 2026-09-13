using AutoMapper;
using InternLink.Application.DTOs;
using InternLink.Domain.Entities;

namespace InternLink.Application.Mappings;

public class WeeklyReportProfile : Profile
{
    public WeeklyReportProfile()
    {
        CreateMap<WeeklyReport, WeeklyReportDto>().MaxDepth(64)
            .ForMember(d => d.Feedbacks, o => o.MapFrom(s => s.Feedbacks.Where(f => !f.IsDeleted)))
            .ForMember(d => d.Versions, o => o.MapFrom(s => s.Versions.OrderByDescending(v => v.Version)))
            .ForMember(d => d.DueDate, o => o.MapFrom(s => CalculateDueDate(s)))
            .ForMember(d => d.Status, o => o.MapFrom(s => s.Status.ToString()));

        CreateMap<WeeklyReportVersion, WeeklyReportVersionDto>();
    }

    private static DateTime? CalculateDueDate(WeeklyReport report)
    {
        var semester = report.Internship?.Semester;
        if (semester?.StartDate is not DateTime start || semester.EndDate is not DateTime end)
            return null;

        var totalWeeks = Math.Max(semester.TotalWeeks, 1);
        var week = Math.Clamp(report.WeekNumber, 1, totalWeeks);
        var totalDays = (end.Date - start.Date).TotalDays;
        return start.Date.AddDays(Math.Round(totalDays * week / totalWeeks));
    }
}

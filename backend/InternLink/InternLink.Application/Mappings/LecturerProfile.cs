using AutoMapper;
using InternLink.Application.DTOs;
using InternLink.Domain.Entities;

namespace InternLink.Application.Mappings;

public class LecturerProfile : Profile
{
    public LecturerProfile()
    {
        CreateMap<Lecturer, LecturerDto>().MaxDepth(64)
            .ForMember(d => d.DepartmentId, o => o.MapFrom(s => s.DepartmentId));
        CreateMap<CreateLecturerRequest, Lecturer>().MaxDepth(64)
            .ForMember(d => d.Id, o => o.Ignore())
            .ForMember(d => d.User, o => o.Ignore())
            .ForMember(d => d.Internships, o => o.Ignore())
            .ForMember(d => d.CreatedAt, o => o.Ignore())
            .ForMember(d => d.UpdatedAt, o => o.Ignore())
            .ForMember(d => d.IsDeleted, o => o.Ignore())
            .ForMember(d => d.CreatedBy, o => o.Ignore())
            .ForMember(d => d.UpdatedBy, o => o.Ignore());

        CreateMap<Student, StudentSummaryDto>().MaxDepth(64);
        CreateMap<Company, CompanySummaryDto>().MaxDepth(64);

        CreateMap<Internship, InternshipDto>().MaxDepth(64)
            .ForMember(d => d.Status, o => o.MapFrom(s => s.Status.ToString()));

        CreateMap<Internship, InternshipDetailDto>().MaxDepth(64)
            .IncludeBase<Internship, InternshipDto>();
    }
}

using AutoMapper;
using InternLink.Application.DTOs;
using InternLink.Domain.Entities;

namespace InternLink.Application.Mappings;

/// <summary>
/// AutoMapper profile for Student entity mappings
/// </summary>
public class StudentProfile : Profile
{
    public StudentProfile()
    {
        CreateMap<Student, StudentDto>().MaxDepth(64)
            .ForMember(d => d.DepartmentId, o => o.MapFrom(s => s.DepartmentId))
            .ForMember(d => d.AccountIsActive,
                o => o.MapFrom(s => s.User != null ? s.User.IsActive : (bool?)null))
            .ForMember(d => d.AccountLastLoginAt,
                o => o.MapFrom(s => s.User != null ? s.User.LastLoginAt : (DateTime?)null));
        CreateMap<CreateStudentRequest, Student>().MaxDepth(64);
        CreateMap<UpdateStudentRequest, Student>().MaxDepth(64);
    }
}

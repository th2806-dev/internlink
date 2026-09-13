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
            .ForMember(d => d.DepartmentId, o => o.MapFrom(s => s.DepartmentId));
        CreateMap<CreateStudentRequest, Student>().MaxDepth(64);
        CreateMap<UpdateStudentRequest, Student>().MaxDepth(64);
    }
}

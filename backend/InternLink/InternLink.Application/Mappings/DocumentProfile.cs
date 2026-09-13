using AutoMapper;
using InternLink.Application.DTOs;
using InternLink.Domain.Entities;

namespace InternLink.Application.Mappings;

public class DocumentProfile : Profile
{
    public DocumentProfile()
    {
        CreateMap<Document, DocumentListItemDto>().MaxDepth(64)
            .ForMember(dest => dest.SemesterName, opt => opt.MapFrom(src => src.Semester != null ? src.Semester.Name : null))
            .ForMember(dest => dest.UploadedBy, opt => opt.MapFrom(src => MapUploadedBy(src.UploadedBy)));

        CreateMap<Document, DocumentDetailDto>().MaxDepth(64)
            .ForMember(dest => dest.SemesterName, opt => opt.MapFrom(src => src.Semester != null ? src.Semester.Name : null))
            .ForMember(dest => dest.UploadedBy, opt => opt.MapFrom(src => MapUploadedBy(src.UploadedBy)));

        CreateMap<CreateDocumentRequest, Document>().MaxDepth(64)
            .ForMember(dest => dest.Id, opt => opt.MapFrom(_ => Guid.NewGuid()))
            .ForMember(dest => dest.UploadedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow));

        CreateMap<UpdateDocumentRequest, Document>().MaxDepth(64)
            .ForAllMembers(opts => opts.Condition((src, dest, srcMember) => srcMember != null));

        CreateMap<DocumentVersion, DocumentVersionDto>().MaxDepth(64);
    }

    private static UserSummaryDto? MapUploadedBy(Lecturer? lecturer)
    {
        if (lecturer == null)
            return null;

        return new UserSummaryDto
        {
            Id = lecturer.Id,
            FullName = lecturer.FullName,
            Email = lecturer.Email
        };
    }
}

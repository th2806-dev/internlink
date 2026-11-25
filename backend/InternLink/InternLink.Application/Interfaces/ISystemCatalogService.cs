using InternLink.Application.DTOs;

namespace InternLink.Application.Interfaces;

public interface ISystemCatalogService
{
    SystemCatalogResponse GetCatalog();
}

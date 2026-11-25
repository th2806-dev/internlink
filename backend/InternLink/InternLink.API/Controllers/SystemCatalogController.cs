using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;
using InternLink.Shared.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InternLink.API.Controllers;

/// <summary>Provides canonical platform combobox values and system enums.</summary>
[ApiController]
[Route("api/v1/system/catalogs")]
[Authorize]
public sealed class SystemCatalogController(ISystemCatalogService catalogService) : ControllerBase
{
    /// <summary>Gets shared catalog options for SuperAdmin screens.</summary>
    [HttpGet]
    public ActionResult<ApiResponse<SystemCatalogResponse>> Get()
    {
        return Ok(ApiResponse<SystemCatalogResponse>.Ok(catalogService.GetCatalog()));
    }
}

using InternLink.Application.DTOs;
using InternLink.Application.Interfaces;

namespace InternLink.Infrastructure.Services;

public sealed class SystemCatalogService : ISystemCatalogService
{
    public SystemCatalogResponse GetCatalog()
    {
        var vietQrBanks = new[]
        {
            new SystemCatalogOption("970425", "ABBANK"),
            new SystemCatalogOption("970416", "ACB"),
            new SystemCatalogOption("970405", "Agribank"),
            new SystemCatalogOption("970409", "BacABank"),
            new SystemCatalogOption("970438", "BaoVietBank"),
            new SystemCatalogOption("970418", "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)"),
            new SystemCatalogOption("970446", "COOPBANK"),
            new SystemCatalogOption("970431", "Eximbank"),
            new SystemCatalogOption("970437", "HDBank"),
            new SystemCatalogOption("970434", "IndovinaBank"),
            new SystemCatalogOption("970452", "KienLongBank"),
            new SystemCatalogOption("970449", "LPBank"),
            new SystemCatalogOption("970422", "Ngân hàng TMCP Quân đội (MBBank)"),
            new SystemCatalogOption("970414", "MBV"),
            new SystemCatalogOption("970426", "MSB"),
            new SystemCatalogOption("970428", "NamABank"),
            new SystemCatalogOption("970419", "NCB"),
            new SystemCatalogOption("970448", "OCB"),
            new SystemCatalogOption("970430", "PGBank"),
            new SystemCatalogOption("970412", "PVcomBank"),
            new SystemCatalogOption("970403", "Sacombank"),
            new SystemCatalogOption("970400", "SaigonBank"),
            new SystemCatalogOption("970429", "SCB"),
            new SystemCatalogOption("970440", "SeABank"),
            new SystemCatalogOption("970443", "SHB"),
            new SystemCatalogOption("970407", "Ngân hàng TMCP Kỹ thương Việt Nam (Techcombank)"),
            new SystemCatalogOption("970423", "TPBank"),
            new SystemCatalogOption("970441", "VIB"),
            new SystemCatalogOption("970427", "VietABank"),
            new SystemCatalogOption("970433", "VietBank"),
            new SystemCatalogOption("970454", "VietCapitalBank"),
            new SystemCatalogOption("970436", "Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)"),
            new SystemCatalogOption("970415", "Ngân hàng TMCP Công thương Việt Nam (VietinBank)"),
            new SystemCatalogOption("970406", "Vikki"),
            new SystemCatalogOption("970432", "Ngân hàng TMCP Việt Nam Thịnh Vượng (VPBank)")
        }.Select(bank => bank with
        {
            LogoUrl = $"https://cdn.vietqr.io/img/{GetVietQrLogoCode(bank.Value)}.png"
        }).ToArray();

        return new SystemCatalogResponse(
            vietQrBanks,
            [
                new("STANDARD", "Tiêu chuẩn"),
                new("PRO", "Chuyên nghiệp"),
                new("ENTERPRISE", "Doanh nghiệp")
            ],
            [12, 24, 36],
            [
                new("VietQR", "VietQR"),
                new("BankTransfer", "Chuyển khoản ngân hàng")
            ],
            [
                new("Maintenance", "Bảo trì"),
                new("ReleaseNote", "Bản phát hành"),
                new("SecurityAlert", "Khẩn cấp / bảo mật"),
                new("General", "Thông báo chung")
            ],
            [
                new("AllUsers", "Tất cả người dùng"),
                new("TenantAdminsOnly", "Quản trị viên đơn vị")
            ]);
    }

    private static string GetVietQrLogoCode(string bankId) =>
        bankId switch
        {
            "970425" => "ABB",
            "970416" => "ACB",
            "970405" => "VBA",
            "970409" => "BAB",
            "970438" => "BVB",
            "970418" => "BIDV",
            "970446" => "COOP",
            "970431" => "EIB",
            "970437" => "HDB",
            "970434" => "VIV",
            "970452" => "KLB",
            "970449" => "LPB",
            "970422" => "MB",
            "970414" => "MBV",
            "970426" => "MSB",
            "970428" => "NAB",
            "970419" => "NCB",
            "970448" => "OCB",
            "970430" => "PGB",
            "970412" => "PVC",
            "970403" => "STB",
            "970400" => "SGICB",
            "970429" => "SCB",
            "970440" => "SEAB",
            "970443" => "SHB",
            "970407" => "TCB",
            "970423" => "TPB",
            "970441" => "VIB",
            "970427" => "VAB",
            "970433" => "VNVB",
            "970454" => "VCB",
            "970436" => "VCB",
            "970415" => "ICB",
            "970406" => "Vikki",
            "970432" => "VPB",
            _ => bankId
        };
}

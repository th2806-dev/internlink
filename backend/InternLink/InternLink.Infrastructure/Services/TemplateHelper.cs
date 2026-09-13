using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using ClosedXML.Excel;

namespace InternLink.Infrastructure.Services;

public static class TemplateHelper
{
    public static string? FindTemplatePath(string templateFileName)
    {
        var result = FindSingleTemplatePath(templateFileName);
        if (result != null) return result;

        // Try aliases / fallback names
        if (templateFileName.Contains("Bao cao tong ket", StringComparison.OrdinalIgnoreCase))
        {
            var fallback = FindSingleTemplatePath("Bao cao tong ket cong tac thuc tap tot nghiep.docx")
                ?? FindSingleTemplatePath("Bao cao tong ket cong tac thuc tap tot nghiep C22A.docx")
                ?? FindByStem("Bao cao tong ket cong tac thuc tap tot nghiep", ".docx");
            if (fallback != null) return fallback;
        }

        if (templateFileName.Contains("Lich huong dan", StringComparison.OrdinalIgnoreCase))
        {
            var fallback = FindSingleTemplatePath("Lich huong dan TTTN-C23-Cuong.xlsx")
                ?? FindSingleTemplatePath("Lich huong dan TTTN.xlsx")
                ?? FindByStem("Lich huong dan", ".xlsx");
            if (fallback != null) return fallback;
        }

        if (templateFileName.Contains("InternshipExportTemplate", StringComparison.OrdinalIgnoreCase)
            || templateFileName.Contains("DANH SACH THUC TAP", StringComparison.OrdinalIgnoreCase))
        {
            var fallback = FindSingleTemplatePath("InternshipExportTemplate.xlsx")
                ?? FindSingleTemplatePath("DANH SACH THUC TAP C23.xlsx")
                ?? FindByStem("InternshipExportTemplate", ".xlsx")
                ?? FindByStem("DANH SACH THUC TAP", ".xlsx");
            if (fallback != null) return fallback;
        }

        // Generic: match files whose stem equals the requested name without semester codes (C22A, C23, …)
        var extension = Path.GetExtension(templateFileName);
        var stem = StripSemesterCode(Path.GetFileNameWithoutExtension(templateFileName));
        if (!string.IsNullOrWhiteSpace(stem))
        {
            var fuzzy = FindByStem(stem, extension);
            if (fuzzy != null) return fuzzy;
        }

        return null;
    }

    /// <summary>
    /// Removes trailing cohort/semester markers such as " C22A", " C23", "-C23-Cuong".
    /// </summary>
    private static string StripSemesterCode(string fileNameWithoutExtension)
    {
        if (string.IsNullOrWhiteSpace(fileNameWithoutExtension)) return string.Empty;
        // Strip "-C23-Cuong" / "_C22A" / " C23" style suffixes
        var stripped = Regex.Replace(
            fileNameWithoutExtension.Trim(),
            @"[\s_-]*C\d{2}[A-Z]?(?:-[\w]+)?$",
            string.Empty,
            RegexOptions.IgnoreCase);
        return stripped.Trim();
    }

    private static string? FindByStem(string stem, string extension)
    {
        if (string.IsNullOrWhiteSpace(stem)) return null;
        var normalizedStem = NormalizeText(StripSemesterCode(stem));
        var ext = string.IsNullOrWhiteSpace(extension) ? string.Empty : extension;

        foreach (var dir in GetTemplateDirectories())
        {
            if (!Directory.Exists(dir)) continue;
            foreach (var file in Directory.EnumerateFiles(dir, $"*{ext}", SearchOption.TopDirectoryOnly))
            {
                var name = Path.GetFileNameWithoutExtension(file);
                var normalizedName = NormalizeText(StripSemesterCode(name));
                if (normalizedName.Equals(normalizedStem, StringComparison.OrdinalIgnoreCase)
                    || normalizedName.StartsWith(normalizedStem, StringComparison.OrdinalIgnoreCase)
                    || normalizedStem.StartsWith(normalizedName, StringComparison.OrdinalIgnoreCase))
                {
                    return file;
                }
            }
        }

        return null;
    }

    private static IEnumerable<string> GetTemplateDirectories()
    {
        var roots = new List<string>
        {
            AppContext.BaseDirectory,
            Directory.GetCurrentDirectory()
        };

        var current = new DirectoryInfo(Directory.GetCurrentDirectory());
        for (int i = 0; i < 5 && current != null; i++)
        {
            roots.Add(current.FullName);
            current = current.Parent;
        }

        var baseCurrent = new DirectoryInfo(AppContext.BaseDirectory);
        for (int i = 0; i < 5 && baseCurrent != null; i++)
        {
            roots.Add(baseCurrent.FullName);
            baseCurrent = baseCurrent.Parent;
        }

        var relativeDirs = new[]
        {
            Path.Combine("Templates", "importTemplates"),
            "Templates",
            Path.Combine("InternLink.API", "Templates", "importTemplates"),
            Path.Combine("InternLink.API", "Templates"),
            Path.Combine("backend", "InternLink", "InternLink.API", "Templates", "importTemplates"),
            Path.Combine("backend", "InternLink", "InternLink.API", "Templates"),
        };

        foreach (var root in roots.Distinct())
        {
            foreach (var rel in relativeDirs)
            {
                yield return Path.Combine(root, rel);
            }
        }
    }

    private static string? FindSingleTemplatePath(string templateFileName)
    {
        var roots = new List<string>
        {
            AppContext.BaseDirectory,
            Directory.GetCurrentDirectory()
        };

        // Traverse parent directories for dev/test environments
        var current = new DirectoryInfo(Directory.GetCurrentDirectory());
        for (int i = 0; i < 5 && current != null; i++)
        {
            roots.Add(current.FullName);
            current = current.Parent;
        }

        var baseCurrent = new DirectoryInfo(AppContext.BaseDirectory);
        for (int i = 0; i < 5 && baseCurrent != null; i++)
        {
            roots.Add(baseCurrent.FullName);
            baseCurrent = baseCurrent.Parent;
        }

        var candidateRelativePaths = new[]
        {
            Path.Combine("Templates", "importTemplates", templateFileName),
            Path.Combine("Templates", templateFileName),
            Path.Combine("InternLink.API", "Templates", "importTemplates", templateFileName),
            Path.Combine("InternLink.API", "Templates", templateFileName),
            Path.Combine("backend", "InternLink", "InternLink.API", "Templates", "importTemplates", templateFileName),
            Path.Combine("backend", "InternLink", "InternLink.API", "Templates", templateFileName)
        };

        foreach (var root in roots.Distinct())
        {
            foreach (var rel in candidateRelativePaths)
            {
                var full = Path.Combine(root, rel);
                if (File.Exists(full))
                    return full;
            }
        }

        return null;
    }

    public static byte[] GetTemplateBytes(string templateFileName, Func<byte[]> fallbackGenerator)
    {
        var path = FindTemplatePath(templateFileName);
        if (!string.IsNullOrEmpty(path) && File.Exists(path))
        {
            return File.ReadAllBytes(path);
        }

        return fallbackGenerator();
    }

    public static IXLRangeRow? FindHeaderRow(IXLWorksheet worksheet, Func<IXLRangeRow, bool> isHeaderPredicate, int maxScanRows = 6)
    {
        var usedRange = worksheet.RangeUsed();
        if (usedRange == null) return null;

        var rowCount = Math.Min(maxScanRows, usedRange.RowCount());
        for (int r = 1; r <= rowCount; r++)
        {
            var row = usedRange.Row(r);
            if (isHeaderPredicate(row))
                return row;
        }

        return usedRange.FirstRow();
    }

    public static string NormalizeText(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;
        var formD = text.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(formD.Length);
        foreach (var ch in formD)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                sb.Append(ch);
        }
        var res = sb.ToString().Normalize(NormalizationForm.FormC).Replace('đ', 'd').Replace('Đ', 'D');
        return Regex.Replace(res, @"\s+", " ");
    }

    public static string? CombineFullName(string? ho, string? ten, string? hoTen)
    {
        if (!string.IsNullOrWhiteSpace(hoTen))
            return hoTen.Trim();

        var parts = new[] { ho?.Trim(), ten?.Trim() }.Where(p => !string.IsNullOrWhiteSpace(p));
        var combined = string.Join(" ", parts);
        return string.IsNullOrWhiteSpace(combined) ? null : combined;
    }

    public static string? GetCellString(IXLRangeRow row, int? colIndex)
    {
        if (!colIndex.HasValue || colIndex.Value <= 0) return null;
        var cell = row.Cell(colIndex.Value);
        if (cell.DataType == XLDataType.Number)
            return cell.GetDouble().ToString("0");
        var text = cell.GetString();
        return string.IsNullOrWhiteSpace(text) ? null : text.Trim();
    }

    public static bool IsValidEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;
        return Regex.IsMatch(email.Trim(), @"^[^@\s]+@[^@\s]+\.[^@\s]+$");
    }

    public static string? NormalizePhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return null;
        var trimmed = phone.Trim().Replace(" ", "").Replace(".", "").Replace("-", "");
        if (trimmed.Length == 9 && trimmed.All(char.IsDigit))
            return "0" + trimmed;
        return trimmed;
    }

    public static (string? Email, string? Phone) SanitizeEmailAndPhone(string? email, string? phone)
    {
        email = string.IsNullOrWhiteSpace(email) ? null : email.Trim();
        phone = string.IsNullOrWhiteSpace(phone) ? null : phone.Trim();

        // Auto-detect swapped Email and Phone columns
        if ((email == null || !IsValidEmail(email)) && phone != null && IsValidEmail(phone))
        {
            (email, phone) = (phone, email);
        }

        return (email, NormalizePhone(phone));
    }
}

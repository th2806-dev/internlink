namespace InternLink.Infrastructure.Services;

internal static class TenantManagedFilePathResolver
{
    public static string? Resolve(string? path, params string?[] roots)
    {
        if (string.IsNullOrWhiteSpace(path) ||
            Uri.TryCreate(path, UriKind.Absolute, out var uri) &&
            (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
        {
            return null;
        }

        var normalizedPath = path
            .Replace('/', Path.DirectorySeparatorChar)
            .Replace('\\', Path.DirectorySeparatorChar)
            .TrimStart(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        if (normalizedPath.Split(Path.DirectorySeparatorChar).Any(segment => segment == ".."))
            return null;
        if (normalizedPath.StartsWith($"wwwroot{Path.DirectorySeparatorChar}", StringComparison.OrdinalIgnoreCase))
            normalizedPath = normalizedPath.Substring($"wwwroot{Path.DirectorySeparatorChar}".Length);

        foreach (var root in roots
                     .OfType<string>()
                     .Where(value => !string.IsNullOrWhiteSpace(value))
                     .Select(Path.GetFullPath)
                     .Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var fullPath = Path.GetFullPath(Path.Combine(root, normalizedPath));
            if (fullPath.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) &&
                File.Exists(fullPath))
                return fullPath;
        }

        return null;
    }
}

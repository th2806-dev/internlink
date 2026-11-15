using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;

namespace InternLink.API.Helpers;

public static class PublicReferenceCodes
{
    public static string CreateAcceptance(Guid internshipId, int year) =>
        Create("IL-ACC", $"{internshipId:N}:{year}", year);

    public static string CreateVerification(Guid internshipId, int year) =>
        Create("IL-VERIFY", $"IL-VERIFY:{internshipId:N}:{year}", year);

    private static string Create(string prefix, string input, int year)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        var serial = (BinaryPrimitives.ReadUInt32BigEndian(hash) % 100000).ToString("D5");
        return $"{prefix}-{year:D4}-{serial}";
    }
}

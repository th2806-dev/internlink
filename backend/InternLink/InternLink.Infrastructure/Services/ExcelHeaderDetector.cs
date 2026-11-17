namespace InternLink.Infrastructure.Services;

public static class ExcelHeaderDetector
{
    public static int FindHeaderRow(IReadOnlyList<string[]> rows)
    {
        var bestIndex = -1;
        var bestScore = 0;
        for (var index = 0; index < rows.Count; index++)
        {
            var cells = rows[index]
                .Select(value => value.Trim())
                .Where(value => value.Length > 0)
                .ToArray();
            if (cells.Length < 2)
                continue;

            var distinctCount = cells.Distinct(StringComparer.OrdinalIgnoreCase).Count();
            var textCount = cells.Count(value => value.Any(char.IsLetter));
            var score = cells.Length * 100 + distinctCount * 10 + textCount;
            if (score > bestScore)
            {
                bestIndex = index;
                bestScore = score;
            }
        }

        return bestIndex;
    }

    public static string[] MakeUniqueHeaders(IReadOnlyList<string> values)
    {
        var used = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var result = new string[values.Count];
        for (var index = 0; index < values.Count; index++)
        {
            var baseName = string.IsNullOrWhiteSpace(values[index])
                ? $"Column {ToColumnLetter(index + 1)}"
                : values[index].Trim();
            var name = baseName;
            var suffix = 2;
            while (!used.Add(name))
                name = $"{baseName} ({suffix++})";
            result[index] = name;
        }

        return result;
    }

    private static string ToColumnLetter(int column)
    {
        var result = string.Empty;
        while (column > 0)
        {
            column--;
            result = (char)('A' + column % 26) + result;
            column /= 26;
        }

        return result;
    }
}

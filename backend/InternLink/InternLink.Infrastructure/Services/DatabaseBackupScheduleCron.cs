namespace InternLink.Infrastructure.Services;

public static class DatabaseBackupScheduleCron
{
    public static string Normalize(string cronExpression)
    {
        var fields = cronExpression.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        if (fields.Length == 6 && fields[0] == "0")
            fields = fields[1..];

        if (fields.Length != 5
            || !TryParseNumber(fields[0], 0, 59, out var minute)
            || !TryParseNumber(fields[1], 0, 23, out var hour)
            || fields[3] != "*")
        {
            throw new ArgumentException(
                "Lịch sao lưu chỉ hỗ trợ chạy theo ngày, thứ trong tuần hoặc ngày trong tháng; giờ và phút phải hợp lệ.",
                nameof(cronExpression));
        }

        var minuteText = minute.ToString("D2");
        var hourText = hour.ToString("D2");
        if (fields[2] == "*" && fields[4] == "*")
            return $"{minuteText} {hourText} * * *";

        if (fields[2] == "*" && TryParseNumber(fields[4], 0, 7, out var dayOfWeek))
            return $"{minuteText} {hourText} * * {(dayOfWeek == 7 ? 0 : dayOfWeek)}";

        if (fields[4] == "*" && TryParseNumber(fields[2], 1, 28, out var dayOfMonth))
            return $"{minuteText} {hourText} {dayOfMonth} * *";

        throw new ArgumentException(
            "Lịch sao lưu chỉ hỗ trợ chạy theo ngày, thứ trong tuần hoặc ngày trong tháng.",
            nameof(cronExpression));
    }

    private static bool TryParseNumber(string value, int minimum, int maximum, out int result) =>
        int.TryParse(value, out result) && result >= minimum && result <= maximum;
}

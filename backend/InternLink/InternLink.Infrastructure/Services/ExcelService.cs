using System.Data;
using ClosedXML.Excel;
using InternLink.Application.Interfaces;

namespace InternLink.Infrastructure.Services;

public class ExcelService : IExcelService
{
    public byte[] ExportToExcel<T>(
        string sheetName,
        string reportTitle,
        IEnumerable<T> data,
        Dictionary<string, Func<T, object?>> columnMappings)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add(string.IsNullOrWhiteSpace(sheetName) ? "Data" : sheetName);

        var dataList = data.ToList();
        var colCount = columnMappings.Count;
        if (colCount == 0)
        {
            using var emptyStream = new MemoryStream();
            workbook.SaveAs(emptyStream);
            return emptyStream.ToArray();
        }

        int currentRow = 1;

        // 1. Report Title Banner
        ws.Range(currentRow, 1, currentRow, colCount).Merge();
        var titleCell = ws.Cell(currentRow, 1);
        titleCell.Value = reportTitle.ToUpperInvariant();
        titleCell.Style.Font.Bold = true;
        titleCell.Style.Font.FontSize = 14;
        titleCell.Style.Font.FontColor = XLColor.White;
        titleCell.Style.Fill.BackgroundColor = XLColor.FromHtml("#1E3A8A"); // Navy Blue
        titleCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        titleCell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        ws.Row(currentRow).Height = 35;
        currentRow++;

        // 2. Metadata Subtitle
        ws.Range(currentRow, 1, currentRow, colCount).Merge();
        var metaCell = ws.Cell(currentRow, 1);
        metaCell.Value = $"Ngày xuất báo cáo: {DateTime.Now:dd/MM/yyyy HH:mm} | Tổng số bản ghi: {dataList.Count}";
        metaCell.Style.Font.Italic = true;
        metaCell.Style.Font.FontSize = 9.5;
        metaCell.Style.Font.FontColor = XLColor.FromHtml("#475569");
        metaCell.Style.Fill.BackgroundColor = XLColor.FromHtml("#F1F5F9");
        metaCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        metaCell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        ws.Row(currentRow).Height = 20;
        currentRow += 2; // Add a blank line

        // 3. Table Column Headers
        int headerRow = currentRow;
        int colIdx = 1;
        foreach (var colName in columnMappings.Keys)
        {
            var cell = ws.Cell(headerRow, colIdx);
            cell.Value = colName;
            cell.Style.Font.Bold = true;
            cell.Style.Font.FontSize = 10.5;
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#2563EB"); // Royal Blue
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            cell.Style.Border.OutsideBorderColor = XLColor.FromHtml("#1D4ED8");
            colIdx++;
        }
        ws.Row(headerRow).Height = 26;
        currentRow++;

        // 4. Data Rows
        int dataStartRow = currentRow;
        for (int i = 0; i < dataList.Count; i++)
        {
            var item = dataList[i];
            colIdx = 1;
            var isEven = i % 2 == 1;

            foreach (var mapping in columnMappings.Values)
            {
                var cell = ws.Cell(currentRow, colIdx);
                var val = mapping(item);

                if (val == null)
                {
                    cell.Value = "-";
                }
                else if (val is DateTime dt)
                {
                    cell.Value = dt.ToString("dd/MM/yyyy");
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                }
                else if (val is bool b)
                {
                    cell.Value = b ? "Có / Đạt" : "Không";
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                }
                else if (val is int or long or double or decimal or float)
                {
                    cell.Value = Convert.ToDouble(val);
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                }
                else
                {
                    cell.Value = val.ToString();
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
                }

                cell.Style.Font.FontSize = 10;
                cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                cell.Style.Border.OutsideBorderColor = XLColor.FromHtml("#E2E8F0");

                if (isEven)
                {
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#F8FAFC");
                }

                colIdx++;
            }

            ws.Row(currentRow).Height = 22;
            currentRow++;
        }

        // 5. Auto-fit columns with safety margins
        ws.Columns(1, colCount).AdjustToContents();
        for (int c = 1; c <= colCount; c++)
        {
            var width = ws.Column(c).Width;
            if (width < 12) ws.Column(c).Width = 12;
            if (width > 60) ws.Column(c).Width = 60;
        }

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    public byte[] ExportMultiSheetToExcel(
        Dictionary<string, (string Title, IEnumerable<object> Data, Dictionary<string, Func<object, object?>> Mappings)> sheets)
    {
        using var workbook = new XLWorkbook();

        foreach (var (sheetName, (title, data, mappings)) in sheets)
        {
            var ws = workbook.Worksheets.Add(string.IsNullOrWhiteSpace(sheetName) ? "Sheet" : sheetName);
            var dataList = data.ToList();
            var colCount = mappings.Count;
            if (colCount == 0) continue;

            int currentRow = 1;

            // Title
            ws.Range(currentRow, 1, currentRow, colCount).Merge();
            var titleCell = ws.Cell(currentRow, 1);
            titleCell.Value = title.ToUpperInvariant();
            titleCell.Style.Font.Bold = true;
            titleCell.Style.Font.FontSize = 13;
            titleCell.Style.Font.FontColor = XLColor.White;
            titleCell.Style.Fill.BackgroundColor = XLColor.FromHtml("#1E3A8A");
            titleCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            titleCell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            ws.Row(currentRow).Height = 32;
            currentRow++;

            // Subtitle
            ws.Range(currentRow, 1, currentRow, colCount).Merge();
            var metaCell = ws.Cell(currentRow, 1);
            metaCell.Value = $"Ngày xuất: {DateTime.Now:dd/MM/yyyy HH:mm} | Số lượng: {dataList.Count}";
            metaCell.Style.Font.Italic = true;
            metaCell.Style.Font.FontSize = 9;
            metaCell.Style.Fill.BackgroundColor = XLColor.FromHtml("#F1F5F9");
            metaCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            currentRow += 2;

            // Header
            int colIdx = 1;
            foreach (var header in mappings.Keys)
            {
                var cell = ws.Cell(currentRow, colIdx);
                cell.Value = header;
                cell.Style.Font.Bold = true;
                cell.Style.Font.FontColor = XLColor.White;
                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#2563EB");
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                colIdx++;
            }
            ws.Row(currentRow).Height = 24;
            currentRow++;

            // Rows
            for (int i = 0; i < dataList.Count; i++)
            {
                var item = dataList[i];
                colIdx = 1;
                var isEven = i % 2 == 1;

                foreach (var mapping in mappings.Values)
                {
                    var cell = ws.Cell(currentRow, colIdx);
                    var val = mapping(item);
                    if (val == null) cell.Value = "-";
                    else if (val is DateTime dt) cell.Value = dt.ToString("dd/MM/yyyy");
                    else if (val is int or long or double or decimal or float) cell.Value = Convert.ToDouble(val);
                    else cell.Value = val.ToString();

                    cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                    cell.Style.Border.OutsideBorderColor = XLColor.FromHtml("#E2E8F0");
                    if (isEven) cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#F8FAFC");
                    colIdx++;
                }
                ws.Row(currentRow).Height = 20;
                currentRow++;
            }

            ws.Columns(1, colCount).AdjustToContents();
            for (int c = 1; c <= colCount; c++)
            {
                var width = ws.Column(c).Width;
                if (width < 12) ws.Column(c).Width = 12;
                if (width > 60) ws.Column(c).Width = 60;
            }
        }

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    public DataTable ReadExcelToDataTable(Stream excelStream, string? sheetName = null)
    {
        using var workbook = new XLWorkbook(excelStream);
        var ws = string.IsNullOrWhiteSpace(sheetName)
            ? workbook.Worksheets.FirstOrDefault()
            : workbook.Worksheets.FirstOrDefault(w => w.Name.Equals(sheetName, StringComparison.OrdinalIgnoreCase));

        if (ws == null)
            throw new InvalidOperationException(InternLink.Shared.Responses.ErrorMessage.ExcelNoWorksheet);

        var dt = new DataTable();
        bool firstRow = true;

        foreach (var row in ws.RowsUsed())
        {
            if (firstRow)
            {
                foreach (var cell in row.CellsUsed())
                {
                    var colName = cell.Value.ToString().Trim();
                    dt.Columns.Add(string.IsNullOrWhiteSpace(colName) ? $"Column{cell.Address.ColumnNumber}" : colName);
                }
                firstRow = false;
            }
            else
            {
                var dr = dt.NewRow();
                int i = 0;
                foreach (var cell in row.Cells(1, dt.Columns.Count))
                {
                    dr[i++] = cell.Value.ToString().Trim();
                }
                dt.Rows.Add(dr);
            }
        }

        return dt;
    }
}

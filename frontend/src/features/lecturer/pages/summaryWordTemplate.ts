export interface GradeSummaryRow {
  label: string;
  quantity: number;
  rate: number;
}

export interface WordReportPreviewData {
  header: {
    department: string;
    dateLabel: string;
    title: string;
  };
  stats: {
    companyCount: number;
    registeredStudents: number;
    completedStudents: number;
    incompleteStudents: number;
  };
  gradeSummary: GradeSummaryRow[];
}

export function formatWordDate(value?: string | Date | null): string {
  const dateValue = value ?? new Date();

  if (typeof dateValue === "string") {
    const match = dateValue.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (match) {
      const [, day, month, year] = match;
      return `ngày ${day.padStart(2, "0")} tháng ${month.padStart(2, "0")} năm ${year}`;
    }
  }

  const parsedDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return "ngày 01 tháng 01 năm 2026";
  }

  const day = String(parsedDate.getDate()).padStart(2, "0");
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const year = parsedDate.getFullYear();
  return `ngày ${day} tháng ${month} năm ${year}`;
}

export function buildWordReportPreviewData(input: {
  semesterName?: string;
  reportDate?: string | Date | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  companyCount?: number;
  registeredStudents?: number;
  completedStudents?: number;
  incompleteStudents?: number;
  gradeSummary?: GradeSummaryRow[];
}): WordReportPreviewData {
  const departmentName = (input.semesterName ?? "KHOA").trim();
  const GradeSummaryDefault: GradeSummaryRow[] = [
    { label: "Xuất sắc", quantity: 0, rate: 0 },
    { label: "Giỏi", quantity: 0, rate: 0 },
    { label: "Khá", quantity: 0, rate: 0 },
    { label: "Trung bình khá", quantity: 0, rate: 0 },
    { label: "Trung bình", quantity: 0, rate: 0 },
    { label: "Yếu", quantity: 0, rate: 0 },
    { label: "Không thực tập", quantity: 0, rate: 0 },
  ];

  return {
    header: {
      department: `KHOA ${departmentName}`.trim(),
      dateLabel: formatWordDate(input.reportDate ?? new Date()),
      title: "BÁO CÁO TỔNG KẾT CÔNG TÁC THỰC TẬP TỐT NGHIỆP",
    },
    stats: {
      companyCount: input.companyCount ?? 0,
      registeredStudents: input.registeredStudents ?? 0,
      completedStudents: input.completedStudents ?? 0,
      incompleteStudents: input.incompleteStudents ?? 0,
    },
    gradeSummary: (input.gradeSummary?.length ? input.gradeSummary : GradeSummaryDefault).map((item) => ({
      ...item,
      label: item.label,
      quantity: Number(item.quantity) || 0,
      rate: Number(item.rate) || 0,
    })),
  };
}

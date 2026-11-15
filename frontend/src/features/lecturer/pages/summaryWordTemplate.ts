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
    totalStudents: number;
    notInterningStudents: number;
  };
  gradeSummary: GradeSummaryRow[];
}

export interface AdminWordGradeEntry {
  companyName?: string | null;
  isEligible: boolean;
  oralExamScore: number | null;
  classification?: string | null;
}

export function buildAdminWordGradeSummary(
  grades: AdminWordGradeEntry[],
  notInterningStudentCount = 0,
): { gradeSummary: GradeSummaryRow[]; totalStudents: number; notInterningStudents: number } {
  const labels = [
    "Xuất sắc",
    "Giỏi",
    "Khá",
    "Trung bình khá",
    "Trung bình",
    "Yếu",
    "Không hoàn thành",
    "Chưa xếp loại",
    "Không thực tập",
  ];
  const counts = new Map(labels.map((label) => [label, 0]));

  grades.forEach((grade) => {
    let label: string;
    if (!grade.companyName?.trim()) {
      label = "Không thực tập";
    } else if (!grade.isEligible) {
      label = "Không hoàn thành";
    } else if (grade.oralExamScore == null) {
      label = "Chưa xếp loại";
    } else {
      const classification = grade.classification?.trim();
      label = classification === "Không đạt" ? "Yếu" : classification || "Chưa xếp loại";
      if (!counts.has(label)) label = "Chưa xếp loại";
    }
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  const cohortCount = Math.max(0, Math.trunc(notInterningStudentCount));
  counts.set("Không thực tập", (counts.get("Không thực tập") ?? 0) + cohortCount);
  const totalStudents = grades.length + cohortCount;
  const gradeSummary = [...counts].map(([label, quantity]) => ({
    label,
    quantity,
    rate: totalStudents > 0 ? Number(((quantity / totalStudents) * 100).toFixed(1)) : 0,
  }));

  return {
    gradeSummary,
    totalStudents,
    notInterningStudents: counts.get("Không thực tập") ?? 0,
  };
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
    const now = new Date();
    return `ngày ${String(now.getDate()).padStart(2, "0")} tháng ${String(now.getMonth() + 1).padStart(2, "0")} năm ${now.getFullYear()}`;
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
  totalStudents?: number;
  notInterningStudents?: number;
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
    { label: "Không hoàn thành", quantity: 0, rate: 0 },
    { label: "Chưa xếp loại", quantity: 0, rate: 0 },
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
      totalStudents: input.totalStudents ?? input.registeredStudents ?? 0,
      notInterningStudents: input.notInterningStudents ?? 0,
    },
    gradeSummary: (input.gradeSummary ?? GradeSummaryDefault).map((item) => ({
      ...item,
      label: item.label,
      quantity: Number(item.quantity) || 0,
      rate: Number(item.rate) || 0,
    })),
  };
}

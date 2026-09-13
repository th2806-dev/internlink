import { downloadAuthenticatedFile } from "../lib/apiClient";

export const exportService = {
  /** Downloads the multi-sheet internship list Excel report for the selected semester. */
  downloadInternshipExcel(semesterId?: string, department?: string, lecturerId?: string) {
    const params = new URLSearchParams();
    if (semesterId) params.append("semesterId", semesterId);
    if (department) params.append("department", department);
    if (lecturerId) params.append("lecturerId", lecturerId);
    const query = params.toString() ? `?${params.toString()}` : "";
    return downloadAuthenticatedFile(
      `/api/Export/internship-excel${query}`,
      `DanhSachThucTap_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  },

  /** Downloads the academic internship summary report as Excel (.xlsx). */
  downloadSummaryReport(semesterId?: string, department?: string) {
    const params = new URLSearchParams();
    if (semesterId) params.append("semesterId", semesterId);
    if (department) params.append("department", department);
    const query = params.toString() ? `?${params.toString()}` : "";
    return downloadAuthenticatedFile(
      `/api/Export/summary-report${query}`,
      `BaoCaoTongKetThucTap_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  },

  /** Downloads the academic internship summary report as Word (.docx). */
  downloadSummaryReportWord(semesterId?: string, department?: string) {
    const params = new URLSearchParams();
    if (semesterId) params.append("semesterId", semesterId);
    if (department) params.append("department", department);
    const query = params.toString() ? `?${params.toString()}` : "";
    return downloadAuthenticatedFile(
      `/api/Export/summary-report/word${query}`,
      `BaoCaoTongKetThucTap_${new Date().toISOString().slice(0, 10)}.docx`,
    );
  },

  /** Downloads the official institutional Guidance Schedule Excel (C23 format). */
  downloadGuidanceSchedule(semesterId: string, lecturerId?: string) {
    const params = new URLSearchParams();
    params.append("semesterId", semesterId);
    if (lecturerId) params.append("lecturerId", lecturerId);
    return downloadAuthenticatedFile(
      `/api/Export/guidance-schedule?${params.toString()}`,
      `LichHuongDanTTTN_C23_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  },
};

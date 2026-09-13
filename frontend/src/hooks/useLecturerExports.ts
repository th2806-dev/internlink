import { useState, useCallback } from 'react';
import { lecturerExportService } from '../services/lecturerExport.service';
import { getApiErrorMessage } from '../lib/apiClient';

export interface UseLecturerExportsState {
  isExporting: boolean;
  exportEndOfTerm: () => Promise<{ success: boolean; filename?: string; error?: string }>;
  exportGuidanceSchedule: (semesterId: string) => Promise<{ success: boolean; filename?: string; error?: string }>;
}

export const useLecturerExports = (
  onShowToast?: (msg: string) => void
): UseLecturerExportsState => {
  const [isExporting, setIsExporting] = useState(false);

  const exportEndOfTerm = useCallback(async () => {
    setIsExporting(true);
    try {
      const { blob, filename } = await lecturerExportService.downloadEndOfTerm();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onShowToast?.(`Đã tải xuống ${filename}`);
      return { success: true, filename };
    } catch (err) {
      const errorMsg = getApiErrorMessage(err);
      onShowToast?.(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsExporting(false);
    }
  }, [onShowToast]);

  const exportGuidanceSchedule = useCallback(async (semesterId: string) => {
    if (!semesterId || semesterId === 'all') {
      const errorMsg = 'Vui lòng chọn học kỳ để xuất lịch hướng dẫn.';
      onShowToast?.(errorMsg);
      return { success: false, error: errorMsg };
    }

    setIsExporting(true);
    try {
      const { blob, filename } = await lecturerExportService.downloadGuidanceSchedule(semesterId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onShowToast?.(`Đã tải xuống ${filename}`);
      return { success: true, filename };
    } catch (err) {
      const errorMsg = getApiErrorMessage(err);
      onShowToast?.(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsExporting(false);
    }
  }, [onShowToast]);

  return { isExporting, exportEndOfTerm, exportGuidanceSchedule };
};

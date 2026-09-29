import { useEffect, useRef } from "react";
import { toApiSemesterId, useSemester } from "../contexts/SemesterContext";

/**
 * Đảm bảo cổng admin đang chọn MỘT học kỳ CỤ THỂ cho các trang không chạy được
 * ở chế độ "Tất cả các kỳ" (nội dung lưu/xuất theo kỳ: tổng kết, xuất Word/Excel…).
 *
 * Bối cảnh lỗi đã gặp: SemesterContext mặc định `selectedSemesterId = "all"` ở cổng admin
 * → `toApiSemesterId()` trả undefined → các loader guard `if (!semesterId) return`
 * → trang trống dữ liệu, nút xuất bị disabled im lặng (bug /admin/summary).
 *
 * Hành vi: khi selector đang ở "Tất cả các kỳ" VÀ chưa từng tự chọn trong phiên
 * mount này → tự chọn kỳ phù hợp nhất (kỳ active → kỳ có SV → kỳ đầu tiên).
 * Người dùng vẫn đổi tay tự do sau đó; remount trang (đổi tab rồi quay lại)
 * sẽ KHÔNG ghi đè lựa chọn của người dùng nhờ cờ ref reset khi semesterId có giá trị.
 *
 * Trả về semesterId an toàn cho API + cờ báo trạng thái để trang hiện cảnh báo
 * nếu danh sách kỳ chưa tải xong (vẫn chưa chọn được kỳ nào).
 */
export function useEnsureSpecificSemester() {
  const { semesters, selectedSemesterId, selectSemester } = useSemester();
  const semesterId = toApiSemesterId(selectedSemesterId);
  const didAutoSelect = useRef(false);

  useEffect(() => {
    // Đã có kỳ cụ thể (người dùng chọn hoặc đã tự chọn) → khóa cờ, không đụng nữa.
    if (semesterId) {
      didAutoSelect.current = true;
      return;
    }
    // Chưa chọn được gì nhưng cũng chưa có danh sách kỳ → chờ danh sách tải xong.
    if (semesters.length === 0) return;
    // Chỉ tự chọn MỘT lần mỗi lần mount trang.
    if (didAutoSelect.current) return;
    didAutoSelect.current = true;

    const active = semesters.find((s) => s.status === "active");
    const withStudents = semesters.find((s) => s.studentsCount > 0);
    const best = active ?? withStudents ?? semesters[0];
    if (best) selectSemester(best.id);
  }, [semesterId, semesters, selectSemester]);

  return {
    /** Id học kỳ cụ thể (undefined nếu đang "Tất cả các kỳ" — hiếm, chỉ khi kỳ chưa tải). */
    semesterId,
    /** true khi vẫn chưa có kỳ cụ thể (dùng để hiện cảnh báo cho người dùng). */
    needsSemesterChoice: !semesterId,
    /** true khi danh sách kỳ đã tải xong nhưng không có kỳ nào để chọn. */
    hasNoSemesters: semesters.length === 0,
  };
}

import { Award } from "lucide-react";
import { useStudentPortal } from "../../../contexts/StudentPortalContext";
import { Panel } from "../../../components/common/Panel";

export const EvaluationView = ({
  onShowToast,
}: {
  onShowToast: (msg: string) => void;
}) => {
  const { profile } = useStudentPortal();

  return (
    <div className="mx-auto max-w-[900px] space-y-4 animate-in fade-in duration-200">
      <Panel className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-600 p-3 text-white"><Award className="h-6 w-6" /></div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Kết quả đánh giá thực tập</h1>
          <p className="text-xs text-slate-500">Kết quả được tổng hợp theo quy định chấm điểm hiện hành.</p>
        </div>
      </Panel>
      <Panel className="text-center">
        <p className="text-xs text-slate-500">Điểm hiện tại</p>
        <p className="mt-2 text-4xl font-black text-slate-900">{profile.currentGrade || "—"}</p>
        <p className="mt-2 text-xs text-slate-500">{profile.currentGrade ? "Điểm sẽ được cập nhật sau khi giảng viên hoàn tất đánh giá." : "Chưa có kết quả đánh giá."}</p>
      </Panel>
    </div>
  );
};

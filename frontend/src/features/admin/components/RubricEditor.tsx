import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  FileText,
  Sliders,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Check,
  X,
  Lock,
} from "lucide-react";
import { Toast } from "../../../components/common/Toast";
import { Panel } from "../../../components/common/Panel";
import { rubricService } from "../../../services/rubric.service";
import type {
  EvaluationRubricDto,
  EvaluationRubricCriterionDto,
  EvaluationRubricStatus,
} from "../../../types/evaluation";

interface CriterionDraft {
  id: string;
  name: string;
  description: string;
  weight: number;
  maxScore: number;
  orderIndex: number;
}

const DEFAULT_CRITERIA: CriterionDraft[] = [
  {
    id: crypto.randomUUID(),
    name: "Chuyên môn",
    description: "Năng lực kỹ thuật, kiến thức chuyên ngành, khả năng giải quyết vấn đề",
    weight: 40,
    maxScore: 10,
    orderIndex: 1,
  },
  {
    id: crypto.randomUUID(),
    name: "Thái độ làm việc",
    description: "Kỷ luật, tác phong, sự chủ động, tinh thần trách nhiệm",
    weight: 20,
    maxScore: 10,
    orderIndex: 2,
  },
  {
    id: crypto.randomUUID(),
    name: "Kỹ năng mềm",
    description: "Giao tiếp, làm việc nhóm, phản biện, thuyết trình",
    weight: 20,
    maxScore: 10,
    orderIndex: 3,
  },
  {
    id: crypto.randomUUID(),
    name: "Báo cáo cuối kỳ",
    description: "Chất lượng báo cáo, sản phẩm, source code, demo",
    weight: 20,
    maxScore: 10,
    orderIndex: 4,
  },
];

interface RubricEditorProps {
  semesterId: string;
  semesterName: string;
  onShowToast: (msg: string) => void;
  readOnly?: boolean;
}

export const RubricEditor = ({
  semesterId,
  semesterName,
  onShowToast,
  readOnly = false,
}: RubricEditorProps) => {
  const [rubric, setRubric] = useState<EvaluationRubricDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [rubricName, setRubricName] = useState(
    `Rubric - ${semesterName}`,
  );
  const [applicationMode, setApplicationMode] = useState<"Required" | "LecturerCustom">("Required");
  const [criteria, setCriteria] = useState<CriterionDraft[]>(DEFAULT_CRITERIA);
  const [isExpanded, setIsExpanded] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const saveInFlightRef = useRef(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load existing rubric
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const existing = await rubricService.getBySemester(semesterId);
        if (existing) {
          setRubric(existing);
          setRubricName(existing.name);
          setApplicationMode(existing.applicationMode as "Required" | "LecturerCustom");
          setCriteria(
            existing.criteria.map((c) => ({
              id: c.id,
              name: c.name,
              description: c.description ?? "",
              weight: c.weight,
              maxScore: c.maxScore,
              orderIndex: c.orderIndex,
            })),
          );
        }
      } catch {
        // No rubric yet — use defaults
      } finally {
        setIsLoading(false);
      }
    })();
  }, [semesterId]);

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const isValidTotal = Math.abs(totalWeight - 100) < 0.01;
  const isEditable = !readOnly && (!rubric || rubric.status !== "Locked");

  const addCriterion = () => {
    const newOrder = criteria.length + 1;
    setCriteria([
      ...criteria,
      {
        id: crypto.randomUUID(),
        name: "",
        description: "",
        weight: 0,
        maxScore: 10,
        orderIndex: newOrder,
      },
    ]);
  };

  const removeCriterion = (id: string) => {
    if (criteria.length <= 2) {
      showToast("Cần ít nhất 2 tiêu chí.");
      return;
    }
    setCriteria(criteria.filter((c) => c.id !== id));
  };

  const updateCriterion = (
    id: string,
    field: keyof CriterionDraft,
    value: string | number,
  ) => {
    setCriteria(
      criteria.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  };

  const moveCriterion = (id: string, direction: "up" | "down") => {
    const idx = criteria.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const newCriteria = [...criteria];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newCriteria.length) return;
    [newCriteria[idx], newCriteria[swapIdx]] = [newCriteria[swapIdx], newCriteria[idx]];
    // Reassign orderIndex
    newCriteria.forEach((c, i) => (c.orderIndex = i + 1));
    setCriteria(newCriteria);
  };

  const loadTemplate = () => {
    setCriteria([...DEFAULT_CRITERIA]);
    setRubricName(`Rubric chuẩn Khoa CNTT - ${semesterName}`);
    showToast("Đã tải mẫu rubric mặc định Khoa CNTT.");
  };

  const handleSave = async () => {
    if (saveInFlightRef.current) return;

    if (!isValidTotal) {
      showToast(`Tổng trọng số phải bằng 100%. Hiện tại: ${totalWeight}%`);
      return;
    }
    if (criteria.some((c) => !c.name.trim())) {
      showToast("Mọi tiêu chí đều phải có tên.");
      return;
    }

    saveInFlightRef.current = true;
    setIsSaving(true);
    try {
      const payload = {
        name: rubricName,
        applicationMode,
        criteria: criteria.map((c, idx) => ({
          name: c.name.trim(),
          description: c.description.trim() || undefined,
          weight: c.weight,
          maxScore: c.maxScore,
          orderIndex: idx + 1,
        })),
      };

      let result: EvaluationRubricDto;
      if (rubric) {
        result = await rubricService.update(semesterId, payload);
      } else {
        result = await rubricService.create(semesterId, payload);
      }
      setRubric(result);
      showToast("Đã lưu rubric thành công!");
    } catch (err: any) {
      showToast(err?.message || "Lỗi khi lưu rubric.");
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: EvaluationRubricStatus) => {
    const badges: Record<string, { label: string; color: string }> = {
      Draft: { label: "Nháp", color: "bg-slate-100 text-slate-700 border-slate-200" },
      PendingApproval: { label: "Chờ phê duyệt", color: "bg-amber-50 text-amber-700 border-amber-200" },
      Approved: { label: "Đã phê duyệt", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      Rejected: { label: "Bị từ chối", color: "bg-rose-50 text-rose-700 border-rose-200" },
      Locked: { label: "Đã khóa", color: "bg-blue-50 text-blue-700 border-blue-200" },
    };
    const badge = badges[status] || badges.Draft;
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <Panel className="p-8 text-center">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-500 mx-auto" />
        <p className="text-xs text-slate-500 mt-2">Đang tải rubric...</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header */}
      <Panel className="space-y-4">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Tiêu chí chấm điểm
                {rubric && getStatusBadge(rubric.status)}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {rubric
                  ? `${rubric.criteria.length} tiêu chí · Tổng: ${totalWeight}%`
                  : "Chưa có rubric — tạo mới hoặc tải mẫu"}
              </p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>

        {isExpanded && (
          <div className="space-y-4 border-t border-slate-100 pt-4">
            {/* Rubric Name & Mode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Tên rubric
                </label>
                <input
                  type="text"
                  value={rubricName}
                  onChange={(e) => setRubricName(e.target.value)}
                  disabled={!isEditable}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Chế độ áp dụng
                </label>
                <select
                  value={applicationMode}
                  onChange={(e) =>
                    setApplicationMode(
                      e.target.value as "Required" | "LecturerCustom",
                    )
                  }
                  disabled={!isEditable}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="Required">Bắt buộc — GV phải dùng đúng rubric này</option>
                  <option value="LecturerCustom">Mẫu tham khảo — GV có thể chỉnh sửa</option>
                </select>
              </div>
            </div>

            {/* Rejection reason display */}
            {rubric?.status === "Rejected" && rubric.rejectionReason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">
                <span className="font-bold">Lý do từ chối:</span>{" "}
                {rubric.rejectionReason}
              </div>
            )}

            {/* Criteria List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Danh sách tiêu chí ({criteria.length})
                </label>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      isValidTotal
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    Tổng: {totalWeight}%
                    {isValidTotal ? " ✓" : ` ≠ 100%`}
                  </span>
                </div>
              </div>

              {criteria.map((criterion, idx) => (
                <div
                  key={criterion.id}
                  className="p-3 bg-white border border-slate-200 rounded-md space-y-2 group"
                >
                  <div className="flex items-start gap-2">
                    {isEditable && (
                      <div className="flex flex-col gap-0.5 pt-1">
                        <button
                          onClick={() => moveCriterion(criterion.id, "up")}
                          disabled={idx === 0}
                          className="text-slate-300 hover:text-slate-600 disabled:opacity-30"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => moveCriterion(criterion.id, "down")}
                          disabled={idx === criteria.length - 1}
                          className="text-slate-300 hover:text-slate-600 disabled:opacity-30"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2">
                      <div className="md:col-span-4">
                        <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">
                          Tên tiêu chí
                        </label>
                        <input
                          type="text"
                          value={criterion.name}
                          onChange={(e) =>
                            updateCriterion(criterion.id, "name", e.target.value)
                          }
                          disabled={!isEditable}
                          placeholder="VD: Chuyên môn"
                          className="w-full p-1.5 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-500 disabled:opacity-60"
                        />
                      </div>
                      <div className="md:col-span-4">
                        <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">
                          Mô tả
                        </label>
                        <input
                          type="text"
                          value={criterion.description}
                          onChange={(e) =>
                            updateCriterion(criterion.id, "description", e.target.value)
                          }
                          disabled={!isEditable}
                          placeholder="Mô tả ngắn..."
                          className="w-full p-1.5 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-500 disabled:opacity-60"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">
                          Trọng số (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={5}
                          value={criterion.weight}
                          onChange={(e) =>
                            updateCriterion(
                              criterion.id,
                              "weight",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          disabled={!isEditable}
                          className="w-full p-1.5 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-500 disabled:opacity-60 font-mono text-center"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">
                          Max điểm
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={criterion.maxScore}
                          onChange={(e) =>
                            updateCriterion(
                              criterion.id,
                              "maxScore",
                              parseInt(e.target.value) || 10,
                            )
                          }
                          disabled={!isEditable}
                          className="w-full p-1.5 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-500 disabled:opacity-60 font-mono text-center"
                        />
                      </div>
                    </div>

                    {isEditable && (
                      <button
                        onClick={() => removeCriterion(criterion.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                        title="Xóa tiêu chí"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            {isEditable && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={addCriterion}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md border border-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm tiêu chí
                </button>

                <button
                  onClick={loadTemplate}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-md border border-indigo-200 flex items-center gap-1.5 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Tải mẫu CNTT
                </button>

                <div className="flex-1" />

                <button
                  onClick={handleSave}
                  disabled={isSaving || !isValidTotal}
                  className="px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? "Đang lưu..." : "Lưu"}
                </button>

              </div>
            )}

            {/* Applied/locked status */}
            {(rubric?.status === "Approved" || rubric?.status === "Locked") && (
              <div className="flex items-center gap-2 pt-3 border-t border-emerald-100 bg-emerald-50/50 -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs text-emerald-800 font-medium">
                  {rubric.status === "Locked" ? "Rubric đã khóa" : "Rubric đang được áp dụng ngay"}
                  {rubric.approvedAt
                    ? ` · Duyệt lúc ${new Date(rubric.approvedAt).toLocaleString("vi-VN")}`
                    : ""}
                  {rubric.approvedByName
                    ? ` bởi ${rubric.approvedByName}`
                    : ""}
                </span>
              </div>
            )}
          </div>
        )}
      </Panel>

    </div>
  );
};

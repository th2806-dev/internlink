import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clipboard, Download, FileBadge2, Loader2, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { studentPortalService } from "../../../services/studentPortal.service";
import { useStudentPortal } from "../../../contexts/StudentPortalContext";

function stripVietnameseDiacritics(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}

export function IntroductionLetterCard() {
  const { internship } = useStudentPortal();
  const [qrCode, setQrCode] = useState("");
  const [feedback, setFeedback] = useState("");
  const [operationError, setOperationError] = useState("");
  const letterQuery = useQuery({
    queryKey: ["student-introduction-letter", internship?.id],
    queryFn: studentPortalService.getIntroductionLetter,
    enabled: false,
    retry: false,
  });
  const letter = letterQuery.data;
  const acceptanceUrl = letter
    ? `${window.location.origin}/accept/${encodeURIComponent(letter.token)}`
    : "";
  const canIssueLetter = Boolean(internship?.id && internship.companyId);

  useEffect(() => {
    let active = true;
    if (!acceptanceUrl) {
      setQrCode("");
      return () => {
        active = false;
      };
    }

    void QRCode.toDataURL(acceptanceUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 220,
    }).then((dataUrl) => {
      if (active) {
        setQrCode(dataUrl);
        setOperationError("");
      }
    }).catch((error: unknown) => {
      if (active) {
        setOperationError(error instanceof Error ? error.message : "Không thể tạo mã QR.");
      }
    });

    return () => {
      active = false;
    };
  }, [acceptanceUrl]);

  const handleGenerate = async () => {
    setFeedback("");
    setOperationError("");
    const result = await letterQuery.refetch();
    if (result.error) {
      setOperationError(getApiErrorMessage(result.error));
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(acceptanceUrl);
      setFeedback("Đã sao chép liên kết tiếp nhận.");
      setOperationError("");
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Không thể sao chép liên kết trên trình duyệt này.");
    }
  };

  const handleDownloadPdf = async () => {
    if (!letter || !qrCode) return;
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ format: "a4", unit: "mm" });
      const lines = [
        "GIAY GIOI THIEU THUC TAP",
        `Ma ho so: ${letter.referenceCode}`,
        `Ho va ten sinh vien: ${letter.studentName}`,
        `MSSV: ${letter.studentCode}`,
        `Lop: ${letter.className || "Chua cap nhat"}`,
        `Nganh: ${letter.major || "Chua cap nhat"}`,
        `Khoa: ${letter.departmentName || "Chua cap nhat"}`,
        `Don vi tiep nhan: ${letter.companyName || "Chua cap nhat"}`,
        `Vi tri thuc tap: ${letter.position || "Chua cap nhat"}`,
        `Giang vien huong dan: ${letter.lecturerName || "Chua phan cong"}`,
        `Hoc ky: ${letter.semesterName || "Chua cap nhat"}`,
        `Thoi gian: ${letter.internshipStartDate ? new Date(letter.internshipStartDate).toLocaleDateString("vi-VN") : "--"} - ${letter.internshipEndDate ? new Date(letter.internshipEndDate).toLocaleDateString("vi-VN") : "--"}`,
      ];

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text(stripVietnameseDiacritics(lines[0]), 105, 30, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.text(stripVietnameseDiacritics("Cong hoa Xa hoi Chu nghia Viet Nam - Doc lap, Tu do, Hanh phuc"), 105, 40, { align: "center" });
      pdf.line(30, 45, 180, 45);
      pdf.setFontSize(11);
      pdf.text(pdf.splitTextToSize(stripVietnameseDiacritics(lines.slice(1).join("\n\n")), 118), 25, 62);
      pdf.addImage(qrCode, "PNG", 145, 105, 42, 42);
      pdf.setFontSize(9);
      pdf.text(stripVietnameseDiacritics("Quet ma QR de mo cong tiep nhan doanh nghiep."), 145, 152, { maxWidth: 48, align: "center" });
      pdf.text(stripVietnameseDiacritics(`Lien ket co hieu luc den ${new Date(letter.expiresAt).toLocaleDateString("vi-VN")}.`), 25, 245);
      pdf.text(stripVietnameseDiacritics("Sinh vien"), 48, 270, { align: "center" });
      pdf.text(stripVietnameseDiacritics(letter.studentName), 48, 285, { align: "center" });
      pdf.save(`Giay-gioi-thieu-${letter.referenceCode}.pdf`);
      setFeedback("Đã tải giấy giới thiệu PDF.");
      setOperationError("");
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Không thể tạo tệp PDF. Vui lòng thử lại.");
    }
  };

  return (
    <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-5" aria-labelledby="introduction-letter-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#026aa7]/10 text-[#026aa7]" aria-hidden="true">
            <FileBadge2 className="h-5 w-5" />
          </span>
          <div>
            <h2 id="introduction-letter-heading" className="text-sm font-bold text-slate-900">Giấy giới thiệu thực tập điện tử</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Tạo mã hồ sơ và liên kết QR bảo mật để doanh nghiệp tiếp nhận thông tin thực tập.
            </p>
          </div>
        </div>
        {!letter && (
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={!canIssueLetter || letterQuery.isFetching}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#026aa7] px-4 text-sm font-bold text-white transition-colors hover:bg-[#025a8f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {letterQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <QrCode className="h-4 w-4" aria-hidden="true" />}
            {letterQuery.isFetching ? "Đang tạo..." : "Tạo giấy giới thiệu"}
          </button>
        )}
      </div>

      {!canIssueLetter && (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          Giấy giới thiệu sẽ khả dụng sau khi bạn được phân công doanh nghiệp tiếp nhận.
        </p>
      )}

      {letter && (
        <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="space-y-2 text-xs text-slate-700">
            <p><span className="font-semibold">Mã hồ sơ:</span> <span className="font-mono font-bold text-[#026aa7]">{letter.referenceCode}</span></p>
            <p><span className="font-semibold">Doanh nghiệp:</span> {letter.companyName || "Chưa cập nhật"}</p>
            <p><span className="font-semibold">Liên kết tiếp nhận:</span></p>
            <p className="break-all rounded-lg bg-slate-50 p-2 font-mono text-[11px] text-slate-700">{acceptanceUrl}</p>
            <p className="text-slate-500">
              Liên kết có hiệu lực đến {new Date(letter.expiresAt).toLocaleString("vi-VN")}.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Clipboard className="h-4 w-4" aria-hidden="true" />
                Sao chép liên kết
              </button>
              <button
                type="button"
                onClick={() => void handleDownloadPdf()}
                disabled={!qrCode}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#026aa7] px-3 text-xs font-semibold text-[#026aa7] hover:bg-[#026aa7]/5 disabled:opacity-50"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Tải PDF
              </button>
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={letterQuery.isFetching}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Tạo liên kết mới
              </button>
            </div>
          </div>
          <div className="flex min-h-48 items-center justify-center rounded-xl border border-slate-200 bg-white p-3">
            {qrCode ? (
              <img src={qrCode} alt={`Mã QR liên kết tiếp nhận hồ sơ ${letter.referenceCode}`} width="180" height="180" />
            ) : (
              <span role="status" className="text-xs text-slate-500">Đang tạo mã QR...</span>
            )}
          </div>
        </div>
      )}

      {(feedback || operationError || (letterQuery.isError && !operationError)) && (
        <p role={operationError || letterQuery.isError ? "alert" : "status"} className={`mt-3 text-xs ${operationError || letterQuery.isError ? "text-rose-700" : "text-emerald-800"}`}>
          {operationError || (letterQuery.isError ? getApiErrorMessage(letterQuery.error) : feedback)}
        </p>
      )}
    </section>
  );
}

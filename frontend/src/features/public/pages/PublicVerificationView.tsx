import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BadgeCheck, LoaderCircle, ShieldCheck } from "lucide-react";
import { apiRequestRaw } from "../../../lib/apiClient";

type PublicVerification = {
  referenceCode: string;
  verificationType: string;
  isAuthentic: boolean;
  institutionName: string;
  verifiedAt: string;
  studentName: string;
  studentCode: string;
  className: string | null;
  major: string | null;
  departmentName: string | null;
  semesterName: string | null;
  companyName: string | null;
  internshipStatus: string;
  resultSummary: string | null;
  followUpVerificationCode: string | null;
};

export default function PublicVerificationView() {
  const { code = "" } = useParams();
  const [verification, setVerification] = useState<PublicVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setVerification(null);
    void apiRequestRaw<PublicVerification>(
      `/api/v1/public/verifications/${encodeURIComponent(code)}`,
      { auth: false, skipCache: true },
    )
      .then((result) => {
        if (active) setVerification(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Không tìm thấy hồ sơ hợp lệ.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [code]);

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 text-slate-700" role="status">
        <LoaderCircle aria-hidden="true" className="mr-3 h-5 w-5 animate-spin text-[#026aa7]" />
        Đang tra cứu hồ sơ...
      </main>
    );
  }

  if (!verification || error) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-8">
        <section className="max-w-lg rounded-2xl border border-slate-200/90 bg-white p-6 text-center shadow-sm">
          <ShieldCheck aria-hidden="true" className="mx-auto h-10 w-10 text-slate-500" />
          <h1 className="mt-3 text-xl font-bold text-slate-900">Không tìm thấy hồ sơ xác thực</h1>
          <p role="alert" className="mt-3 text-sm leading-6 text-rose-800">
            {error ?? "Mã tra cứu không đúng hoặc hồ sơ chưa đủ điều kiện công khai."}
          </p>
          <p className="mt-3 text-sm text-slate-600">Kiểm tra lại mã IL-ACC hoặc IL-VERIFY trên giấy tờ.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-8 sm:py-14">
      <section className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <header className="bg-[#026aa7] px-5 py-5 text-white sm:px-7">
          <p className="text-sm font-semibold tracking-wide text-white/85">Cổng tra cứu công khai · InternLink</p>
          <h1 className="mt-2 text-2xl font-bold">Xác thực hồ sơ thực tập</h1>
        </header>
        <div className="space-y-5 p-5 sm:p-7">
          <div className="flex justify-center">
            <div
              role="img"
              aria-label={`Dấu xác thực số ${verification.institutionName}`}
              className="flex h-36 w-36 rotate-[-8deg] flex-col items-center justify-center rounded-full border-[3px] border-[#026aa7] text-center text-[#026aa7]"
            >
              <BadgeCheck aria-hidden="true" className="h-8 w-8" />
              <span className="mt-1 text-xs font-bold uppercase tracking-wider">Đã xác thực</span>
              <span className="mt-0.5 max-w-24 text-[10px] leading-4">{verification.institutionName}</span>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center text-sm font-semibold text-emerald-900">
            Hồ sơ hợp lệ · {verification.verificationType}
          </div>
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-slate-500">Mã tra cứu</dt><dd className="mt-0.5 break-all font-mono font-semibold text-slate-900">{verification.referenceCode}</dd></div>
            <div><dt className="text-xs text-slate-500">Trạng thái thực tập</dt><dd className="mt-0.5 font-semibold text-slate-900">{verification.internshipStatus}</dd></div>
            <div><dt className="text-xs text-slate-500">Sinh viên</dt><dd className="mt-0.5 font-semibold text-slate-900">{verification.studentName}</dd></div>
            <div><dt className="text-xs text-slate-500">Mã sinh viên</dt><dd className="mt-0.5 font-semibold text-slate-900">{verification.studentCode}</dd></div>
            <div><dt className="text-xs text-slate-500">Lớp · Ngành</dt><dd className="mt-0.5 text-slate-800">{verification.className || "—"} · {verification.major || "—"}</dd></div>
            <div><dt className="text-xs text-slate-500">Khoa · Học kỳ</dt><dd className="mt-0.5 text-slate-800">{verification.departmentName || "—"} · {verification.semesterName || "—"}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Doanh nghiệp thực tập</dt><dd className="mt-0.5 font-semibold text-slate-900">{verification.companyName || "—"}</dd></div>
            {verification.resultSummary && (
              <div className="sm:col-span-2 rounded-lg bg-slate-50 p-3">
                <dt className="text-xs text-slate-500">Kết quả đánh giá chung</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{verification.resultSummary}</dd>
              </div>
            )}
          </dl>
          {verification.followUpVerificationCode && (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              Mã xác thực hoàn thành:
              {" "}
              <Link
                className="font-mono font-semibold text-[#026aa7] underline underline-offset-2"
                to={`/verify/${encodeURIComponent(verification.followUpVerificationCode)}`}
              >
                {verification.followUpVerificationCode}
              </Link>
            </p>
          )}
          <p className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
            Chỉ dữ liệu phục vụ xác minh được công khai. Email, số điện thoại và thông tin định danh cá nhân không được hiển thị.
          </p>
          <p className="text-xs text-slate-500">
            Tra cứu lúc {new Date(verification.verifiedAt).toLocaleString("vi-VN")}
          </p>
        </div>
      </section>
    </main>
  );
}

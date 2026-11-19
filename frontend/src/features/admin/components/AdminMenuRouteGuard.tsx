import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSystemMenu } from "../../../hooks/useSystemMenu";
import { findSystemMenuRoute, getSystemMenuRoutes } from "../../../lib/systemMenu";

export function AdminMenuRouteGuard({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const menuQuery = useSystemMenu();

  if (pathname === "/admin/account") return children;
  if (menuQuery.isPending) {
    return (
      <p role="status" className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
        Đang xác thực quyền truy cập phân hệ...
      </p>
    );
  }
  if (menuQuery.isError) {
    return (
      <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
        Không thể xác thực quyền truy cập. Vui lòng tải lại trang hoặc đăng nhập lại.
      </p>
    );
  }

  const menu = menuQuery.data ?? [];
  if (findSystemMenuRoute(menu, pathname)) return children;

  const fallback = getSystemMenuRoutes(menu).find((route) => route.item.funcUrl);
  return (
    <section
      role="alert"
      className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950"
    >
      <h1 className="font-bold">Bạn không có quyền truy cập phân hệ này</h1>
      <p className="mt-1 text-amber-900">
        Menu và quyền truy cập được quản lý bởi vai trò hiện tại.
      </p>
      {fallback?.item.funcUrl && (
        <Link
          to={fallback.item.funcUrl}
          className="mt-4 inline-flex min-h-10 items-center rounded-md bg-[#026aa7] px-3 font-semibold text-white transition-colors hover:bg-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/40"
        >
          Mở {fallback.item.name}
        </Link>
      )}
    </section>
  );
}

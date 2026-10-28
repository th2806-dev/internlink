import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, type UserRole } from "../hooks/useAuth";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isLoggedIn, isBootstrapping, role, user, mustChangePassword } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-700">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600">Đang xác thực phiên làm việc…</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (mustChangePassword && !(role === "student" && user?.isArchiveReadOnly)) {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
    if (role === "lecturer")
      return <Navigate to="/lecturer/dashboard" replace />;
    if (role === "student") return <Navigate to="/student/dashboard" replace />;
  }

  return <Outlet />;
}

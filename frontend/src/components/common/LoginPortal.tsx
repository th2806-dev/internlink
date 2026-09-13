import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  Loader2,
  ArrowRight,
  User,
} from "lucide-react";
import { getApiErrorMessage } from "../../lib/apiClient";
import { mapBackendRole } from "../../lib/roleMap";
import { authService } from "../../services/auth.service";
import type { UserRole } from "../../contexts/AuthContext";

interface LoginUser {
  username: string;
  role: UserRole;
  backendRole?: string | null;
  name: string;
  email?: string | null;
  mustChangePassword?: boolean;
  token?: string;
  id?: string;
}

interface LoginPortalProps {
  onLoginSuccess: (user: LoginUser) => void;
}

export function LoginPortal({ onLoginSuccess }: LoginPortalProps) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (usernameInputRef.current) {
      usernameInputRef.current.focus();
    }
    const savedUser = localStorage.getItem("internlink_remembered_username");
    if (savedUser) {
      setUsername(savedUser);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.getModifierState("CapsLock")) {
      setCapsLockOn(true);
    } else {
      setCapsLockOn(false);
    }
  };

  const determineRole = (inputName: string): string => {
    const clean = inputName.trim().toLowerCase();
    if (
      clean === "admin" ||
      clean === "superadmin" ||
      clean.includes("admin@") ||
      clean === "admin123"
    ) {
      return "admin";
    }
    if (
      clean.startsWith("gv") ||
      clean.startsWith("msgv") ||
      clean.includes("phuoc") ||
      clean.includes("giangvien") ||
      clean.includes("lecturer")
    ) {
      return "lecturer";
    }
    return "student";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!username.trim()) {
      setErrorMessage("Vui lòng nhập Tên đăng nhập / MSGV / MSSV.");
      return;
    }
    if (!password) {
      setErrorMessage("Vui lòng nhập mật khẩu truy cập.");
      return;
    }
    if (isLoading) return;
    setIsLoading(true);

    const trimmedUser = username.trim();

    try {


      const loginRes = await authService.login({
        username: trimmedUser,
        password,
      });
      const me = await authService.getMe();
      const role = mapBackendRole(loginRes.role);
      if (!role) {
        setErrorMessage("Tài khoản không có quyền truy cập portal này.");
        return;
      }
      if (rememberMe) {
        localStorage.setItem("internlink_remembered_username", trimmedUser);
      } else {
        localStorage.removeItem("internlink_remembered_username");
      }
      onLoginSuccess({
        username: me.username,
        id: me.id,
        role,
        backendRole: me.role,
        name: me.fullName?.trim() || me.username,
        email: me.email,
        mustChangePassword: loginRes.mustChangePassword,
        token: loginRes.token,
      });
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-[#f4f7fb] text-[#0b1c30] font-sans antialiased selection:bg-blue-100 selection:text-blue-900 relative overflow-x-hidden">
      {/* Subtle Soft Ambient Background Lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#1d4ed8]/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[320px] h-[320px] bg-slate-400/10 rounded-full blur-[100px] pointer-events-none" />

      {/* FLOATING CENTERED WINDOW CARD (Splits 65/35 inside floating card) */}
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-[0_24px_70px_rgba(11,19,43,0.14)] border border-slate-200/80 overflow-hidden flex flex-col lg:flex-row min-h-[620px] z-10 my-auto il-animate-up">
        {/* LEFT HERO PANEL INSIDE FLOATING CARD (LF - 62% Width Desktop) */}
        <div className="relative w-full lg:w-[58%] min-h-[340px] lg:min-h-full flex flex-col justify-between p-8 lg:p-12 bg-[#07152f] overflow-hidden select-none">
          {/* Architectural Background Image with Subtle Gradient Overlay */}
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat transition-all duration-500"
            style={{
              backgroundImage: `linear-gradient(to top, rgba(4, 13, 42, 0.75) 0%, rgba(4, 13, 42, 0.2) 45%, rgba(4, 13, 42, 0.05) 100%), url('https://thongtindaotao.hcmct.edu.vn/static/media/br_login.c3b60201.jpg')`,
            }}
          />

          {/* Glassmorphic Decorative Lights */}
          <div className="absolute top-1/4 left-1/4 w-[30vw] h-[30vw] rounded-full bg-[#0058be] opacity-20 blur-[100px] mix-blend-screen pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-[25vw] h-[25vw] rounded-full bg-blue-500 opacity-15 blur-[90px] mix-blend-screen pointer-events-none" />

          {/* Hero Slogan Content Overlay (Compact Small Size with Smooth Gradient) */}
          <div className="relative z-10 max-w-2xl mt-auto text-left">
            <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full bg-white/10 text-white border border-white/15">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d8e2ff]" />
              <span className="text-[10px] font-bold tracking-wider uppercase text-white font-display">
                INTERNLINK · CỔNG THỰC TẬP
              </span>
            </div>

            <h2 className="text-3xl lg:text-5xl text-white font-bold tracking-tight mb-3 leading-[1.05] font-display">
              Kết nối tài năng.
              <br />
              <span className="text-[#8eb8ff] lg:whitespace-nowrap">Bứt phá sự nghiệp.</span>
            </h2>

            <p className="text-sm text-white/75 font-medium leading-relaxed max-w-sm">
              Nền tảng kết nối sinh viên và doanh nghiệp, tối ưu hóa quy trình
              quản lý thực tập với công nghệ hiện đại.
            </p>
          </div>

          {/* Architectural Bottom Accent Line */}
          <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#bdc5ea] via-[#0058be] to-transparent" />
        </div>

        {/* RIGHT LOGIN PANEL INSIDE FLOATING CARD (RF - 38% Width Desktop) */}
        <div className="w-full lg:w-[42%] p-7 lg:p-12 flex flex-col justify-between items-center bg-white">
          <div className="w-full flex flex-col items-center my-auto">
            {/* Logo Header */}
            <div className="mb-6 flex justify-center">
              <img
                src="/logo/logo_internlink-01.png"
                alt="InternLink Logo"
                className="w-auto object-contain h-16 lg:h-20 transition-transform duration-300"
              />
            </div>

            {/* Form Container */}
            <div className="w-full">
              <div className="flex flex-col gap-1 mb-7 text-left">
                <h2 className="text-2xl lg:text-3xl font-bold text-[#0b1c30] tracking-tight font-display">
                  Đăng nhập
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Vui lòng nhập thông tin tài khoản của bạn.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-md flex items-start gap-2 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span>{errorMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorMessage(null)}
                    className="text-rose-500 hover:text-rose-800 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-4 text-left"
              >
                {/* Username Input */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#0058be] transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    ref={usernameInputRef}
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Tên đăng nhập / MSGV / MSSV"
                    autoComplete="username"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-[#f8f9ff] text-[#0b1c30] text-xs font-medium rounded-md transition-all duration-300 focus:bg-white focus:shadow-[0_4px_24px_-8px_rgba(0,88,190,0.2)] outline-none border border-transparent focus:border-[#0058be]/30 placeholder:text-slate-400"
                  />
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-transparent to-transparent group-focus-within:from-[#0058be] group-focus-within:via-[#0058be]/80 group-focus-within:to-transparent transition-all duration-500 rounded-b-md" />
                </div>

                {/* Password Input */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#0058be] transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Mật khẩu"
                    autoComplete="current-password"
                    required
                    className="w-full pl-11 pr-11 py-3 bg-[#f8f9ff] text-[#0b1c30] text-xs font-medium rounded-md transition-all duration-300 focus:bg-white focus:shadow-[0_4px_24px_-8px_rgba(0,88,190,0.2)] outline-none border border-transparent focus:border-[#0058be]/30 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-transparent to-transparent group-focus-within:from-[#0058be] group-focus-within:via-[#0058be]/80 group-focus-within:to-transparent transition-all duration-500 rounded-b-md" />
                </div>

                {capsLockOn && (
                  <div className="text-[11px] text-amber-700 font-semibold flex items-center gap-1.5 -mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                    <span>Chế độ Caps Lock đang bật</span>
                  </div>
                )}

                {/* Options Row */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer group select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#0058be] focus:ring-[#0058be] cursor-pointer"
                    />
                    <span className="text-xs text-slate-600 font-medium group-hover:text-slate-900 transition-colors">
                      Ghi nhớ đăng nhập
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-xs font-semibold text-[#0058be] hover:text-[#004395] transition-colors cursor-pointer"
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="relative w-full py-3.5 bg-[#0058be] text-white font-semibold text-xs rounded-md shadow-[0_4px_16px_rgba(0,88,190,0.25)] hover:shadow-[0_8px_24px_rgba(0,88,190,0.4)] transition-all duration-300 overflow-hidden group cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <span>Đăng nhập hệ thống</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0058be] via-[#2170e4] to-[#0058be] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </button>
              </form>
            </div>
          </div>

          {/* Minimal Footer Inside Floating Box */}
          <div className="w-full pt-4 flex flex-row justify-between items-center gap-2 text-slate-400 font-medium text-[10px] border-t border-slate-100">
            <p className="whitespace-nowrap">© 2026 InternLink</p>
            <div className="flex gap-3 whitespace-nowrap">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert(
                    "Liên hệ hỗ trợ: support@internlink.edu.vn - Hotline: 024.3754.7506",
                  );
                }}
                className="hover:text-[#0058be] transition-colors"
              >
                Hỗ trợ
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Quy chế thực tập Khoa CNTT - Học kỳ I 2026-2027.");
                }}
                className="hover:text-[#0058be] transition-colors"
              >
                Quy chế
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

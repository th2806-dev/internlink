import { Suspense, lazy } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";
import { SemesterProvider } from "./contexts/SemesterContext";
import { AppRoutes } from "./routes/AppRoutes";
import { queryClient } from "./lib/queryClient";

// Devtools chỉ tải trong môi trường dev (không rơi vào bundle production).
const ReactQueryDevtools = lazy(() =>
  import("@tanstack/react-query-devtools").then((m) => ({
    default: m.ReactQueryDevtools,
  })),
);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <SemesterProvider>
              <ToastProvider>
                <AppRoutes />
              </ToastProvider>
            </SemesterProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}

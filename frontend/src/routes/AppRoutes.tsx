import { useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { FEATURES } from "../config/featureFlags";
import { useSemester } from "../contexts/SemesterContext";
import { lecturerInternshipsService } from "../services/lecturerInternships.service";


// Auth & Layouts
import { LoginPortal } from "../components/common/LoginPortal";
import { ForgotPasswordPage } from "../features/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "../features/auth/pages/ResetPasswordPage";
import { ChangePasswordPage } from "../features/auth/pages/ChangePasswordPage";
import AdminLayout from "../layouts/AdminLayout";
import LecturerLayout from "../layouts/LecturerLayout";
import StudentLayout from "../layouts/StudentLayout";
import { ProtectedRoute } from "./ProtectedRoute";

// Admin Pages
import { DashboardView as AdminDashboardView } from "../features/admin/pages/DashboardView";
import { SemestersView as AdminSemestersView } from "../features/admin/pages/SemestersView";
import { AssignmentsView as AdminAssignmentsView } from "../features/admin/pages/AssignmentsView";
import { LecturersView as AdminLecturersView } from "../features/admin/pages/LecturersView";
import { StudentsView as AdminStudentsView } from "../features/admin/pages/StudentsView";
import { CompaniesView as AdminCompaniesView } from "../features/admin/pages/CompaniesView";
import { CompaniesDetailView as AdminCompaniesDetailView } from "../features/admin/pages/CompaniesDetailView";
import { UsersView as AdminUsersView } from "../features/admin/pages/UsersView";
import { AccountRequestsView as AdminAccountRequestsView } from "../features/admin/pages/AccountRequestsView";
import { NotificationsView as AdminNotificationsView } from "../features/admin/pages/NotificationsView";
import { SettingsView as AdminSettingsView } from "../features/admin/pages/SettingsView";
import { AccountView as AdminAccountView } from "../features/admin/pages/AccountView";
import { TemplatesView as AdminTemplatesView } from "../features/admin/pages/TemplatesView";
import { DepartmentsView as AdminDepartmentsView } from "../features/admin/pages/DepartmentsView";

// Lecturer Pages
import { DashboardView as LecturerDashboardView } from "../features/lecturer/pages/DashboardView";
import { StudentsView as LecturerStudentsView } from "../features/lecturer/pages/StudentsView";
import { EnterprisesView as LecturerEnterprisesView } from "../features/lecturer/pages/EnterprisesView";
import { EnterprisesDetailView as LecturerEnterprisesDetailView } from "../features/lecturer/pages/EnterprisesDetailView";
import { TemplatesView as LecturerTemplatesView } from "../features/lecturer/pages/TemplatesView";
import { ReportsView as LecturerReportsView } from "../features/lecturer/pages/ReportsView";
import { AnalyticsView as LecturerAnalyticsView } from "../features/lecturer/pages/AnalyticsView";
import { EvaluationsView as LecturerEvaluationsView } from "../features/lecturer/pages/EvaluationsView";
import { NotificationsView as LecturerNotificationsView } from "../features/lecturer/pages/NotificationsView";
import { AccountView as LecturerAccountView } from "../features/lecturer/pages/AccountView";
import { AttendanceManagementView as LecturerAttendanceView } from "../features/lecturer/pages/AttendanceManagementView";
import { SummaryView as LecturerSummaryView } from "../features/lecturer/pages/SummaryView";
import { StudentWorkspace as LecturerStudentWorkspace } from "../features/lecturer/components/StudentWorkspace";

// Student Pages
import { DashboardView as StudentDashboardView } from "../features/student/pages/DashboardView";
import { InternshipView as StudentInternshipView } from "../features/student/pages/InternshipView";
import { WeeklyReportsView as StudentWeeklyReportsView } from "../features/student/pages/WeeklyReportsView";
import { SubmissionsView as StudentSubmissionsView } from "../features/student/pages/SubmissionsView";
import { FeedbackView as StudentFeedbackView } from "../features/student/pages/FeedbackView";
import { TemplatesView as StudentTemplatesView } from "../features/student/pages/TemplatesView";
import { NotificationsView as StudentNotificationsView } from "../features/student/pages/NotificationsView";
import { AccountView as StudentAccountView } from "../features/student/pages/AccountView";
import { EvaluationView as StudentEvaluationView } from "../features/student/pages/EvaluationView";
import { StudentAttendanceView } from "../features/student/pages/StudentAttendanceView";

// App State hooks
import { useRealAppState } from "./useRealAppState";

export function AppRoutes() {
  const { isLoggedIn, isBootstrapping, role, user, login, logout, switchRole } = useAuth();
  const isSuperAdmin = user?.backendRole === "SuperAdmin";
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState("");

  const { selectedSemesterId } = useSemester();
  const realState = useRealAppState(role, isLoggedIn, user, showToast, selectedSemesterId);
  const appState = realState;

  const currentTabFromPath =
    location.pathname.startsWith("/lecturer/")
      ? location.pathname.split("/")[2] || "dashboard"
      : location.pathname.split("/").pop() || "dashboard";

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />

      {/* Public Login Route */}
      <Route
        path="/login"
        element={
          isBootstrapping ? (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-700">
              <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-600">Đang xác thực phiên làm việc…</p>
            </div>
          ) : isLoggedIn ? (
            <Navigate
              to={
                (location.state as { from?: { pathname?: string } })?.from?.pathname ||
                `/${role}/dashboard`
              }
              replace
            />
          ) : (
            <LoginPortal
              onLoginSuccess={(user) => {
                login({
                  token: user.token,
                  user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    role: user.role,
                    backendRole: user.backendRole,
                    email: user.email,
                  },
                  mustChangePassword: user.mustChangePassword,
                });
                showToast(`Chào mừng ${user.name}`);
                const returnUrl = (location.state as { from?: { pathname?: string } })?.from?.pathname;
                if (user.mustChangePassword) {
                  navigate("/change-password");
                } else if (returnUrl && returnUrl !== "/login") {
                  navigate(returnUrl);
                } else {
                  navigate(`/${user.role}/dashboard`);
                }
              }}
            />
          )
        }
      />

      {/* ADMIN ROUTES */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route
          path="/admin/*"
          element={
            <AdminLayout
              activeTab={currentTabFromPath}
              onNavigate={(tab) =>
                navigate(`/admin/${tab.replace("admin-", "")}`)
              }
              onSwitchPortal={(r) => {
                switchRole(r);
                navigate(`/${r}/dashboard`);
              }}
              onLogout={async () => {
                await logout();
                navigate("/login");
              }}
            >
              <Routes>
                <Route
                  path="dashboard"
                  element={
                    <AdminDashboardView
                      onShowToast={showToast}
                      onNavigateTab={(t) =>
                        navigate(`/admin/${t.replace("admin-", "")}`)
                      }
                    />
                  }
                />
                <Route
                  path="companies"
                  element={
                    isSuperAdmin ? (
                      <Navigate to="/admin/dashboard" replace />
                    ) : (
                      <AdminCompaniesView onShowToast={showToast} />
                    )
                  }
                />
                <Route
                  path="companies/detail"
                  element={<Navigate to="/admin/companies" replace />}
                />
                <Route
                  path="companies/:id"
                  element={
                    isSuperAdmin ? (
                      <Navigate to="/admin/dashboard" replace />
                    ) : (
                      <AdminCompaniesDetailView />
                    )
                  }
                />
                <Route
                  path="users"
                  element={<AdminUsersView onShowToast={showToast} />}
                />
                <Route
                  path="departments"
                  element={
                    isSuperAdmin ? (
                      <AdminDepartmentsView onShowToast={showToast} />
                    ) : (
                      <Navigate to="/admin/dashboard" replace />
                    )
                  }
                />
                <Route
                  path="semesters"
                  element={
                    FEATURES.adminSemesters ? (
                      <AdminSemestersView
                        onShowToast={showToast}
                        onNavigateTab={(t) =>
                          navigate(`/admin/${t.replace("admin-", "")}`)
                        }
                      />
                    ) : (
                      <Navigate to="/admin/dashboard" replace />
                    )
                  }
                />
                <Route
                  path="assignments"
                  element={
                    isSuperAdmin ? (
                      <Navigate to="/admin/dashboard" replace />
                    ) : (
                      <AdminAssignmentsView onShowToast={showToast} />
                    )
                  }
                />
                <Route
                  path="lecturers"
                  element={
                    isSuperAdmin ? (
                      <Navigate to="/admin/dashboard" replace />
                    ) : (
                      <AdminLecturersView onShowToast={showToast} />
                    )
                  }
                />
                <Route
                  path="students"
                  element={
                    isSuperAdmin ? (
                      <Navigate to="/admin/dashboard" replace />
                    ) : (
                      <AdminStudentsView onShowToast={showToast} />
                    )
                  }
                />
                <Route
                  path="templates"
                  element={
                    isSuperAdmin ? (
                      <Navigate to="/admin/dashboard" replace />
                    ) : (
                      <AdminTemplatesView onShowToast={showToast} />
                    )
                  }
                />
                <Route
                  path="account-requests"
                  element={
                    isSuperAdmin && FEATURES.adminAccountRequests ? (
                      <AdminAccountRequestsView
                        onShowToast={showToast}
                        onNavigateTab={(t) =>
                          navigate(`/admin/${t.replace("admin-", "")}`)
                        }
                      />
                    ) : (
                      <Navigate to="/admin/dashboard" replace />
                    )
                  }
                />
                <Route
                  path="notifications"
                  element={
                    isSuperAdmin ? (
                      <Navigate to="/admin/dashboard" replace />
                    ) : (
                      <AdminNotificationsView
                        onShowToast={showToast}
                        onNavigateTab={(t) =>
                          navigate(`/admin/${t.replace("admin-", "")}`)
                        }
                      />
                    )
                  }
                />
                <Route
                  path="settings"
                  element={
                    isSuperAdmin ? (
                      <AdminSettingsView
                        onShowToast={showToast}
                        onNavigateTab={(t) =>
                          navigate(`/admin/${t.replace("admin-", "")}`)
                        }
                      />
                    ) : (
                      <Navigate to="/admin/dashboard" replace />
                    )
                  }
                />
                <Route
                  path="account"
                  element={<AdminAccountView onShowToast={showToast} />}
                />
                <Route
                  path="*"
                  element={<Navigate to="/admin/dashboard" replace />}
                />
              </Routes>
            </AdminLayout>
          }
        />
      </Route>

      {/* LECTURER ROUTES */}
      <Route element={<ProtectedRoute allowedRoles={["lecturer"]} />}>
        <Route
          path="/lecturer/*"
          element={
            <LecturerLayout
              activeTab={currentTabFromPath}
              onNavigate={(tab) => navigate(`/lecturer/${tab}`)}
              onSwitchPortal={(r) => {
                switchRole(r);
                navigate(`/${r}/dashboard`);
              }}
              onLogout={async () => {
                await logout();
                navigate("/login");
              }}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              currentLecturer={appState.currentLecturer}
              assignedStudentsCount={appState.assignedStudents.length}
            >
              <Routes>
                <Route
                  path="dashboard"
                  element={
                    <LecturerDashboardView
                      actionItems={appState.dynamicActionItems}
                      deadlines={appState.deadlines}
                      submissions={appState.assignedSubmissions}
                      stats={appState.stats}
                      weeklyTrendData={appState.weeklyTrendData}
                      onShowToast={showToast}
                      onNavigate={(tab) => navigate(`/lecturer/${tab}`)}
                      onRefresh={appState.refresh}
                    />
                  }
                />
                <Route
                  path="students"
                  element={
                    <LecturerStudentsView
                      students={appState.assignedStudents}
                      onRefresh={appState.refresh}
                    />
                  }
                />
                <Route
                  path="students/:internshipId"
                  element={<LecturerStudentWorkspace onRefreshParent={appState.refresh} onShowToast={showToast} />}
                />
                <Route
                  path="enterprises"
                  element={
                    <LecturerEnterprisesView
                      enterprises={appState.lecturerEnterprises}
                      onRefresh={appState.refresh}
                      readOnly
                    />
                  }
                />
                <Route
                  path="enterprises/:companyId"
                  element={<LecturerEnterprisesDetailView />}
                />
                <Route path="templates" element={<LecturerTemplatesView />} />
                <Route
                  path="evaluations"
                  element={<LecturerEvaluationsView onShowToast={showToast} />}
                />
                <Route
                  path="evaluations/:internshipId"
                  element={<LecturerEvaluationsView onShowToast={showToast} />}
                />
                <Route path="summary" element={<LecturerSummaryView onShowToast={showToast} />} />
                <Route path="export" element={<Navigate to="/lecturer/summary" replace />} />
                <Route
                  path="reports"
                  element={
                    <LecturerReportsView
                      submissions={appState.assignedSubmissions}
                      weeklyReports={appState.weeklyReports}
                      weeklyReportPage={appState.weeklyReportPage}
                      weeklyReportQuery={appState.weeklyReportQuery}
                      onQueryWeeklyReports={appState.queryWeeklyReports}
                      isLoading={appState.isLecturerLoading}
                      error={appState.lecturerError}
                      onRetry={appState.refresh}
                      onUpdateSubmissionStatus={appState.handleUpdateSubmissionStatus}
                      onReviewWeeklyReport={appState.handleReviewWeeklyReport}
                      showToast={showToast}
                    />
                  }
                />
                <Route
                  path="analytics"
                  element={
                    FEATURES.lecturerAnalytics ? (
                      <LecturerAnalyticsView showToast={showToast} />
                    ) : (
                      <Navigate to="/lecturer/dashboard" replace />
                    )
                  }
                />
                <Route
                  path="attendance"
                  element={<LecturerAttendanceView onShowToast={showToast} />}
                />
                <Route
                  path="notifications"
                  element={<LecturerNotificationsView />}
                />
                <Route path="account" element={<LecturerAccountView />} />
                <Route
                  path="*"
                  element={<Navigate to="/lecturer/dashboard" replace />}
                />
              </Routes>
            </LecturerLayout>
          }
        />
      </Route>

      {/* STUDENT ROUTES */}
      <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
        <Route
          path="/student/*"
          element={
            <StudentLayout
              activeTab={currentTabFromPath}
              onNavigate={(tab) =>
                navigate(`/student/${tab.replace("student-", "")}`)
              }
              onSwitchPortal={(r) => {
                switchRole(r);
                navigate(`/${r}/dashboard`);
              }}
              onLogout={async () => {
                await logout();
                navigate("/login");
              }}
            >
              <Routes>
                <Route
                  path="dashboard"
                  element={
                    <StudentDashboardView
                      onNavigate={(t) =>
                        navigate(`/student/${t.replace("student-", "")}`)
                      }
                      onShowToast={showToast}
                    />
                  }
                />
                <Route
                  path="internship"
                  element={
                    <StudentInternshipView
                      onShowToast={showToast}
                      onNavigate={(t) =>
                        navigate(`/student/${t.replace("student-", "")}`)
                      }
                    />
                  }
                />
                <Route
                  path="weekly-reports"
                  element={<StudentWeeklyReportsView onShowToast={showToast} />}
                />
                <Route
                  path="submissions"
                  element={<StudentSubmissionsView onShowToast={showToast} />}
                />
                <Route
                  path="feedback"
                  element={
                    <StudentFeedbackView
                      onShowToast={showToast}
                      onNavigateToWeeklyReports={() =>
                        navigate("/student/weekly-reports")
                      }
                    />
                  }
                />
                <Route
                  path="templates"
                  element={<StudentTemplatesView onShowToast={showToast} />}
                />
                <Route
                  path="evaluation"
                  element={<StudentEvaluationView onShowToast={showToast} />}
                />
                <Route
                  path="attendance"
                  element={<StudentAttendanceView onShowToast={showToast} />}
                />
                <Route
                  path="notifications"
                  element={
                    <StudentNotificationsView
                      onShowToast={showToast}
                      onNavigate={(t) =>
                        navigate(`/student/${t.replace("student-", "")}`)
                      }
                    />
                  }
                />
                <Route
                  path="account"
                  element={
                    <StudentAccountView
                      onShowToast={showToast}
                      onNavigate={(t) =>
                        navigate(`/student/${t.replace("student-", "")}`)
                      }
                      onLogout={async () => {
                        await logout();
                        navigate("/login");
                      }}
                    />
                  }
                />
                <Route
                  path="*"
                  element={<Navigate to="/student/dashboard" replace />}
                />
              </Routes>
            </StudentLayout>
          }
        />
      </Route>

      {/* Default Catch-all */}
      <Route
        path="*"
        element={
          isLoggedIn && role ? (
            <Navigate to={`/${role}/dashboard`} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

import { Navigate, Route, Routes } from "react-router-dom";
import { Spinner } from "@heroui/react";
import { ScanSearch } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import AdminPage from "@/pages/admin";
import DashboardPage from "@/pages/dashboard";
import DictionariesPage from "@/pages/dictionaries";
import LoginPage from "@/pages/login";
import OrganizationsPage from "@/pages/organizations";
import ProfilePage from "@/pages/profile";
import RegisterPage from "@/pages/register";
import RolesPage from "@/pages/roles";
import SubsystemPage from "@/pages/subsystem";
import UsersPage from "@/pages/users";
import RiskOverviewPage from "@/pages/risk/overview";
import RiskObjectsPage from "@/pages/risk/objects";
import RiskUnitsPage from "@/pages/risk/units";
import RiskEventsPage from "@/pages/risk/events";
import RiskMeasuresPage from "@/pages/risk/measures";
import { useAuth } from "@/provider";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate replace to="/login" />;
  return <AppShell />;
}

function WorkspaceGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  // 没有工作空间时，除个人中心外一律引导去创建组织
  if (user && !user.workspaceId) return <Navigate replace to="/profile" />;
  return <>{children}</>;
}

function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user?.isSuperAdmin) return <Navigate replace to="/dashboard" />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate replace to="/dashboard" />;
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />

      <Route element={<ProtectedLayout />}>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<Navigate replace to="/profile" />} />
        <Route
          path="/dashboard"
          element={<WorkspaceGuard><DashboardPage /></WorkspaceGuard>}
        />
        <Route path="/users" element={<WorkspaceGuard><UsersPage /></WorkspaceGuard>} />
        <Route path="/organizations" element={<WorkspaceGuard><OrganizationsPage /></WorkspaceGuard>} />
        <Route path="/roles" element={<WorkspaceGuard><RolesPage /></WorkspaceGuard>} />
        <Route path="/dictionaries" element={<WorkspaceGuard><DictionariesPage /></WorkspaceGuard>} />
        <Route
          path="/subsystems/risk"
          element={<WorkspaceGuard><RiskOverviewPage /></WorkspaceGuard>}
        />
        <Route
          path="/subsystems/risk/objects"
          element={<WorkspaceGuard><RiskObjectsPage /></WorkspaceGuard>}
        />
        <Route
          path="/subsystems/risk/units"
          element={<WorkspaceGuard><RiskUnitsPage /></WorkspaceGuard>}
        />
        <Route
          path="/subsystems/risk/events"
          element={<WorkspaceGuard><RiskEventsPage /></WorkspaceGuard>}
        />
        <Route
          path="/subsystems/risk/measures"
          element={<WorkspaceGuard><RiskMeasuresPage /></WorkspaceGuard>}
        />
        <Route
          path="/subsystems/inspection"
          element={
            <WorkspaceGuard>
              <SubsystemPage
                title="智能巡检"
                description="巡检任务下达、执行记录与隐患闭环"
                icon={ScanSearch}
              />
            </WorkspaceGuard>
          }
        />
        <Route path="/admin" element={<SuperAdminGuard><AdminPage /></SuperAdminGuard>} />
      </Route>

      <Route path="*" element={<Navigate replace to="/dashboard" />} />
    </Routes>
  );
}

export default App;

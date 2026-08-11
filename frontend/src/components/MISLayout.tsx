import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./sidebar";
import MISHeader from "./MISHeader";
import { SessionTimeoutModal } from "@/modules/auth";
import { useSessionTimeout } from "@/modules/auth";
import { useSessionStore } from "@/modules/auth";
import { useUserStore } from "@/modules/auth/stores/useUserStore";
import { hasRoutePermission } from "@/data/permissions";

export default function MISLayout() {
  const location = useLocation();
  const { keepAlive, remainingTime } = useSessionTimeout();
  const { showTimeoutWarning, hideWarning } = useSessionStore();
  const userPermissions = useUserStore((state) => state.userProfile?.permissions ?? []);

  const canAccessCurrentRoute = hasRoutePermission(location.pathname, userPermissions);
  if (!canAccessCurrentRoute) {
    return <Navigate to="/" replace />;
  }

  return (
    <div data-section="mis" className="flex h-screen bg-background">
      {/* Main Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <MISHeader />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <Outlet />
        </main>
      </div>

      {/* Session Timeout Modal */}
      <SessionTimeoutModal
        isOpen={showTimeoutWarning}
        remainingSeconds={Math.floor(remainingTime / 1000)}
        onKeepAlive={() => {
          keepAlive();
          hideWarning();
        }}
      />
    </div>
  );
}

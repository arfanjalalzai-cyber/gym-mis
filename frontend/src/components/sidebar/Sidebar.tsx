import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Users,
  UserCog,
  Settings,
  LogOut,
  User,
  Dumbbell,
  Package,
  CalendarDays,
  ClipboardCheck,
  Wallet,
  BarChart3,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import SidebarItem from "./SidebarItem";
import SidebarToggle from "./SidebarToggle";
import { useSidebarState } from "./useSidebarState";
import { useUserStore } from "@/modules/auth";
import type { Permission } from "@/data/permissions";

/**
 * Enhanced Sidebar Component
 * Main navigation sidebar with multi-level support
 */
export default function Sidebar() {
  const { t } = useTranslation();
  const { isCollapsed, isMobileOpen, closeMobile } = useSidebarState();
  const { logout, hasPermission, userProfile } = useUserStore();

  // Define navigation items
  const navItems = [
    {
      path: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      path: "/members",
      label: "Members",
      icon: Users,
      permission: "members" as Permission,
      badge: undefined,
    },
    {
      path: "/staff",
      label: "Staff",
      icon: UserCog,
      permission: "staff" as Permission,
      badge: undefined,
    },
    {
      path: "/inventory",
      label: "Inventory",
      icon: Package,
      permission: "inventory" as Permission,
      badge: undefined,
    },
    {
      path: "/schedule",
      label: "Schedule",
      icon: CalendarDays,
      permission: "schedule" as Permission,
      badge: undefined,
    },
    {
      path: "/attendance",
      label: "Attendance",
      icon: ClipboardCheck,
      permission: "attendance" as Permission,
      badge: undefined,
    },
    {
      path: "/payments",
      label: "Payments",
      icon: Wallet,
      permission: "fees" as Permission,
      badge: undefined,
    },
    {
      path: "/reports",
      label: "Reports",
      icon: BarChart3,
      permission: "reports" as Permission,
      badge: undefined,
    },
    {
      path: "/expenses",
      label: "Expenses",
      icon: ReceiptText,
      permission: "reports" as Permission,
      badge: undefined,
    },
    {
      path: "/profile",
      label: "Profile",
      icon: User,
    },
    {
      path: "/settings",
      label: "Settings",
      icon: Settings,
      permission: "settings" as Permission,
      subItems: undefined,
      divider: undefined,
    },
  ];
  const visibleNavItems = navItems.filter((item) => {
    if (!("permission" in item) || !item.permission) return true;
    return hasPermission(item.permission);
  });
  if (userProfile?.role === "super_admin") {
    visibleNavItems.push({
      path: "/super-admin",
      label: "Super Admin",
      icon: ShieldCheck,
    });
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        data-sidebar="main"
        className={`fixed lg:relative inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-gradient-to-br from-auth-background via-auth-surface to-auth-card text-white shadow-2xl transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-72"
        } ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Decorative gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-secondary/10" />

      {/* Logo & Toggle */}
      <div className={`relative z-10 flex items-center border-b border-white/10 bg-auth-background/70 backdrop-blur-xl px-4 ${isCollapsed ? 'h-auto py-4 flex-col gap-3' : 'h-16 justify-between'}`}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/30">
                  <Dumbbell className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white leading-none">Gym MIS</h1>
                <p className="text-[10px] text-auth-muted leading-none mt-0.5">Management System</p>
              </div>
            </div>
            <SidebarToggle />
          </>
        ) : (
          <>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/30">
              <Dumbbell className="h-5 w-5 text-white" />
            </div>
            <SidebarToggle />
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
        <ul className="space-y-1">
          {visibleNavItems.map((item) => (
            <SidebarItem
              key={item.path}
              path={item.path}
              label={item.label}
              icon={item.icon}
              badge={item.badge}
              subItems={(item as any).subItems}
              divider={(item as any).divider}
            />
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="relative z-10 border-t border-white/10 bg-auth-background/50 backdrop-blur-xl p-3">
        <button
          onClick={logout}
          className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-error/20 hover:text-error active:scale-95 ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <LogOut className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          {!isCollapsed && <span>{t("mis.nav.logout", "Logout")}</span>}
        </button>
      </div>
    </aside>
    </>
  );
}

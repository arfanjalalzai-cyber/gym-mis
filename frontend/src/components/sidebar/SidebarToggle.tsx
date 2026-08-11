import { Menu, X } from "lucide-react";
import { useSidebarState } from "./useSidebarState";

interface SidebarToggleProps {
  className?: string;
}

/**
 * Sidebar Toggle Button
 * Toggles sidebar collapsed/expanded state
 */
export default function SidebarToggle({ className = "" }: SidebarToggleProps) {
  const { isCollapsed, toggleCollapse } = useSidebarState();

  return (
    <button
      onClick={toggleCollapse}
      className={`flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-auth-muted transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-95 ${className}`}
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {isCollapsed ? (
        <Menu className="h-5 w-5" />
      ) : (
        <X className="h-5 w-5" />
      )}
    </button>
  );
}

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import {
  Search,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Moon,
  Sun,
  Menu,
  Users,
  BriefcaseBusiness,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "./ui";
import { useUserStore } from "@/modules/auth/stores/useUserStore";
import { useTheme } from "@/hooks/useTheme";
import { useSidebarState } from "./sidebar/useSidebarState";
import { useMembersList } from "@/modules/members/queries/useMembers";
import { useStaffList } from "@/modules/staff/queries/useStaff";

export default function MISHeader() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { userProfile, logout } = useUserStore();
  const { toggleMobile } = useSidebarState();

  const { theme, toggleTheme } = useTheme();
  const trimmedSearch = debouncedSearch.trim();
  const hasSearch = trimmedSearch.length > 0;

  const membersQuery = useMembersList(
    { page: 1, page_size: 5, search: trimmedSearch },
    { enabled: hasSearch }
  );
  const staffQuery = useStaffList(
    { page: 1, page_size: 5, search: trimmedSearch },
    { enabled: hasSearch }
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success(t("auth.logoutSuccess", "Logged out successfully"));
    navigate("/auth/login", { replace: true });
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    setShowSearchResults(false);
    navigate(`/members?search=${encodeURIComponent(query)}&page=1`);
  };

  const handleResultClick = (path: string) => {
    setShowSearchResults(false);
    navigate(path);
  };

  const displayName = userProfile
    ? `${userProfile.firstName} ${userProfile.lastName}`.trim() || userProfile.username
    : "User";

  const roleDisplay = userProfile?.role
    ? userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1).replace("_", " ")
    : "User";

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <button
        onClick={toggleMobile}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface hover:text-text-primary lg:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex flex-1 items-center gap-4">
        <div ref={searchRef} className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <form onSubmit={handleSearchSubmit}>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              placeholder={t("mis.header.search", "Search members, staff...")}
              className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </form>

          {showSearchResults && hasSearch && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              <div className="max-h-96 overflow-y-auto py-2">
                <SearchSection
                  title="Members"
                  icon={<Users className="h-4 w-4" />}
                  loading={membersQuery.isLoading}
                  emptyMessage="No members found"
                  items={(membersQuery.data?.results ?? []).map((member) => ({
                    id: member.id,
                    title: `${member.first_name} ${member.last_name}`,
                    subtitle: `${member.member_code} | ${member.phone}`,
                    imageUrl: member.profile_picture_url,
                    onClick: () => handleResultClick(`/members/${member.id}`),
                  }))}
                />
                <SearchSection
                  title="Staff"
                  icon={<BriefcaseBusiness className="h-4 w-4" />}
                  loading={staffQuery.isLoading}
                  emptyMessage="No staff found"
                  items={(staffQuery.data?.results ?? []).map((staff) => ({
                    id: staff.id,
                    title: `${staff.first_name} ${staff.last_name}`,
                    subtitle: `${staff.staff_code} | ${staff.mobile_number}`,
                    imageUrl: staff.profile_picture_url,
                    onClick: () => handleResultClick(`/staff/${staff.id}`),
                  }))}
                />
                <div className="grid grid-cols-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => handleResultClick(`/members?search=${encodeURIComponent(searchQuery.trim())}&page=1`)}
                    className="px-4 py-2 text-left text-xs font-medium text-primary hover:bg-surface-hover"
                  >
                    View all members
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResultClick(`/staff?search=${encodeURIComponent(searchQuery.trim())}&page=1`)}
                    className="border-l border-border px-4 py-2 text-left text-xs font-medium text-primary hover:bg-surface-hover"
                  >
                    View all staff
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="rounded-full p-2 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          aria-label={t("nav.toggleTheme")}
        >
          {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-hover"
          >
            <Avatar name={displayName} src={userProfile?.avatarUrl} size="sm" />
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium text-text-primary">{displayName}</p>
              <p className="text-xs text-text-secondary">{roleDisplay}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-card py-2 shadow-lg">
              <div className="border-b border-border px-4 py-3">
                <p className="font-medium text-text-primary">{displayName}</p>
                <p className="text-sm text-text-secondary">{userProfile?.email || "user@gym.local"}</p>
              </div>
              <div className="py-1">
                <Link
                  to="/profile"
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-text-primary transition-colors hover:bg-surface-hover"
                  onClick={() => setShowProfileMenu(false)}
                >
                  <User className="h-4 w-4" />
                  {t("auth.profile", "Profile")}
                </Link>
                <Link
                  to="/settings"
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-text-primary transition-colors hover:bg-surface-hover"
                  onClick={() => setShowProfileMenu(false)}
                >
                  <Settings className="h-4 w-4" />
                  {t("auth.settings", "Settings")}
                </Link>
              </div>
              <div className="border-t border-border py-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-error transition-colors hover:bg-error-soft"
                >
                  <LogOut className="h-4 w-4" />
                  {t("auth.logout", "Logout")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showProfileMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowProfileMenu(false)}
        />
      )}
    </header>
  );
}

interface SearchSectionItem {
  id: number;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  onClick: () => void;
}

function SearchSection({
  title,
  icon,
  loading,
  emptyMessage,
  items,
}: {
  title: string;
  icon: ReactNode;
  loading: boolean;
  emptyMessage: string;
  items: SearchSectionItem[];
}) {
  return (
    <div className="py-1">
      <div className="flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
        {icon}
        {title}
      </div>
      {loading ? (
        <p className="px-4 py-2 text-sm text-text-secondary">Searching...</p>
      ) : items.length > 0 ? (
        items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-surface-hover"
          >
            <Avatar name={item.title} src={item.imageUrl} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-text-primary">{item.title}</span>
              <span className="block truncate text-xs text-text-secondary">{item.subtitle}</span>
            </span>
          </button>
        ))
      ) : (
        <p className="px-4 py-2 text-sm text-text-secondary">{emptyMessage}</p>
      )}
    </div>
  );
}

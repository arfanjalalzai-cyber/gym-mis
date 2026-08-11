import { Search } from "lucide-react";

import Input from "@/components/ui/Input";
import type { MemberStatusFilter } from "../stores/useMemberStore";

interface MemberSearchFiltersProps {
  search: string;
  status: MemberStatusFilter;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: MemberStatusFilter) => void;
}

export default function MemberSearchFilters({
  search,
  status,
  onSearchChange,
  onStatusChange,
}: MemberSearchFiltersProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Input
          placeholder="Search by code, name, phone, address or email"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
          className="w-full lg:max-w-md"
          fullWidth={false}
        />
        <div className="inline-flex rounded-lg border border-border p-1">
          {(["all", "active", "inactive"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onStatusChange(item)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                status === item
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              }`}
            >
              {item === "all" ? "All" : item === "active" ? "Active" : "Inactive"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

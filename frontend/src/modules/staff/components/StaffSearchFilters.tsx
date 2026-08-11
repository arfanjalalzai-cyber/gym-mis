import { Search } from "lucide-react";

import Input from "@/components/ui/Input";
import type {
  StaffEmploymentStatusFilter,
  StaffPositionFilter,
  StaffSalaryStatusFilter,
} from "../stores/useStaffStore";

interface StaffSearchFiltersProps {
  search: string;
  position: StaffPositionFilter;
  employmentStatus: StaffEmploymentStatusFilter;
  salaryStatus: StaffSalaryStatusFilter;
  onSearchChange: (value: string) => void;
  onPositionChange: (value: StaffPositionFilter) => void;
  onEmploymentStatusChange: (value: StaffEmploymentStatusFilter) => void;
  onSalaryStatusChange: (value: StaffSalaryStatusFilter) => void;
}

export default function StaffSearchFilters({
  search,
  position,
  employmentStatus,
  salaryStatus,
  onSearchChange,
  onPositionChange,
  onEmploymentStatusChange,
  onSalaryStatusChange,
}: StaffSearchFiltersProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-4">
        <Input
          placeholder="Search by code, name, mobile, address or email"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
          className="w-full lg:max-w-md"
          fullWidth={false}
        />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Position
            </label>
            <select
              value={position}
              onChange={(event) => onPositionChange(event.target.value as StaffPositionFilter)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Positions</option>
              <option value="trainer">Trainer</option>
              <option value="manager">Manager</option>
              <option value="cleaner">Cleaner</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Employment
            </label>
            <select
              value={employmentStatus}
              onChange={(event) =>
                onEmploymentStatusChange(event.target.value as StaffEmploymentStatusFilter)
              }
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Employment</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
              <option value="resigned">Resigned</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Salary
            </label>
            <select
              value={salaryStatus}
              onChange={(event) => onSalaryStatusChange(event.target.value as StaffSalaryStatusFilter)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Salary</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

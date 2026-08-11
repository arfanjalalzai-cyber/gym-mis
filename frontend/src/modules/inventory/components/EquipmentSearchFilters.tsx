import { Search } from "lucide-react";

import Input from "@/components/ui/Input";
import type {
  CategoryFilter,
  ItemTypeFilter,
  MachineStatusFilter,
} from "../stores/useInventoryStore";

interface EquipmentSearchFiltersProps {
  search: string;
  itemType: ItemTypeFilter;
  category: CategoryFilter;
  machineStatus: MachineStatusFilter;
  lowStockOnly: boolean;
  onSearchChange: (value: string) => void;
  onItemTypeChange: (value: ItemTypeFilter) => void;
  onCategoryChange: (value: CategoryFilter) => void;
  onMachineStatusChange: (value: MachineStatusFilter) => void;
  onLowStockToggle: (value: boolean) => void;
}

export default function EquipmentSearchFilters({
  search,
  itemType,
  category,
  machineStatus,
  lowStockOnly,
  onSearchChange,
  onItemTypeChange,
  onCategoryChange,
  onMachineStatusChange,
  onLowStockToggle,
}: EquipmentSearchFiltersProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Input
            placeholder="Search by code or name"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            fullWidth={false}
            className="w-full"
          />
        </div>

        <div className="lg:col-span-2">
          <select
            value={itemType}
            onChange={(event) => onItemTypeChange(event.target.value as ItemTypeFilter)}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Types</option>
            <option value="machine">Machine</option>
            <option value="accessory">Accessory</option>
            <option value="consumable">Consumable</option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <select
            value={category}
            onChange={(event) => onCategoryChange(event.target.value as CategoryFilter)}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Categories</option>
            <option value="cardio">Cardio</option>
            <option value="strength">Strength</option>
            <option value="free_weight">Free Weight</option>
            <option value="functional">Functional</option>
            <option value="recovery">Recovery</option>
            <option value="hygiene">Hygiene</option>
            <option value="nutrition">Nutrition</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <select
            value={machineStatus}
            onChange={(event) => onMachineStatusChange(event.target.value as MachineStatusFilter)}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Statuses</option>
            <option value="operational">Operational</option>
            <option value="in_use">In Use</option>
            <option value="maintenance">Maintenance</option>
            <option value="out_of_order">Out of Order</option>
            <option value="retired">Retired</option>
          </select>
        </div>

        <div className="flex items-center lg:col-span-2">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(event) => onLowStockToggle(event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            Low Stock Only
          </label>
        </div>
      </div>
    </div>
  );
}

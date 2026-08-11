import { create } from "zustand";

import type {
  EquipmentCategory,
  ItemType,
  MachineStatus,
} from "../types/equipment";

export type ItemTypeFilter = "all" | ItemType;
export type CategoryFilter = "all" | EquipmentCategory;
export type MachineStatusFilter = "all" | MachineStatus;

interface InventoryStoreState {
  search: string;
  itemType: ItemTypeFilter;
  category: CategoryFilter;
  machineStatus: MachineStatusFilter;
  lowStockOnly: boolean;
  page: number;
  page_size: number;
  ordering:
    | "created_at"
    | "-created_at"
    | "name"
    | "-name"
    | "quantity_on_hand"
    | "-quantity_on_hand"
    | "quantity_in_service"
    | "-quantity_in_service";
  setSearch: (search: string) => void;
  setItemType: (itemType: ItemTypeFilter) => void;
  setCategory: (category: CategoryFilter) => void;
  setMachineStatus: (machineStatus: MachineStatusFilter) => void;
  setLowStockOnly: (lowStockOnly: boolean) => void;
  setPage: (page: number) => void;
  setPageSize: (page_size: number) => void;
  setOrdering: (ordering: InventoryStoreState["ordering"]) => void;
  resetFilters: () => void;
}

export const useInventoryStore = create<InventoryStoreState>((set) => ({
  search: "",
  itemType: "all",
  category: "all",
  machineStatus: "all",
  lowStockOnly: false,
  page: 1,
  page_size: 25,
  ordering: "-created_at",

  setSearch: (search) => set({ search }),
  setItemType: (itemType) => set({ itemType }),
  setCategory: (category) => set({ category }),
  setMachineStatus: (machineStatus) => set({ machineStatus }),
  setLowStockOnly: (lowStockOnly) => set({ lowStockOnly }),
  setPage: (page) => set({ page }),
  setPageSize: (page_size) => set({ page_size }),
  setOrdering: (ordering) => set({ ordering }),
  resetFilters: () =>
    set({
      search: "",
      itemType: "all",
      category: "all",
      machineStatus: "all",
      lowStockOnly: false,
      page: 1,
      page_size: 25,
      ordering: "-created_at",
    }),
}));

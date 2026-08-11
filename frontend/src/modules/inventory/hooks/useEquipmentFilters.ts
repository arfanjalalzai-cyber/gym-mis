import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import {
  useInventoryStore,
  type CategoryFilter,
  type ItemTypeFilter,
  type MachineStatusFilter,
} from "../stores/useInventoryStore";
import type { EquipmentListParams } from "../types/equipment";

const VALID_ITEM_TYPES: ItemTypeFilter[] = ["all", "machine", "accessory", "consumable"];
const VALID_CATEGORIES: CategoryFilter[] = [
  "all",
  "cardio",
  "strength",
  "free_weight",
  "functional",
  "recovery",
  "hygiene",
  "nutrition",
  "other",
];
const VALID_MACHINE_STATUS: MachineStatusFilter[] = [
  "all",
  "operational",
  "in_use",
  "maintenance",
  "out_of_order",
  "retired",
];
const VALID_ORDERING = new Set<EquipmentListParams["ordering"]>([
  "created_at",
  "-created_at",
  "name",
  "-name",
  "quantity_on_hand",
  "-quantity_on_hand",
  "quantity_in_service",
  "-quantity_in_service",
]);

const parseIntOrDefault = (value: string | null, defaultValue: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
};

const parseBoolean = (value: string | null) => {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

export const useEquipmentFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    search,
    itemType,
    category,
    machineStatus,
    lowStockOnly,
    page,
    page_size,
    ordering,
    setSearch,
    setItemType,
    setCategory,
    setMachineStatus,
    setLowStockOnly,
    setPage,
    setPageSize,
    setOrdering,
  } = useInventoryStore();

  useEffect(() => {
    const urlSearch = searchParams.get("search") ?? "";
    const urlItemType = searchParams.get("item_type") ?? "all";
    const urlCategory = searchParams.get("category") ?? "all";
    const urlMachineStatus = searchParams.get("machine_status") ?? "all";
    const urlLowStock = parseBoolean(searchParams.get("low_stock"));
    const urlPage = parseIntOrDefault(searchParams.get("page"), 1);
    const urlPageSize = parseIntOrDefault(searchParams.get("page_size"), 25);
    const urlOrdering = searchParams.get("ordering") as EquipmentListParams["ordering"] | null;

    const normalizedItemType = VALID_ITEM_TYPES.includes(urlItemType as ItemTypeFilter)
      ? (urlItemType as ItemTypeFilter)
      : "all";
    const normalizedCategory = VALID_CATEGORIES.includes(urlCategory as CategoryFilter)
      ? (urlCategory as CategoryFilter)
      : "all";
    const normalizedMachineStatus = VALID_MACHINE_STATUS.includes(
      urlMachineStatus as MachineStatusFilter
    )
      ? (urlMachineStatus as MachineStatusFilter)
      : "all";
    const normalizedOrdering =
      urlOrdering && VALID_ORDERING.has(urlOrdering) ? urlOrdering : "-created_at";

    if (search !== urlSearch) setSearch(urlSearch);
    if (itemType !== normalizedItemType) setItemType(normalizedItemType);
    if (category !== normalizedCategory) setCategory(normalizedCategory);
    if (machineStatus !== normalizedMachineStatus) setMachineStatus(normalizedMachineStatus);
    if (lowStockOnly !== urlLowStock) setLowStockOnly(urlLowStock);
    if (page !== urlPage) setPage(urlPage);
    if (page_size !== urlPageSize) setPageSize(urlPageSize);
    if (ordering !== normalizedOrdering) setOrdering(normalizedOrdering);
  }, [
    category,
    itemType,
    lowStockOnly,
    machineStatus,
    ordering,
    page,
    page_size,
    search,
    searchParams,
    setCategory,
    setItemType,
    setLowStockOnly,
    setMachineStatus,
    setOrdering,
    setPage,
    setPageSize,
    setSearch,
  ]);

  const updateSearch = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value.trim()) {
          next.set("search", value.trim());
        } else {
          next.delete("search");
        }
        next.set("page", "1");
        return next;
      });
    },
    [setPage, setSearch, setSearchParams]
  );

  const updateItemType = useCallback(
    (value: ItemTypeFilter) => {
      setItemType(value);
      setPage(1);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value === "all") {
          next.delete("item_type");
        } else {
          next.set("item_type", value);
        }
        next.set("page", "1");
        return next;
      });
    },
    [setItemType, setPage, setSearchParams]
  );

  const updateCategory = useCallback(
    (value: CategoryFilter) => {
      setCategory(value);
      setPage(1);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value === "all") {
          next.delete("category");
        } else {
          next.set("category", value);
        }
        next.set("page", "1");
        return next;
      });
    },
    [setCategory, setPage, setSearchParams]
  );

  const updateMachineStatus = useCallback(
    (value: MachineStatusFilter) => {
      setMachineStatus(value);
      setPage(1);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value === "all") {
          next.delete("machine_status");
        } else {
          next.set("machine_status", value);
        }
        next.set("page", "1");
        return next;
      });
    },
    [setMachineStatus, setPage, setSearchParams]
  );

  const updateLowStockOnly = useCallback(
    (value: boolean) => {
      setLowStockOnly(value);
      setPage(1);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set("low_stock", "true");
        } else {
          next.delete("low_stock");
        }
        next.set("page", "1");
        return next;
      });
    },
    [setLowStockOnly, setPage, setSearchParams]
  );

  const updatePage = useCallback(
    (value: number) => {
      setPage(value);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("page", String(value));
        return next;
      });
    },
    [setPage, setSearchParams]
  );

  const listParams: EquipmentListParams = {
    page,
    page_size,
    search: search || undefined,
    item_type: itemType === "all" ? undefined : itemType,
    category: category === "all" ? undefined : category,
    machine_status: machineStatus === "all" ? undefined : machineStatus,
    low_stock: lowStockOnly ? true : undefined,
    ordering,
  };

  return {
    search,
    itemType,
    category,
    machineStatus,
    lowStockOnly,
    page,
    page_size,
    ordering,
    listParams,
    updateSearch,
    updateItemType,
    updateCategory,
    updateMachineStatus,
    updateLowStockOnly,
    updatePage,
  };
};

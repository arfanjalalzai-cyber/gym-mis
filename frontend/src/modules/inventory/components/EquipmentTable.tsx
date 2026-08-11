import { DataTable, type Column } from "@/components/ui";
import LowStockBadge from "./LowStockBadge";
import MachineStatusBadge from "./MachineStatusBadge";
import type { EquipmentListItem } from "../types/equipment";

interface EquipmentTableProps {
  equipments: EquipmentListItem[];
  loading?: boolean;
  onRowClick: (equipment: EquipmentListItem) => void;
}

const formatCategory = (category: string) =>
  category
    .split("_")
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
    .join(" ");

const formatItemType = (itemType: string) =>
  `${itemType[0]?.toUpperCase() ?? ""}${itemType.slice(1)}`;

export default function EquipmentTable({
  equipments,
  loading = false,
  onRowClick,
}: EquipmentTableProps) {
  const columns: Column<EquipmentListItem>[] = [
    {
      key: "equipment_code",
      label: "Code",
      header: "Code",
      sortable: true,
    },
    {
      key: "name",
      label: "Name",
      header: "Name",
      sortable: true,
    },
    {
      key: "item_type",
      label: "Type",
      header: "Type",
      render: (row) => formatItemType(row.item_type),
    },
    {
      key: "category",
      label: "Category",
      header: "Category",
      render: (row) => formatCategory(row.category),
    },
    {
      key: "quantity_on_hand",
      label: "On Hand",
      header: "On Hand",
      sortable: true,
    },
    {
      key: "quantity_in_service",
      label: "In Service",
      header: "In Service",
      sortable: true,
    },
    {
      key: "machine_status",
      label: "Status",
      header: "Status",
      render: (row) => <MachineStatusBadge status={row.machine_status} />,
    },
    {
      key: "is_low_stock",
      label: "Low Stock",
      header: "Low Stock",
      render: (row) => <LowStockBadge isLowStock={row.is_low_stock} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={equipments}
      loading={loading}
      pagination={false}
      emptyMessage="No equipment found"
      onRowClick={onRowClick}
      getRowKey={(equipment) => equipment.id}
    />
  );
}

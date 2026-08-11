import { Badge, DataTable, type Column } from "@/components/ui";
import { formatLocalDateTime } from "@/utils/formatLocalDateTime";
import type { EquipmentHistoryEntry } from "../types/equipment";

interface EquipmentHistoryTableProps {
  entries: EquipmentHistoryEntry[];
  loading?: boolean;
}

const eventVariant: Record<
  EquipmentHistoryEntry["event_type"],
  "primary" | "info" | "warning" | "danger" | "success" | "default"
> = {
  created: "success",
  updated: "primary",
  quantity_adjusted: "info",
  status_changed: "warning",
  deleted: "danger",
  restored: "success",
};

const eventLabel: Record<EquipmentHistoryEntry["event_type"], string> = {
  created: "Created",
  updated: "Updated",
  quantity_adjusted: "Quantity Adjusted",
  status_changed: "Status Changed",
  deleted: "Deleted",
  restored: "Restored",
};

export default function EquipmentHistoryTable({
  entries,
  loading = false,
}: EquipmentHistoryTableProps) {
  const columns: Column<EquipmentHistoryEntry>[] = [
    {
      key: "created_at",
      label: "Date",
      header: "Date",
      render: (row) => formatLocalDateTime(row.created_at),
    },
    {
      key: "event_type",
      label: "Event",
      header: "Event",
      render: (row) => <Badge variant={eventVariant[row.event_type]}>{eventLabel[row.event_type]}</Badge>,
    },
    {
      key: "event_source",
      label: "Source",
      header: "Source",
      render: (row) => row.event_source.replace(/_/g, " "),
    },
    {
      key: "quantity_on_hand_delta",
      label: "On Hand Delta",
      header: "On Hand Delta",
      render: (row) =>
        row.quantity_on_hand_delta == null
          ? "-"
          : `${row.quantity_on_hand_delta > 0 ? "+" : ""}${row.quantity_on_hand_delta}`,
    },
    {
      key: "quantity_in_service_delta",
      label: "In Service Delta",
      header: "In Service Delta",
      render: (row) =>
        row.quantity_in_service_delta == null
          ? "-"
          : `${row.quantity_in_service_delta > 0 ? "+" : ""}${row.quantity_in_service_delta}`,
    },
    {
      key: "performed_by_name",
      label: "User",
      header: "User",
      render: (row) => row.performed_by_name ?? "System",
    },
    {
      key: "note",
      label: "Note",
      header: "Note",
      render: (row) => row.note || "-",
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={entries}
      loading={loading}
      pagination={false}
      emptyMessage="No history entries found"
      getRowKey={(entry) => entry.id}
    />
  );
}

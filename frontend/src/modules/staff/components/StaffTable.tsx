import { DataTable, type Column } from "@/components/ui";
import { useSystemPreferenceFormatters } from "@/modules/settings/hooks";
import StaffEmploymentStatusBadge from "./StaffEmploymentStatusBadge";
import StaffSalaryStatusBadge from "./StaffSalaryStatusBadge";
import type { StaffListItem } from "../types/staff";

interface StaffTableProps {
  staff: StaffListItem[];
  loading?: boolean;
  onRowClick: (staff: StaffListItem) => void;
}

const getPositionLabel = (item: StaffListItem) => {
  if (item.position === "other" && item.position_other) {
    return item.position_other;
  }
  return item.position.charAt(0).toUpperCase() + item.position.slice(1);
};

export default function StaffTable({ staff, loading = false, onRowClick }: StaffTableProps) {
  const { formatDate } = useSystemPreferenceFormatters();
  const columns: Column<StaffListItem>[] = [
    {
      key: "staff_code",
      label: "Staff Code",
      header: "Code",
      sortable: true,
    },
    {
      key: "full_name",
      label: "Full Name",
      header: "Full Name",
      render: (row) => `${row.first_name} ${row.last_name}`,
    },
    {
      key: "position",
      label: "Position",
      header: "Position",
      render: (row) => getPositionLabel(row),
    },
    {
      key: "mobile_number",
      label: "Mobile",
      header: "Mobile",
    },
    {
      key: "address",
      label: "Address",
      header: "Address",
      render: (row) => row.address || "-",
    },
    {
      key: "date_hired",
      label: "Date Hired",
      header: "Date Hired",
      sortable: true,
      render: (row) => formatDate(row.date_hired),
    },
    {
      key: "employment_status",
      label: "Employment Status",
      header: "Employment",
      render: (row) => <StaffEmploymentStatusBadge status={row.employment_status} />,
    },
    {
      key: "salary_status",
      label: "Salary Status",
      header: "Salary",
      render: (row) => <StaffSalaryStatusBadge status={row.salary_status} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={staff}
      loading={loading}
      pagination={false}
      emptyMessage="No staff found"
      onRowClick={onRowClick}
      getRowKey={(item) => item.id}
    />
  );
}

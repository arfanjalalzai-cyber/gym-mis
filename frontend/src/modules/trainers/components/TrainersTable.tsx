import { DataTable, type Column } from "@/components/ui";
import { useSystemPreferenceFormatters } from "@/modules/settings/hooks";
import TrainerEmploymentStatusBadge from "./TrainerEmploymentStatusBadge";
import TrainerSalaryStatusBadge from "./TrainerSalaryStatusBadge";
import type { TrainerListItem } from "../types/trainer";

interface TrainersTableProps {
  trainers: TrainerListItem[];
  loading?: boolean;
  onRowClick: (trainer: TrainerListItem) => void;
}

export default function TrainersTable({
  trainers,
  loading = false,
  onRowClick,
}: TrainersTableProps) {
  const { formatDate } = useSystemPreferenceFormatters();
  const columns: Column<TrainerListItem>[] = [
    {
      key: "trainer_code",
      label: "Trainer Code",
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
      key: "mobile_number",
      label: "Mobile",
      header: "Mobile",
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
      render: (row) => <TrainerEmploymentStatusBadge status={row.employment_status} />,
    },
    {
      key: "salary_status",
      label: "Salary Status",
      header: "Salary",
      render: (row) => <TrainerSalaryStatusBadge status={row.salary_status} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={trainers}
      loading={loading}
      pagination={false}
      emptyMessage="No trainers found"
      onRowClick={onRowClick}
      getRowKey={(trainer) => trainer.id}
    />
  );
}

import { DataTable, type Column } from "@/components/ui";
import { useSystemPreferenceFormatters } from "@/modules/settings/hooks";
import MemberStatusBadge from "./MemberStatusBadge";
import type { MemberListItem } from "../types/member";

interface MembersTableProps {
  members: MemberListItem[];
  loading?: boolean;
  onRowClick: (member: MemberListItem) => void;
}

export default function MembersTable({
  members,
  loading = false,
  onRowClick,
}: MembersTableProps) {
  const { formatDate } = useSystemPreferenceFormatters();
  const columns: Column<MemberListItem>[] = [
    {
      key: "member_code",
      label: "Member Code",
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
      key: "phone",
      label: "Phone",
      header: "Phone",
    },
    {
      key: "address",
      label: "Address",
      header: "Address",
      render: (row) => row.address || "-",
    },
    {
      key: "membership_plan_name",
      label: "Plan",
      header: "Plan",
      render: (row) => row.membership_plan_name || "-",
    },
    {
      key: "join_date",
      label: "Join Date",
      header: "Join Date",
      sortable: true,
      render: (row) => formatDate(row.join_date),
    },
    {
      key: "status",
      label: "Status",
      header: "Status",
      render: (row) => <MemberStatusBadge status={row.status} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={members}
      loading={loading}
      pagination={false}
      emptyMessage="No members found"
      onRowClick={onRowClick}
      getRowKey={(member) => member.id}
    />
  );
}

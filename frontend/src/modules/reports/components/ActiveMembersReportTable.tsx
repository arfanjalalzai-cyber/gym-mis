import { type ReactNode, useMemo } from "react";

import {
  Card,
  CardContent,
  DataTable,
  Input,
  Pagination,
  PaginationInfo,
  type Column,
} from "@/components/ui";
import { useSystemPreferenceFormatters } from "@/modules/settings/hooks";
import type { ActiveMemberReportItem } from "../types/reports";

interface ActiveMembersReportTableProps {
  rows: ActiveMemberReportItem[];
  loading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  actions?: ReactNode;
}

export default function ActiveMembersReportTable({
  rows,
  loading = false,
  search,
  onSearchChange,
  page,
  pageSize,
  totalItems,
  onPageChange,
  actions,
}: ActiveMembersReportTableProps) {
  const { formatDate } = useSystemPreferenceFormatters();
  const columns = useMemo<Column<ActiveMemberReportItem>[]>(
    () => [
      {
        key: "member_code",
        header: "Member Code",
        label: "Member Code",
      },
      {
        key: "member_name",
        header: "Member Name",
        label: "Member Name",
      },
      {
        key: "membership_plan",
        header: "Membership Plan",
        label: "Membership Plan",
      },
      {
        key: "membership_expiry_date",
        header: "Expiry Date",
        label: "Expiry Date",
        render: (row) => (row.membership_expiry_date ? formatDate(row.membership_expiry_date) : "--"),
      },
    ],
    [formatDate]
  );

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-base font-semibold text-text-primary">Active Members Report</h3>
            {actions}
          </div>
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by member code or name"
            className="max-w-sm"
            fullWidth={false}
          />
        </div>
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          pagination={false}
          emptyMessage="No active members found."
          getRowKey={(row) => row.member_id}
        />
        <div className="flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
          <PaginationInfo currentPage={page} pageSize={pageSize} totalItems={totalItems} />
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      </CardContent>
    </Card>
  );
}

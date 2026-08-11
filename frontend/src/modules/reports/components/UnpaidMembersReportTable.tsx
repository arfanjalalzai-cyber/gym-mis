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
import type { UnpaidMemberReportItem } from "../types/reports";

interface UnpaidMembersReportTableProps {
  rows: UnpaidMemberReportItem[];
  loading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  actions?: ReactNode;
}

const formatMoney = (value: string) => `AFN ${Number(value).toLocaleString()}`;

const formatMonth = (value: string | null) => {
  if (!value) return "--";
  return value.slice(0, 7);
};

export default function UnpaidMembersReportTable({
  rows,
  loading = false,
  search,
  onSearchChange,
  page,
  pageSize,
  totalItems,
  onPageChange,
  actions,
}: UnpaidMembersReportTableProps) {
  const columns = useMemo<Column<UnpaidMemberReportItem>[]>(
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
        key: "remaining_balance",
        header: "Remaining Balance",
        label: "Remaining Balance",
        render: (row) => formatMoney(row.remaining_balance),
      },
      {
        key: "outstanding_cycles_count",
        header: "Outstanding Cycles",
        label: "Outstanding Cycles",
      },
      {
        key: "oldest_unpaid_cycle_month",
        header: "Oldest Unpaid Cycle",
        label: "Oldest Unpaid Cycle",
        render: (row) => formatMonth(row.oldest_unpaid_cycle_month),
      },
    ],
    []
  );

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-base font-semibold text-text-primary">Unpaid Members Report</h3>
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
          emptyMessage="No unpaid active members found."
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

import { type ReactNode, useMemo } from "react";

import {
  Card,
  CardContent,
  DataTable,
  Pagination,
  PaginationInfo,
  type Column,
} from "@/components/ui";
import { useSystemPreferenceFormatters } from "@/modules/settings/hooks";
import type { PaymentHistoryReportItem } from "../types/reports";

interface PaymentHistoryReportTableProps {
  rows: PaymentHistoryReportItem[];
  loading?: boolean;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  actions?: ReactNode;
}

const formatMoney = (value: string) => `AFN ${Number(value).toLocaleString()}`;

const formatMethod = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export default function PaymentHistoryReportTable({
  rows,
  loading = false,
  page,
  pageSize,
  totalItems,
  onPageChange,
  actions,
}: PaymentHistoryReportTableProps) {
  const { formatDateTime } = useSystemPreferenceFormatters();
  const columns = useMemo<Column<PaymentHistoryReportItem>[]>(
    () => [
      {
        key: "member_name",
        header: "Member Name",
        label: "Member Name",
      },
      {
        key: "amount",
        header: "Amount",
        label: "Amount",
        render: (row) => (
          <span className={row.is_reversal ? "text-warning" : ""}>
            {formatMoney(row.amount)}
          </span>
        ),
      },
      {
        key: "paid_at",
        header: "Date",
        label: "Date",
        render: (row) => formatDateTime(row.paid_at),
      },
      {
        key: "payment_method",
        header: "Payment Method",
        label: "Payment Method",
        render: (row) => formatMethod(row.payment_method),
      },
      {
        key: "is_reversal",
        header: "Type",
        label: "Type",
        render: (row) => (row.is_reversal ? "Reversal" : "Payment"),
      },
    ],
    [formatDateTime]
  );

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-text-primary">Payment History Report</h3>
          {actions}
        </div>
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          pagination={false}
          emptyMessage="No payment records found."
          getRowKey={(row) => row.payment_id}
        />
        <div className="flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
          <PaginationInfo currentPage={page} pageSize={pageSize} totalItems={totalItems} />
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      </CardContent>
    </Card>
  );
}

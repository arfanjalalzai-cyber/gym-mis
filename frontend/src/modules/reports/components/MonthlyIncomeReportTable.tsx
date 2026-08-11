import { type ReactNode, useMemo } from "react";

import { Card, CardContent, DataTable, type Column } from "@/components/ui";
import type { MonthlyIncomeReportRow } from "../types/reports";

interface MonthlyIncomeReportTableProps {
  rows: MonthlyIncomeReportRow[];
  loading?: boolean;
  actions?: ReactNode;
}

const formatMoney = (value: string) => `AFN ${Number(value).toLocaleString()}`;

export default function MonthlyIncomeReportTable({
  rows,
  loading = false,
  actions,
}: MonthlyIncomeReportTableProps) {
  const columns = useMemo<Column<MonthlyIncomeReportRow>[]>(
    () => [
      {
        key: "month",
        header: "Month",
        label: "Month",
      },
      {
        key: "gross_received",
        header: "Gross Received",
        label: "Gross Received",
        render: (row) => formatMoney(row.gross_received),
      },
      {
        key: "reversals",
        header: "Reversals",
        label: "Reversals",
        render: (row) => (
          <span className="text-warning">{formatMoney(row.reversals)}</span>
        ),
      },
      {
        key: "net_received",
        header: "Net Received",
        label: "Net Received",
        render: (row) => formatMoney(row.net_received),
      },
      {
        key: "payment_count",
        header: "Payments",
        label: "Payments",
      },
    ],
    []
  );

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-text-primary">Monthly Income Report</h3>
          {actions}
        </div>
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          pagination={false}
          emptyMessage="No monthly income data found."
          getRowKey={(row) => row.month}
        />
      </CardContent>
    </Card>
  );
}

import { useMemo } from "react";

import { Button, Card, CardContent, DataTable, type Column } from "@/components/ui";
import { useSystemPreferenceFormatters } from "@/modules/settings/hooks";
import type { MemberFeePayment, StaffSalaryPayment } from "../types/payments";

interface PaymentHistoryTableProps {
  mode: "member" | "staff";
  memberPayments?: MemberFeePayment[];
  staffPayments?: StaffSalaryPayment[];
  loading?: boolean;
  onReverse?: (paymentId: number) => void;
  reversingId?: number | null;
}

interface PaymentHistoryRow {
  id: number;
  code: string;
  name: string;
  period: string;
  amount: string;
  discount: string;
  method: string;
  paid_at: string;
  is_reversal: boolean;
  note: string;
}

const formatMoney = (value: string) => Number(value).toLocaleString();

export default function PaymentHistoryTable({
  mode,
  memberPayments = [],
  staffPayments = [],
  loading = false,
  onReverse,
  reversingId = null,
}: PaymentHistoryTableProps) {
  const { formatDate, formatDateTime } = useSystemPreferenceFormatters();
  const rows = useMemo<PaymentHistoryRow[]>(() => {
    if (mode === "member") {
      return memberPayments.map((payment) => ({
        id: payment.id,
        code: payment.member_code,
        name: payment.member_name,
        period: formatDate(payment.cycle_month),
        amount: payment.amount_paid,
        discount: payment.discount_amount,
        method: payment.payment_method,
        paid_at: payment.paid_at,
        is_reversal: payment.is_reversal,
        note: payment.note ?? "",
      }));
    }

    return staffPayments.map((payment) => ({
      id: payment.id,
      code: payment.staff_code,
      name: payment.staff_name,
      period: formatDate(payment.period_month),
      amount: payment.amount_paid,
      discount: "0.00",
      method: payment.payment_method,
      paid_at: payment.paid_at,
      is_reversal: payment.is_reversal,
      note: payment.note ?? "",
    }));
  }, [formatDate, memberPayments, mode, staffPayments]);

  const columns = useMemo<Column<PaymentHistoryRow>[]>(() => {
    const base: Column<PaymentHistoryRow>[] = [
      { key: "code", header: mode === "member" ? "Member Code" : "Staff Code", label: "Code" },
      { key: "name", header: mode === "member" ? "Member" : "Staff", label: "Name" },
      { key: "period", header: mode === "member" ? "Cycle Month" : "Period Month", label: "Period" },
      {
        key: "amount",
        header: "Amount",
        label: "Amount",
        render: (row) => `AFN ${formatMoney(row.amount)}`,
      },
    ];

    if (mode === "member") {
      base.push({
        key: "discount",
        header: "Discount",
        label: "Discount",
        render: (row) => `AFN ${formatMoney(row.discount)}`,
      });
    }

    base.push(
      { key: "method", header: "Method", label: "Method" },
      {
        key: "paid_at",
        header: "Paid At",
        label: "Paid At",
        render: (row) => formatDateTime(row.paid_at),
      },
      {
        key: "note",
        header: "Note",
        label: "Note",
        render: (row) => row.note || "--",
      },
      {
        key: "action",
        header: "Action",
        label: "Action",
        render: (row) =>
          row.is_reversal ? (
            <span className="text-xs font-medium text-warning">Reversal</span>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              loading={reversingId === row.id}
              onClick={() => onReverse?.(row.id)}
              disabled={!onReverse}
            >
              Reverse
            </Button>
          ),
      }
    );

    return base;
  }, [mode, onReverse, reversingId]);

  return (
    <Card>
      <CardContent className="space-y-4">
        <h3 className="text-base font-semibold text-text-primary">Payment History</h3>
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          pagination={false}
          emptyMessage="No payment history available."
          getRowKey={(row) => row.id}
        />
      </CardContent>
    </Card>
  );
}

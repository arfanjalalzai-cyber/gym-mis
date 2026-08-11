import type { BillPaymentStatus } from "../types/billing";

interface BillStatusBadgeProps {
  status: BillPaymentStatus;
}

const styleByStatus: Record<BillPaymentStatus, string> = {
  paid: "bg-success/15 text-success",
  partial: "bg-warning/15 text-warning",
  unpaid: "bg-error/15 text-error",
};

const labelByStatus: Record<BillPaymentStatus, string> = {
  paid: "Paid",
  partial: "Partial",
  unpaid: "Unpaid",
};

export default function BillStatusBadge({ status }: BillStatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styleByStatus[status]}`}>
      {labelByStatus[status]}
    </span>
  );
}


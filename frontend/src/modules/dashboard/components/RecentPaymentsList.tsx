import { Card, CardContent, SkeletonTable } from "@/components/ui";
import { useSystemPreferenceFormatters } from "@/modules/settings/hooks";
import type { RecentPayment } from "../types/dashboard";

interface RecentPaymentsListProps {
  rows: RecentPayment[];
  loading?: boolean;
  currency?: string;
}

const formatMoney = (value: string, currency = "AFN") =>
  `${currency} ${Number(value).toLocaleString()}`;

const formatMethod = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export default function RecentPaymentsList({
  rows,
  loading = false,
  currency = "AFN",
}: RecentPaymentsListProps) {
  const { formatDateTime } = useSystemPreferenceFormatters();
  return (
    <Card>
      <CardContent className="space-y-4">
        <h3 className="text-base font-semibold text-text-primary">Recent Payments</h3>
        {loading ? (
          <SkeletonTable rows={4} />
        ) : rows.length === 0 ? (
          <p className="text-sm text-text-secondary">No recent payments.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="px-2 py-2 font-medium">Member</th>
                  <th className="px-2 py-2 font-medium">Amount</th>
                  <th className="px-2 py-2 font-medium">Method</th>
                  <th className="px-2 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.payment_id} className="border-b border-border/60 last:border-b-0">
                    <td className="px-2 py-2 text-text-primary">{row.member_name}</td>
                    <td
                      className={`px-2 py-2 ${
                        row.is_reversal ? "text-warning" : "text-text-primary"
                      }`}
                    >
                      {formatMoney(row.amount, currency)}
                    </td>
                    <td className="px-2 py-2 text-text-secondary">
                      {formatMethod(row.payment_method)}
                    </td>
                    <td className="px-2 py-2 text-text-secondary">
                      {formatDateTime(row.paid_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

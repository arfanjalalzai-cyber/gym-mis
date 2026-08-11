import { Card, CardContent } from "@/components/ui";
import { useSystemPreferenceFormatters } from "@/modules/settings/hooks";
import type { StaffSalarySummary } from "../types/payments";

interface SalaryOutstandingCardProps {
  summary?: StaffSalarySummary;
  loading?: boolean;
}

const formatMoney = (value?: string) => Number(value ?? "0").toLocaleString();

export default function SalaryOutstandingCard({
  summary,
  loading = false,
}: SalaryOutstandingCardProps) {
  const { formatDate } = useSystemPreferenceFormatters();
  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-text-secondary">Loading salary summary...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-5 py-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-secondary">Period</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">
              {summary?.period_month ? formatDate(summary.period_month) : "--"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-secondary">Remaining Salary</p>
            <p className="mt-1 text-xl font-semibold text-warning">
              AFN {formatMoney(summary?.remaining_amount)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-secondary">Total Outstanding</p>
            <p className="mt-1 text-xl font-semibold text-warning">
              AFN {formatMoney(summary?.total_outstanding)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-secondary">Overdue Periods</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">
              {summary?.overdue_periods_count ?? 0}
            </p>
          </div>
        </div>
        {summary?.outstanding_periods?.length ? (
          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs uppercase tracking-wide text-text-secondary">Outstanding Months</p>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {summary.outstanding_periods.map((period) => (
                <div
                  key={period.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="font-medium text-text-primary">{formatDate(period.period_month)}</span>
                  <span className="text-warning">AFN {formatMoney(period.remaining_amount)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

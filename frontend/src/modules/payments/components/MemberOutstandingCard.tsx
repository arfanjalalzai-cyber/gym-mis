import { Card, CardContent } from "@/components/ui";
import { useSystemPreferenceFormatters } from "@/modules/settings/hooks";
import type { MemberFeeCycleSummary } from "../types/payments";

interface MemberOutstandingCardProps {
  summary?: MemberFeeCycleSummary;
  loading?: boolean;
}

const formatMoney = (value?: string) => Number(value ?? "0").toLocaleString();

export default function MemberOutstandingCard({
  summary,
  loading = false,
}: MemberOutstandingCardProps) {
  const { formatDate } = useSystemPreferenceFormatters();
  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-text-secondary">Loading member fee summary...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-5 py-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-secondary">Current Cycle Remaining</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">
              AFN {formatMoney(summary?.current_cycle_remaining)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-secondary">Total Outstanding</p>
            <p className="mt-1 text-xl font-semibold text-warning">
              AFN {formatMoney(summary?.total_outstanding)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-secondary">Overdue Cycles</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">
              {summary?.overdue_cycles_count ?? 0}
            </p>
          </div>
        </div>
        {summary?.outstanding_cycles?.length ? (
          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs uppercase tracking-wide text-text-secondary">Outstanding Months</p>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {summary.outstanding_cycles.map((cycle) => (
                <div
                  key={cycle.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="font-medium text-text-primary">{formatDate(cycle.cycle_month)}</span>
                  <span className="text-warning">AFN {formatMoney(cycle.remaining_amount)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

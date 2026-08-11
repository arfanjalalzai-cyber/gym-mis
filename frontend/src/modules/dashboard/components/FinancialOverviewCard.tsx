import { Card, CardContent, Skeleton } from "@/components/ui";
import type { DashboardFinancialOverview } from "../types/dashboard";

interface FinancialOverviewCardProps {
  data?: DashboardFinancialOverview;
  loading?: boolean;
  currency?: string;
}

const formatMoney = (value?: string, currency = "AFN") =>
  `${currency} ${Number(value ?? "0").toLocaleString()}`;

export default function FinancialOverviewCard({
  data,
  loading = false,
  currency = "AFN",
}: FinancialOverviewCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-4">
          <Skeleton width="45%" height={18} />
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} height={16} />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <h3 className="text-base font-semibold text-text-primary">Financial Overview</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-surface p-3">
            <span className="text-sm text-text-secondary">Today Income</span>
            <span className="text-sm font-semibold text-text-primary">
              {formatMoney(data?.today_income, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-surface p-3">
            <span className="text-sm text-text-secondary">Monthly Income</span>
            <span className="text-sm font-semibold text-text-primary">
              {formatMoney(data?.monthly_income, currency)}
            </span>
          </div>
          <div className="rounded-lg border border-warning/40 bg-warning-soft p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Pending Payments</span>
              <span className="text-sm font-semibold text-warning">
                {formatMoney(data?.pending_payments.total_amount, currency)}
              </span>
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              {data?.pending_payments.member_count ?? 0} member(s) with due balance.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

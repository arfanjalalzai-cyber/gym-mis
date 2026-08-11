import { Card, CardContent } from "@/components/ui";
import { useExpensePeriodSummary } from "@/modules/reports/queries/useReports";
import type { ExpensePeriodSummaryItem } from "@/modules/reports/types/reports";
import { useSystemPreferenceFormatters } from "@/modules/settings/hooks";

const formatMoney = (value?: string, currency = "AFN") =>
  `${currency} ${Number(value ?? "0").toLocaleString()}`;

function ExpenseSummaryCard({
  title,
  summary,
  loading,
  currency,
  formatDate,
}: {
  title: string;
  summary?: ExpensePeriodSummaryItem;
  loading?: boolean;
  currency?: string;
  formatDate: (value: string | null | undefined) => string;
}) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
          <p className="mt-1 text-sm text-text-secondary">
            {summary ? `${formatDate(summary.date_from)} - ${formatDate(summary.date_to)}` : "-"}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-xs font-medium text-text-secondary">Expense</p>
            <p className="mt-1 text-lg font-semibold text-text-primary">
              {loading ? "Loading..." : formatMoney(summary?.expense, currency)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-xs font-medium text-text-secondary">Return</p>
            <p className="mt-1 text-lg font-semibold text-success">
              {loading ? "Loading..." : formatMoney(summary?.return, currency)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-xs font-medium text-text-secondary">Net Expense</p>
            <p className="mt-1 text-lg font-semibold text-primary">
              {loading ? "Loading..." : formatMoney(summary?.net_expense, currency)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardExpenseReports({
  currency = "AFN",
}: {
  currency?: string;
}) {
  const expensePeriodSummaryQuery = useExpensePeriodSummary();
  const { formatDate } = useSystemPreferenceFormatters();

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ExpenseSummaryCard
        title="Daily Expense Report"
        summary={expensePeriodSummaryQuery.data?.daily}
        loading={expensePeriodSummaryQuery.isLoading}
        currency={currency}
        formatDate={formatDate}
      />
      <ExpenseSummaryCard
        title="Weekly Expense Report"
        summary={expensePeriodSummaryQuery.data?.weekly}
        loading={expensePeriodSummaryQuery.isLoading}
        currency={currency}
        formatDate={formatDate}
      />
    </div>
  );
}

import { LayoutDashboard } from "lucide-react";

import { PageHeader } from "@/components";
import { Alert, Card, CardContent } from "@/components/ui";
import { useUserStore } from "@/modules/auth";
import DashboardAlertsPanel from "../components/DashboardAlertsPanel";
import DashboardExpenseReports from "../components/DashboardExpenseReports";
import DashboardStatsGrid from "../components/DashboardStatsGrid";
import ExpenseVsIncomeChart from "../components/ExpenseVsIncomeChart";
import FinancialOverviewCard from "../components/FinancialOverviewCard";
import MemberGrowthChart from "../components/MemberGrowthChart";
import MonthlyIncomeChart from "../components/MonthlyIncomeChart";
import QuickActionsPanel from "../components/QuickActionsPanel";
import RecentMemberRegistrationsList from "../components/RecentMemberRegistrationsList";
import RecentPaymentsList from "../components/RecentPaymentsList";
import RecentStaffAttendanceList from "../components/RecentStaffAttendanceList";
import { useDashboardFilters } from "../hooks/useDashboardFilters";
import {
  useDashboardActivity,
  useDashboardAlerts,
  useDashboardOverview,
} from "../queries/useDashboard";
import type { AllowedMonths } from "../types/dashboard";

const monthOptions: AllowedMonths[] = [6, 12, 24];

export default function DashboardPage() {
  const userProfile = useUserStore((state) => state.userProfile);
  const isSuperAdmin = userProfile?.role === "super_admin";
  const { months, activityLimit, alertsLimit, updateMonths } = useDashboardFilters();
  const overviewQuery = useDashboardOverview(months, !isSuperAdmin);
  const activityQuery = useDashboardActivity(activityLimit, !isSuperAdmin);
  const alertsQuery = useDashboardAlerts(alertsLimit, !isSuperAdmin);

  if (isSuperAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Platform Dashboard" subtitle="Private Super Admin workspace. Gym members, finance, attendance, and operational data are not shown here." />
        <Card><CardContent className="p-6 text-sm text-text-secondary">Use <strong>Super Admin</strong> to create gyms, assign customer accounts, and manage platform access.</CardContent></Card>
      </div>
    );
  }

  const hasError =
    overviewQuery.isError || activityQuery.isError || alertsQuery.isError;

  const currency = overviewQuery.data?.currency ?? "AFN";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of members, finance, activities, analytics, and alerts."
      />

      <Card>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard Time Range
          </div>
          <select
            value={months}
            onChange={(event) => updateMonths(Number(event.target.value) as AllowedMonths)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-48"
          >
            {monthOptions.map((option) => (
              <option key={option} value={option}>
                Last {option} months
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {hasError && (
        <Alert variant="error" title="Dashboard Data Error">
          Some dashboard sections failed to load. Refresh the page to retry.
        </Alert>
      )}

      <DashboardStatsGrid
        data={overviewQuery.data?.key_statistics}
        loading={overviewQuery.isLoading}
        currency={currency}
      />

      <DashboardExpenseReports currency={currency} />

      <div className="grid gap-4 xl:grid-cols-2">
        <FinancialOverviewCard
          data={overviewQuery.data?.financial_overview}
          loading={overviewQuery.isLoading}
          currency={currency}
        />
        <QuickActionsPanel />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <MemberGrowthChart
          data={overviewQuery.data?.charts.member_growth ?? []}
          loading={overviewQuery.isLoading}
        />
        <MonthlyIncomeChart
          data={overviewQuery.data?.charts.monthly_income ?? []}
          loading={overviewQuery.isLoading}
          currency={currency}
        />
      </div>

      <ExpenseVsIncomeChart
        data={overviewQuery.data?.charts.expense_vs_income ?? []}
        loading={overviewQuery.isLoading}
        currency={currency}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <RecentMemberRegistrationsList
          rows={activityQuery.data?.recent_member_registrations ?? []}
          loading={activityQuery.isLoading}
        />
        <RecentPaymentsList
          rows={activityQuery.data?.recent_payments ?? []}
          loading={activityQuery.isLoading}
          currency={currency}
        />
      </div>

      <RecentStaffAttendanceList
        rows={activityQuery.data?.recent_staff_attendance ?? []}
        loading={activityQuery.isLoading}
      />

      <DashboardAlertsPanel
        expiredMembershipAlerts={alertsQuery.data?.expired_membership_alerts ?? []}
        paymentDueAlerts={alertsQuery.data?.payment_due_alerts ?? []}
        expiredMembershipsTotal={alertsQuery.data?.totals.expired_memberships ?? 0}
        paymentDueMembersTotal={alertsQuery.data?.totals.payment_due_members ?? 0}
        loading={alertsQuery.isLoading}
        currency={currency}
      />
    </div>
  );
}

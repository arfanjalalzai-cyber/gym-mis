import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";

import { PageHeader } from "@/components";
import { Card, CardContent } from "@/components/ui";
import { useMembersList } from "@/modules/members/queries/useMembers";
import { useSystemPreferenceFormatters } from "@/modules/settings/hooks";
import ActiveMembersReportTable from "../components/ActiveMembersReportTable";
import ExpenseChart from "../components/ExpenseChart";
import IncomeChart from "../components/IncomeChart";
import MemberGrowthChart from "../components/MemberGrowthChart";
import MonthlyIncomeReportTable from "../components/MonthlyIncomeReportTable";
import PaymentHistoryReportTable from "../components/PaymentHistoryReportTable";
import ReportsFilterBar from "../components/ReportsFilterBar";
import {
  downloadReportsPdf,
  ReportActions,
  ReportsPrintLayout,
  type ReportSection,
} from "../components/ReportsExport";
import UnpaidMembersReportTable from "../components/UnpaidMembersReportTable";
import { useReportsFilters } from "../hooks/useReportsFilters";
import {
  useActiveMembersReport,
  useAnalyticsOverview,
  useMonthlyIncomeReport,
  usePaymentHistoryReport,
  useReportsSummary,
  useUnpaidMembersReport,
} from "../queries/useReports";

const formatMoney = (value?: string) =>
  `AFN ${Number(value ?? "0").toLocaleString()}`;

const formatMethod = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatMonth = (value: string | null) => (value ? value.slice(0, 7) : "--");

const exportFileName = (name: string) =>
  `${name}-${new Date().toISOString().slice(0, 10)}.pdf`;

export default function ReportsDashboardPage() {
  const { formatDate, formatDateTime } = useSystemPreferenceFormatters();
  const {
    months,
    paymentMemberId,
    paymentMethod,
    paymentDateFrom,
    paymentDateTo,
    paymentPage,
    paymentPageSize,
    activeSearch,
    activePage,
    activePageSize,
    unpaidSearch,
    unpaidPage,
    unpaidPageSize,
    paymentHistoryParams,
    activeMembersParams,
    unpaidMembersParams,
    updateMonths,
    updatePaymentMember,
    updatePaymentMethod,
    updatePaymentDateFrom,
    updatePaymentDateTo,
    updatePaymentPage,
    updateActiveSearch,
    updateActivePage,
    updateUnpaidSearch,
    updateUnpaidPage,
  } = useReportsFilters();

  const [activeSearchInput, setActiveSearchInput] = useState(activeSearch);
  const [unpaidSearchInput, setUnpaidSearchInput] = useState(unpaidSearch);
  const allPrintRef = useRef<HTMLDivElement>(null);
  const activePrintRef = useRef<HTMLDivElement>(null);
  const unpaidPrintRef = useRef<HTMLDivElement>(null);
  const paymentPrintRef = useRef<HTMLDivElement>(null);
  const monthlyPrintRef = useRef<HTMLDivElement>(null);
  const incomePrintRef = useRef<HTMLDivElement>(null);
  const expensePrintRef = useRef<HTMLDivElement>(null);
  const growthPrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveSearchInput(activeSearch);
  }, [activeSearch]);

  useEffect(() => {
    setUnpaidSearchInput(unpaidSearch);
  }, [unpaidSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateActiveSearch(activeSearchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [activeSearchInput, updateActiveSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateUnpaidSearch(unpaidSearchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [unpaidSearchInput, updateUnpaidSearch]);

  const { data: membersData } = useMembersList({
    page: 1,
    page_size: 200,
    ordering: "last_name",
    status: "active",
  });
  const memberOptions = useMemo(
    () =>
      (membersData?.results ?? []).map((member) => ({
        id: member.id,
        label: `${member.member_code} - ${member.first_name} ${member.last_name}`,
      })),
    [membersData?.results]
  );

  const summaryQuery = useReportsSummary();
  const activeMembersQuery = useActiveMembersReport(activeMembersParams);
  const unpaidMembersQuery = useUnpaidMembersReport(unpaidMembersParams);
  const paymentHistoryQuery = usePaymentHistoryReport(paymentHistoryParams);
  const monthlyIncomeQuery = useMonthlyIncomeReport(months);
  const analyticsQuery = useAnalyticsOverview(months);
  const activeMembersExportQuery = useActiveMembersReport({
    ...activeMembersParams,
    page: 1,
    page_size: 10000,
  });
  const unpaidMembersExportQuery = useUnpaidMembersReport({
    ...unpaidMembersParams,
    page: 1,
    page_size: 10000,
  });
  const paymentHistoryExportQuery = usePaymentHistoryReport({
    ...paymentHistoryParams,
    page: 1,
    page_size: 10000,
  });

  const activeMembersSection = useMemo<ReportSection>(
    () => ({
      title: "Active Members Report",
      columns: [
        { key: "member_code", label: "Member Code" },
        { key: "member_name", label: "Member Name" },
        { key: "membership_plan", label: "Membership Plan" },
        { key: "membership_expiry_date", label: "Expiry Date" },
      ],
      rows: (activeMembersExportQuery.data?.results ?? []).map((row) => ({
        member_code: row.member_code,
        member_name: row.member_name,
        membership_plan: row.membership_plan,
        membership_expiry_date: formatDate(row.membership_expiry_date),
      })),
    }),
    [activeMembersExportQuery.data?.results, formatDate]
  );

  const unpaidMembersSection = useMemo<ReportSection>(
    () => ({
      title: "Unpaid Members Report",
      columns: [
        { key: "member_code", label: "Member Code" },
        { key: "member_name", label: "Member Name" },
        { key: "remaining_balance", label: "Remaining Balance" },
        { key: "outstanding_cycles_count", label: "Outstanding Cycles" },
        { key: "oldest_unpaid_cycle_month", label: "Oldest Unpaid Cycle" },
      ],
      rows: (unpaidMembersExportQuery.data?.results ?? []).map((row) => ({
        member_code: row.member_code,
        member_name: row.member_name,
        remaining_balance: formatMoney(row.remaining_balance),
        outstanding_cycles_count: row.outstanding_cycles_count,
        oldest_unpaid_cycle_month: row.oldest_unpaid_cycle_month
          ? formatDate(row.oldest_unpaid_cycle_month)
          : formatMonth(row.oldest_unpaid_cycle_month),
      })),
    }),
    [formatDate, unpaidMembersExportQuery.data?.results]
  );

  const paymentHistorySection = useMemo<ReportSection>(
    () => ({
      title: "Payment History Report",
      columns: [
        { key: "member_name", label: "Member Name" },
        { key: "amount", label: "Amount" },
        { key: "paid_at", label: "Date" },
        { key: "payment_method", label: "Payment Method" },
        { key: "type", label: "Type" },
      ],
      rows: (paymentHistoryExportQuery.data?.results ?? []).map((row) => ({
        member_name: row.member_name,
        amount: formatMoney(row.amount),
        paid_at: formatDateTime(row.paid_at),
        payment_method: formatMethod(row.payment_method),
        type: row.is_reversal ? "Reversal" : "Payment",
      })),
    }),
    [formatDateTime, paymentHistoryExportQuery.data?.results]
  );

  const monthlyIncomeSection = useMemo<ReportSection>(
    () => ({
      title: "Monthly Income Report",
      columns: [
        { key: "month", label: "Month" },
        { key: "gross_received", label: "Gross Received" },
        { key: "reversals", label: "Reversals" },
        { key: "net_received", label: "Net Received" },
        { key: "payment_count", label: "Payments" },
      ],
      rows: (monthlyIncomeQuery.data?.results ?? []).map((row) => ({
        month: row.month,
        gross_received: formatMoney(row.gross_received),
        reversals: formatMoney(row.reversals),
        net_received: formatMoney(row.net_received),
        payment_count: row.payment_count,
      })),
    }),
    [monthlyIncomeQuery.data?.results]
  );

  const incomeSection = useMemo<ReportSection>(
    () => ({
      title: "Income Chart Data",
      columns: [
        { key: "month", label: "Month" },
        { key: "value", label: "Income" },
      ],
      rows: (analyticsQuery.data?.income_series ?? []).map((row) => ({
        month: row.month,
        value: formatMoney(row.value),
      })),
    }),
    [analyticsQuery.data?.income_series]
  );

  const expenseSection = useMemo<ReportSection>(
    () => ({
      title: "Expense Chart Data",
      columns: [
        { key: "month", label: "Month" },
        { key: "value", label: "Expense" },
      ],
      rows: (analyticsQuery.data?.expense_series ?? []).map((row) => ({
        month: row.month,
        value: formatMoney(row.value),
      })),
    }),
    [analyticsQuery.data?.expense_series]
  );

  const growthSection = useMemo<ReportSection>(
    () => ({
      title: "Member Growth Chart Data",
      columns: [
        { key: "month", label: "Month" },
        { key: "new_members", label: "New Members" },
        { key: "cumulative_members", label: "Cumulative Members" },
      ],
      rows: (analyticsQuery.data?.member_growth_series ?? []).map((row) => ({
        month: row.month,
        new_members: row.new_members,
        cumulative_members: row.cumulative_members,
      })),
    }),
    [analyticsQuery.data?.member_growth_series]
  );

  const allSections = useMemo(
    () => [
      activeMembersSection,
      unpaidMembersSection,
      paymentHistorySection,
      monthlyIncomeSection,
      incomeSection,
      expenseSection,
      growthSection,
    ],
    [
      activeMembersSection,
      unpaidMembersSection,
      paymentHistorySection,
      monthlyIncomeSection,
      incomeSection,
      expenseSection,
      growthSection,
    ]
  );

  const exportLoading =
    activeMembersExportQuery.isLoading ||
    unpaidMembersExportQuery.isLoading ||
    paymentHistoryExportQuery.isLoading ||
    monthlyIncomeQuery.isLoading ||
    analyticsQuery.isLoading;

  const printAll = useReactToPrint({ contentRef: allPrintRef, documentTitle: "Reports" });
  const printActive = useReactToPrint({ contentRef: activePrintRef, documentTitle: "Active Members Report" });
  const printUnpaid = useReactToPrint({ contentRef: unpaidPrintRef, documentTitle: "Unpaid Members Report" });
  const printPayment = useReactToPrint({ contentRef: paymentPrintRef, documentTitle: "Payment History Report" });
  const printMonthly = useReactToPrint({ contentRef: monthlyPrintRef, documentTitle: "Monthly Income Report" });
  const printIncome = useReactToPrint({ contentRef: incomePrintRef, documentTitle: "Income Chart Data" });
  const printExpense = useReactToPrint({ contentRef: expensePrintRef, documentTitle: "Expense Chart Data" });
  const printGrowth = useReactToPrint({ contentRef: growthPrintRef, documentTitle: "Member Growth Chart Data" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Track expenses, member status, payment history, monthly income and analytics."
        actions={[
          {
            label: "Print All",
            icon: <Printer className="h-4 w-4" />,
            onClick: () => printAll(),
            disabled: exportLoading,
          },
          {
            label: "All PDF",
            icon: <Download className="h-4 w-4" />,
            variant: "outline",
            onClick: () => void downloadReportsPdf("Reports", allSections, exportFileName("reports")),
            disabled: exportLoading,
          },
        ]}
      />

      <ReportsFilterBar
        months={months}
        paymentMemberId={paymentMemberId}
        paymentMethod={paymentMethod}
        paymentDateFrom={paymentDateFrom}
        paymentDateTo={paymentDateTo}
        memberOptions={memberOptions}
        onMonthsChange={updateMonths}
        onPaymentMemberChange={updatePaymentMember}
        onPaymentMethodChange={updatePaymentMethod}
        onPaymentDateFromChange={updatePaymentDateFrom}
        onPaymentDateToChange={updatePaymentDateTo}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-sm text-text-secondary">Net Income ({months} months)</p>
            <p className="mt-2 text-2xl font-bold text-text-primary">
              {formatMoney(monthlyIncomeQuery.data?.summary.net_received)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-text-secondary">Total Unpaid Balance</p>
            <p className="mt-2 text-2xl font-bold text-text-primary">
              {formatMoney(summaryQuery.data?.total_unpaid_balance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-text-secondary">Active Members</p>
            <p className="mt-2 text-2xl font-bold text-text-primary">
              {summaryQuery.data?.active_members_count ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-text-secondary">Current Month Expenses</p>
            <p className="mt-2 text-2xl font-bold text-text-primary">
              {formatMoney(summaryQuery.data?.current_month_expenses)}
            </p>
          </CardContent>
        </Card>
      </div>

      <ActiveMembersReportTable
        rows={activeMembersQuery.data?.results ?? []}
        loading={activeMembersQuery.isLoading}
        search={activeSearchInput}
        onSearchChange={setActiveSearchInput}
        page={activePage}
        pageSize={activePageSize}
        totalItems={activeMembersQuery.data?.count ?? 0}
        onPageChange={updateActivePage}
        actions={
          <ReportActions
            onPrint={() => printActive()}
            onPdf={() =>
              void downloadReportsPdf(
                "Active Members Report",
                [activeMembersSection],
                exportFileName("active-members-report")
              )
            }
            disabled={activeMembersExportQuery.isLoading}
          />
        }
      />

      <UnpaidMembersReportTable
        rows={unpaidMembersQuery.data?.results ?? []}
        loading={unpaidMembersQuery.isLoading}
        search={unpaidSearchInput}
        onSearchChange={setUnpaidSearchInput}
        page={unpaidPage}
        pageSize={unpaidPageSize}
        totalItems={unpaidMembersQuery.data?.count ?? 0}
        onPageChange={updateUnpaidPage}
        actions={
          <ReportActions
            onPrint={() => printUnpaid()}
            onPdf={() =>
              void downloadReportsPdf(
                "Unpaid Members Report",
                [unpaidMembersSection],
                exportFileName("unpaid-members-report")
              )
            }
            disabled={unpaidMembersExportQuery.isLoading}
          />
        }
      />

      <PaymentHistoryReportTable
        rows={paymentHistoryQuery.data?.results ?? []}
        loading={paymentHistoryQuery.isLoading}
        page={paymentPage}
        pageSize={paymentPageSize}
        totalItems={paymentHistoryQuery.data?.count ?? 0}
        onPageChange={updatePaymentPage}
        actions={
          <ReportActions
            onPrint={() => printPayment()}
            onPdf={() =>
              void downloadReportsPdf(
                "Payment History Report",
                [paymentHistorySection],
                exportFileName("payment-history-report")
              )
            }
            disabled={paymentHistoryExportQuery.isLoading}
          />
        }
      />

      <MonthlyIncomeReportTable
        rows={monthlyIncomeQuery.data?.results ?? []}
        loading={monthlyIncomeQuery.isLoading}
        actions={
          <ReportActions
            onPrint={() => printMonthly()}
            onPdf={() =>
              void downloadReportsPdf(
                "Monthly Income Report",
                [monthlyIncomeSection],
                exportFileName("monthly-income-report")
              )
            }
            disabled={monthlyIncomeQuery.isLoading}
          />
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <IncomeChart
          data={analyticsQuery.data?.income_series ?? []}
          actions={
            <ReportActions
              onPrint={() => printIncome()}
              onPdf={() =>
                void downloadReportsPdf(
                  "Income Chart Data",
                  [incomeSection],
                  exportFileName("income-chart-report")
                )
              }
              disabled={analyticsQuery.isLoading}
            />
          }
        />
        <ExpenseChart
          data={analyticsQuery.data?.expense_series ?? []}
          actions={
            <ReportActions
              onPrint={() => printExpense()}
              onPdf={() =>
                void downloadReportsPdf(
                  "Expense Chart Data",
                  [expenseSection],
                  exportFileName("expense-chart-report")
                )
              }
              disabled={analyticsQuery.isLoading}
            />
          }
        />
      </div>
      <MemberGrowthChart
        data={analyticsQuery.data?.member_growth_series ?? []}
        actions={
          <ReportActions
            onPrint={() => printGrowth()}
            onPdf={() =>
              void downloadReportsPdf(
                "Member Growth Chart Data",
                [growthSection],
                exportFileName("member-growth-report")
              )
            }
            disabled={analyticsQuery.isLoading}
          />
        }
      />

      <div className="fixed left-[-10000px] top-0 w-[1100px] bg-white">
        <ReportsPrintLayout ref={allPrintRef} title="Reports" sections={allSections} />
        <ReportsPrintLayout
          ref={activePrintRef}
          title="Active Members Report"
          sections={[activeMembersSection]}
        />
        <ReportsPrintLayout
          ref={unpaidPrintRef}
          title="Unpaid Members Report"
          sections={[unpaidMembersSection]}
        />
        <ReportsPrintLayout
          ref={paymentPrintRef}
          title="Payment History Report"
          sections={[paymentHistorySection]}
        />
        <ReportsPrintLayout
          ref={monthlyPrintRef}
          title="Monthly Income Report"
          sections={[monthlyIncomeSection]}
        />
        <ReportsPrintLayout ref={incomePrintRef} title="Income Chart Data" sections={[incomeSection]} />
        <ReportsPrintLayout ref={expensePrintRef} title="Expense Chart Data" sections={[expenseSection]} />
        <ReportsPrintLayout
          ref={growthPrintRef}
          title="Member Growth Chart Data"
          sections={[growthSection]}
        />
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components";
import { Button, Card, CardContent, Input, Modal, Pagination, PaginationInfo } from "@/components/ui";
import { useMembersList } from "@/modules/members/queries/useMembers";
import { useStaffList } from "@/modules/staff/queries/useStaff";
import MemberFeePaymentForm from "../components/MemberFeePaymentForm";
import MemberOutstandingCard from "../components/MemberOutstandingCard";
import PaymentHistoryTable from "../components/PaymentHistoryTable";
import PaymentsTabs from "../components/PaymentsTabs";
import SalaryOutstandingCard from "../components/SalaryOutstandingCard";
import StaffSalaryPaymentForm from "../components/StaffSalaryPaymentForm";
import { usePaymentFilters } from "../hooks/usePaymentFilters";
import {
  useCreateMemberFeePlan,
  useCreateMemberFeePayment,
  useCreateStaffSalaryPayment,
  useMemberFeePaymentList,
  useMemberFeeSummary,
  useReverseMemberFeePayment,
  useReverseStaffSalaryPayment,
  useStaffSalaryPaymentList,
  useStaffSalarySummary,
  useUpsertStaffSalaryPeriod,
} from "../queries/usePayments";

export default function PaymentsPage() {
  const {
    activeTab,
    selectedMemberId,
    selectedStaffId,
    selectedCycleMonth,
    dateFrom,
    dateTo,
    paymentMethod,
    page,
    page_size,
    memberPaymentParams,
    salaryPaymentParams,
    updateTab,
    updateMember,
    updateStaff,
    updateCycleMonth,
    updateDateFrom,
    updateDateTo,
    updatePaymentMethod,
    updatePage,
  } = usePaymentFilters();

  const [activeStaffPeriodId, setActiveStaffPeriodId] = useState<number | undefined>(undefined);
  const [isFeePlanModalOpen, setIsFeePlanModalOpen] = useState(false);
  const [planCycleFeeAmount, setPlanCycleFeeAmount] = useState("");
  const [planDiscountAmount, setPlanDiscountAmount] = useState("0");
  const [planEffectiveFrom, setPlanEffectiveFrom] = useState(selectedCycleMonth);
  const [planEffectiveTo, setPlanEffectiveTo] = useState("");

  const { data: membersData } = useMembersList({
    page: 1,
    page_size: 200,
    ordering: "last_name",
  });
  const { data: staffData } = useStaffList({
    page: 1,
    page_size: 200,
    ordering: "last_name",
  });

  const memberOptions = useMemo(
    () =>
      (membersData?.results ?? []).map((member) => ({
        id: member.id,
        label: `${member.member_code} - ${member.first_name} ${member.last_name}`,
      })),
    [membersData?.results]
  );

  const staffOptions = useMemo(
    () =>
      (staffData?.results ?? [])
        .filter((staff) => ["active", "on_leave"].includes(staff.employment_status))
        .map((staff) => ({
          id: staff.id,
          label: `${staff.staff_code} - ${staff.first_name} ${staff.last_name}`,
        })),
    [staffData?.results]
  );

  const memberSummaryQuery = useMemberFeeSummary(selectedMemberId ?? undefined);
  const selectedMemberHasFeePlan = memberSummaryQuery.data?.has_fee_plan ?? false;
  const memberTotalOutstanding = Number(
    memberSummaryQuery.data?.total_outstanding ?? "0"
  );
  const showMissingMemberPlanNotice =
    Boolean(selectedMemberId) && memberSummaryQuery.data?.has_fee_plan === false;
  const memberPaymentsQuery = useMemberFeePaymentList(
    memberPaymentParams,
    activeTab === "member_fees" && Boolean(selectedMemberId)
  );
  const staffSummaryQuery = useStaffSalarySummary(
    selectedStaffId ?? undefined,
    selectedCycleMonth
  );
  const staffTotalOutstanding = Number(staffSummaryQuery.data?.total_outstanding ?? "0");
  const staffPaymentsQuery = useStaffSalaryPaymentList(
    salaryPaymentParams,
    activeTab === "staff_salaries" && Boolean(selectedStaffId)
  );

  const { mutateAsync: upsertStaffPeriodAsync } = useUpsertStaffSalaryPeriod();
  const createMemberFeePlan = useCreateMemberFeePlan();
  const createMemberPayment = useCreateMemberFeePayment();
  const createStaffPayment = useCreateStaffSalaryPayment();
  const reverseMemberPayment = useReverseMemberFeePayment();
  const reverseStaffPayment = useReverseStaffSalaryPayment();

  useEffect(() => {
    if (isFeePlanModalOpen) return;
    setPlanCycleFeeAmount("");
    setPlanDiscountAmount("0");
    setPlanEffectiveFrom(selectedCycleMonth);
    setPlanEffectiveTo("");
  }, [isFeePlanModalOpen, selectedCycleMonth, selectedMemberId]);

  useEffect(() => {
    if (!selectedStaffId) {
      setActiveStaffPeriodId(undefined);
      return;
    }
    upsertStaffPeriodAsync({
        staff_id: selectedStaffId,
        period_month: selectedCycleMonth,
      })
      .then((period) => setActiveStaffPeriodId(period.id))
      .catch(() => setActiveStaffPeriodId(undefined));
  }, [selectedCycleMonth, selectedStaffId, upsertStaffPeriodAsync]);

  const totalPages = useMemo(() => {
    const count =
      activeTab === "member_fees"
        ? memberPaymentsQuery.data?.count ?? 0
        : staffPaymentsQuery.data?.count ?? 0;
    if (!count) return 1;
    return Math.max(1, Math.ceil(count / page_size));
  }, [activeTab, memberPaymentsQuery.data?.count, page_size, staffPaymentsQuery.data?.count]);

  const historyFilters = (
    <Card>
      <CardContent className="space-y-4">
        <h3 className="text-base font-semibold text-text-primary">History Filters</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <Input
            type="date"
            label="From Date"
            value={dateFrom}
            onChange={(event) => updateDateFrom(event.target.value)}
          />
          <Input
            type="date"
            label="To Date"
            value={dateTo}
            onChange={(event) => updateDateTo(event.target.value)}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(event) => updatePaymentMethod(event.target.value as typeof paymentMethod)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="online">Online</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const submitMemberFeePlan = async () => {
    if (!selectedMemberId) {
      toast.error("Select a member first.");
      return;
    }

    const cycleFeeAmount = Number(planCycleFeeAmount);
    const discountAmount = Number(planDiscountAmount || "0");

    if (!Number.isFinite(cycleFeeAmount) || cycleFeeAmount <= 0) {
      toast.error("Cycle fee amount must be greater than 0.");
      return;
    }
    if (!Number.isFinite(discountAmount) || discountAmount < 0) {
      toast.error("Default discount amount must be 0 or greater.");
      return;
    }
    if (discountAmount > cycleFeeAmount) {
      toast.error("Default discount amount cannot exceed cycle fee amount.");
      return;
    }
    if (!planEffectiveFrom) {
      toast.error("Effective from date is required.");
      return;
    }
    if (planEffectiveTo && planEffectiveTo < planEffectiveFrom) {
      toast.error("Effective to date cannot be before effective from date.");
      return;
    }

    await createMemberFeePlan.mutateAsync({
      member: selectedMemberId,
      billing_cycle: "monthly",
      cycle_fee_amount: cycleFeeAmount.toFixed(2),
      default_cycle_discount_amount: discountAmount.toFixed(2),
      currency: "AFN",
      effective_from: planEffectiveFrom,
      effective_to: planEffectiveTo || null,
    });
    setIsFeePlanModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        subtitle="Manage member fees, salary disbursements, remaining balances and payment history."
      />

      <PaymentsTabs
        activeTab={activeTab}
        onChange={updateTab}
        memberContent={
          <div className="space-y-4">
            <MemberFeePaymentForm
              memberOptions={memberOptions}
              selectedMemberId={selectedMemberId}
              isSubmitting={createMemberPayment.isPending || memberSummaryQuery.isLoading}
              onMemberChange={updateMember}
              onSubmit={async (values) => {
                if (memberSummaryQuery.isLoading) {
                  toast.error("Member fee information is still loading. Try again in a moment.");
                  return;
                }
                if (!memberSummaryQuery.data) {
                  toast.error("Member fee summary is still loading. Try again in a moment.");
                  return;
                }
                const paymentTotal =
                  Number(values.amount_paid || 0) + Number(values.discount_amount || 0);
                if (selectedMemberHasFeePlan && memberTotalOutstanding <= 0) {
                  toast.error("This member has no outstanding fee balance.");
                  return;
                }
                if (selectedMemberHasFeePlan && paymentTotal > memberTotalOutstanding) {
                  toast.error(
                    `Payment and discount cannot exceed outstanding fee: AFN ${memberTotalOutstanding.toLocaleString()}.`
                  );
                  return;
                }
                await createMemberPayment.mutateAsync(values);
              }}
            />
            {showMissingMemberPlanNotice ? (
              <Card>
                <CardContent className="flex flex-col gap-3 py-4 text-sm text-warning md:flex-row md:items-center md:justify-between">
                  <span>
                    This member has no fee plan yet. Direct payments are allowed, but create a fee plan for automatic monthly remaining balances.
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsFeePlanModalOpen(true)}
                  >
                    Create Fee Plan
                  </Button>
                </CardContent>
              </Card>
            ) : null}
            <MemberOutstandingCard
              summary={memberSummaryQuery.data}
              loading={memberSummaryQuery.isLoading}
            />
            {historyFilters}
            <PaymentHistoryTable
              mode="member"
              memberPayments={memberPaymentsQuery.data?.results ?? []}
              loading={memberPaymentsQuery.isLoading}
              reversingId={reverseMemberPayment.isPending ? reverseMemberPayment.variables?.id ?? null : null}
              onReverse={(paymentId) => {
                const confirmed = window.confirm("Reverse this member payment?");
                if (!confirmed) return;
                reverseMemberPayment.mutate({ id: paymentId, reason: "Manual reversal" });
              }}
            />
          </div>
        }
        staffContent={
          <div className="space-y-4">
            <StaffSalaryPaymentForm
              staffOptions={staffOptions}
              selectedStaffId={selectedStaffId}
              selectedCycleMonth={selectedCycleMonth}
              currentPeriodId={activeStaffPeriodId}
              maxPayableAmount={staffTotalOutstanding}
              outstandingLoading={staffSummaryQuery.isLoading}
              isSubmitting={createStaffPayment.isPending}
              onStaffChange={updateStaff}
              onCycleMonthChange={updateCycleMonth}
              onSubmit={async (values) => {
                if (staffSummaryQuery.isLoading) {
                  toast.error("Staff salary information is still loading. Try again in a moment.");
                  return;
                }
                if (!staffSummaryQuery.data || staffTotalOutstanding <= 0) {
                  toast.error("This staff member has no outstanding salary balance.");
                  return;
                }
                if (Number(values.amount_paid || 0) > staffTotalOutstanding) {
                  toast.error(
                    `Payment cannot exceed outstanding salary: AFN ${staffTotalOutstanding.toLocaleString()}.`
                  );
                  return;
                }
                await createStaffPayment.mutateAsync(values);
              }}
            />
            <SalaryOutstandingCard
              summary={staffSummaryQuery.data}
              loading={staffSummaryQuery.isLoading}
            />
            {historyFilters}
            <PaymentHistoryTable
              mode="staff"
              staffPayments={staffPaymentsQuery.data?.results ?? []}
              loading={staffPaymentsQuery.isLoading}
              reversingId={reverseStaffPayment.isPending ? reverseStaffPayment.variables?.id ?? null : null}
              onReverse={(paymentId) => {
                const confirmed = window.confirm("Reverse this salary payment?");
                if (!confirmed) return;
                reverseStaffPayment.mutate({ id: paymentId, reason: "Manual reversal" });
              }}
            />
          </div>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
          <PaginationInfo currentPage={page} pageSize={page_size} totalItems={activeTab === "member_fees" ? memberPaymentsQuery.data?.count ?? 0 : staffPaymentsQuery.data?.count ?? 0} />
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={updatePage} />
        </CardContent>
      </Card>

      <Modal
        isOpen={isFeePlanModalOpen}
        onClose={() => setIsFeePlanModalOpen(false)}
        title="Create Member Fee Plan"
        description="Set monthly fee details for the selected member."
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsFeePlanModalOpen(false)}
              disabled={createMemberFeePlan.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitMemberFeePlan}
              loading={createMemberFeePlan.isPending}
            >
              Save Plan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="number"
              step="0.01"
              min="0.01"
              label="Cycle Fee Amount (AFN)"
              value={planCycleFeeAmount}
              onChange={(event) => setPlanCycleFeeAmount(event.target.value)}
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              label="Default Discount (AFN)"
              value={planDiscountAmount}
              onChange={(event) => setPlanDiscountAmount(event.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="date"
              label="Effective From"
              value={planEffectiveFrom}
              onChange={(event) => setPlanEffectiveFrom(event.target.value)}
            />
            <Input
              type="date"
              label="Effective To (Optional)"
              value={planEffectiveTo}
              onChange={(event) => setPlanEffectiveTo(event.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

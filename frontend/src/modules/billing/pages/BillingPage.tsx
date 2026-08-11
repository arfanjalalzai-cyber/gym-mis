import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components";
import { Card, CardContent, Input, Pagination, PaginationInfo } from "@/components/ui";
import { useMembersList } from "@/modules/members/queries/useMembers";
import { useUpsertMemberFeeCycle } from "@/modules/payments/queries/usePayments";
import { useScheduleClassList } from "@/modules/schedule/queries/useSchedule";
import BillingHistoryTable from "../components/BillingHistoryTable";
import GenerateBillForm from "../components/GenerateBillForm";
import { useBillingFilters } from "../hooks/useBillingFilters";
import { useBillsList, useGenerateBill } from "../queries/useBilling";
import type { BillGenerateFormValues } from "../types/billing";

const toMonthStart = (dateValue: string) => {
  if (!dateValue) return "";
  const [year, month] = dateValue.split("-");
  if (!year || !month) return "";
  return `${year}-${month}-01`;
};

export default function BillingPage() {
  const navigate = useNavigate();
  const [criteria, setCriteria] = useState<{ memberId: number | null; billingDate: string }>({
    memberId: null,
    billingDate: "",
  });
  const [feePreview, setFeePreview] = useState<{
    originalFee: number;
    cycleDiscount: number;
    paymentDiscount: number;
  } | null>(
    null
  );
  const [loadingFee, setLoadingFee] = useState(false);

  const {
    search,
    selectedMemberId,
    status,
    billingDateFrom,
    billingDateTo,
    page,
    page_size,
    listParams,
    updateSearch,
    updateMember,
    updateStatus,
    updateDateFrom,
    updateDateTo,
    updatePage,
  } = useBillingFilters();

  const { data: membersData } = useMembersList({ page: 1, page_size: 200, ordering: "last_name" });
  const { data: classesData } = useScheduleClassList({ page: 1, page_size: 200, is_active: true, ordering: "name" });
  const billsQuery = useBillsList(listParams);

  const generateBill = useGenerateBill();
  const { mutateAsync: upsertMemberCycleAsync } = useUpsertMemberFeeCycle();

  const members = useMemo(() => membersData?.results ?? [], [membersData?.results]);
  const scheduleClasses = useMemo(() => classesData?.results ?? [], [classesData?.results]);
  const selectedBillingMember = useMemo(
    () => members.find((member) => member.id === criteria.memberId) ?? null,
    [criteria.memberId, members]
  );

  const handleCriteriaChange = useCallback((memberId: number | null, billingDate: string) => {
    setCriteria((prev) => {
      if (prev.memberId === memberId && prev.billingDate === billingDate) return prev;
      return { memberId, billingDate };
    });
  }, []);

  useEffect(() => {
    if (!criteria.memberId || !criteria.billingDate || selectedBillingMember?.status === "inactive") {
      setFeePreview(null);
      setLoadingFee(false);
      return;
    }
    const cycleMonth = toMonthStart(criteria.billingDate);
    if (!cycleMonth) {
      setFeePreview(null);
      return;
    }

    setLoadingFee(true);
    upsertMemberCycleAsync({ member_id: criteria.memberId, cycle_month: cycleMonth })
      .then((cycle) =>
        setFeePreview({
          originalFee: Number(cycle.base_due_amount),
          cycleDiscount: Number(cycle.cycle_discount_amount),
          paymentDiscount: Number(cycle.payment_discount_amount),
        })
      )
      .catch(() => setFeePreview(null))
      .finally(() => setLoadingFee(false));
  }, [criteria.billingDate, criteria.memberId, selectedBillingMember?.status, upsertMemberCycleAsync]);

  const totalPages = useMemo(() => {
    const count = billsQuery.data?.count ?? 0;
    if (!count) return 1;
    return Math.max(1, Math.ceil(count / page_size));
  }, [billsQuery.data?.count, page_size]);

  const handleGenerateSubmit = async (values: BillGenerateFormValues) => {
    const selectedMember = members.find((member) => member.id === values.member_id);
    if (selectedMember?.status === "inactive") {
      toast.error("This member is inactive. Bill cannot be generated.");
      return;
    }

    if (!feePreview) {
      toast.error("Fee preview is not available. Select member and billing date.");
      return;
    }

    const created = await generateBill.mutateAsync({
      member_id: values.member_id,
      billing_date: values.billing_date,
      discount_amount: values.discount_amount,
      schedule_class_id: values.schedule_class_id ?? null,
    });
    navigate(`/billing/${created.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        subtitle="Generate member bills, track payment status, and manage billing history."
      />

      <GenerateBillForm
        members={members}
        classes={scheduleClasses}
        feePreview={feePreview}
        loadingFee={loadingFee}
        isSubmitting={generateBill.isPending}
        onCriteriaChange={handleCriteriaChange}
        onSubmit={handleGenerateSubmit}
      />

      <Card>
        <CardContent className="space-y-4">
          <h3 className="text-base font-semibold text-text-primary">History Filters</h3>
          <div className="grid gap-4 md:grid-cols-5">
            <Input
              label="Search"
              placeholder="Bill number or member"
              value={search}
              onChange={(event) => updateSearch(event.target.value)}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Member</label>
              <select
                value={selectedMemberId ?? ""}
                onChange={(event) => updateMember(event.target.value ? Number(event.target.value) : null)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">All members</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.member_code} - {member.first_name} {member.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Status</label>
              <select
                value={status}
                onChange={(event) => updateStatus(event.target.value as typeof status)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All statuses</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
            <Input
              type="date"
              label="Date From"
              value={billingDateFrom}
              onChange={(event) => updateDateFrom(event.target.value)}
            />
            <Input
              type="date"
              label="Date To"
              value={billingDateTo}
              onChange={(event) => updateDateTo(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <BillingHistoryTable
        bills={billsQuery.data?.results ?? []}
        loading={billsQuery.isLoading}
        onView={(billId) => navigate(`/billing/${billId}`)}
      />

      <Card>
        <CardContent className="flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
          <PaginationInfo
            currentPage={page}
            pageSize={page_size}
            totalItems={billsQuery.data?.count ?? 0}
          />
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={updatePage} />
        </CardContent>
      </Card>
    </div>
  );
}

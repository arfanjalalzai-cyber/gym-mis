import { useEffect, useMemo } from "react";

import { Button, Card, CardContent, Input } from "@/components/ui";
import type { MemberListItem } from "@/modules/members/types/member";
import type { ScheduleClassListItem } from "@/modules/schedule/types/schedule";
import { useGenerateBillForm } from "../hooks/useGenerateBillForm";
import type { BillGenerateFormValues } from "../types/billing";

interface GenerateBillFormProps {
  members: MemberListItem[];
  classes: ScheduleClassListItem[];
  feePreview: {
    originalFee: number;
    cycleDiscount: number;
    paymentDiscount: number;
  } | null;
  loadingFee: boolean;
  isSubmitting: boolean;
  onCriteriaChange: (memberId: number | null, billingDate: string) => void;
  onSubmit: (values: BillGenerateFormValues) => Promise<void>;
}

const formatAmount = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function GenerateBillForm({
  members,
  classes,
  feePreview,
  loadingFee,
  isSubmitting,
  onCriteriaChange,
  onSubmit,
}: GenerateBillFormProps) {
  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors, dirtyFields },
  } = useGenerateBillForm();

  const memberId = watch("member_id");
  const billingDate = watch("billing_date");
  const discountAmount = watch("discount_amount");
  const originalFee = watch("original_fee_amount");

  const selectedMember = useMemo(
    () => members.find((member) => member.id === memberId) ?? null,
    [memberId, members]
  );

  useEffect(() => {
    onCriteriaChange(memberId > 0 ? memberId : null, billingDate);
  }, [billingDate, memberId, onCriteriaChange]);

  useEffect(() => {
    setValue("original_fee_amount", feePreview?.originalFee ?? 0, { shouldValidate: true });
    if (!dirtyFields.discount_amount) {
      setValue("discount_amount", feePreview?.cycleDiscount ?? 0, { shouldValidate: true });
    }
  }, [dirtyFields.discount_amount, feePreview, setValue]);

  const paymentDiscount = feePreview?.paymentDiscount ?? 0;
  const totalDiscount = discountAmount + paymentDiscount;
  const finalAmount = Math.max(0, originalFee - totalDiscount);

  return (
    <Card>
      <CardContent className="space-y-4">
        <h3 className="text-base font-semibold text-text-primary">Generate Bill</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Member</label>
              <select
                value={memberId > 0 ? memberId : ""}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setValue("member_id", Number.isFinite(value) ? value : 0, { shouldValidate: true });
                }}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.member_code} - {member.first_name} {member.last_name}
                  </option>
                ))}
              </select>
              {errors.member_id ? <p className="mt-1.5 text-sm text-error">{errors.member_id.message}</p> : null}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Class (Optional)</label>
              <select
                value={watch("schedule_class_id") ?? ""}
                onChange={(event) => {
                  const raw = event.target.value;
                  setValue("schedule_class_id", raw ? Number(raw) : null, { shouldValidate: true });
                }}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">No class selected</option>
                {classes.map((scheduleClass) => (
                  <option key={scheduleClass.id} value={scheduleClass.id}>
                    {scheduleClass.class_code} - {scheduleClass.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedMember ? (
            <div className="grid gap-3 rounded-lg border border-border bg-surface p-3 text-sm md:grid-cols-3">
              <p><span className="font-medium">Member:</span> {selectedMember.first_name} {selectedMember.last_name}</p>
              <p><span className="font-medium">Code:</span> {selectedMember.member_code}</p>
              <p><span className="font-medium">Status:</span> {selectedMember.status}</p>
              <p><span className="font-medium">Phone:</span> {selectedMember.phone}</p>
              <p><span className="font-medium">Email:</span> {selectedMember.email ?? "-"}</p>
              <p><span className="font-medium">Joined:</span> {selectedMember.join_date}</p>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <Input
              type="date"
              label="Billing Date"
              {...register("billing_date")}
              error={errors.billing_date?.message}
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              label="Original Fee (AFN)"
              value={originalFee}
              readOnly
              hint={loadingFee ? "Loading fee..." : "Auto loaded from member fee plan"}
              error={errors.original_fee_amount?.message}
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              label="Discount (AFN)"
              value={discountAmount}
              onChange={(event) =>
                setValue("discount_amount", Number(event.target.value || 0), { shouldValidate: true })
              }
              error={errors.discount_amount?.message}
            />
            <Input
              type="number"
              step="0.01"
              label="Payment Discount (AFN)"
              value={paymentDiscount}
              readOnly
              hint="Auto-loaded from recorded member payments"
            />
          </div>

          <div className="rounded-lg border border-border bg-surface p-3 text-sm">
            <p className="font-semibold text-text-primary">
              Final Amount: {formatAmount(finalAmount)} AFN
            </p>
            <p className="mt-1 text-text-secondary">
              Total Discount: {formatAmount(totalDiscount)} AFN. Final Amount = Fee - Cycle Discount - Payment Discount
            </p>
          </div>

          <Button type="submit" loading={isSubmitting} disabled={loadingFee || isSubmitting}>
            Generate Bill
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

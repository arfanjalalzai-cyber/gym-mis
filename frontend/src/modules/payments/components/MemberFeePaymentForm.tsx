import { useEffect } from "react";

import { Button, Card, CardContent, Input, SearchableSelect } from "@/components/ui";
import { useBillingSettings } from "@/modules/settings/queries";
import { useMemberPaymentForm } from "../hooks/useMemberPaymentForm";
import type { PaymentMethod } from "../types/payments";

interface OptionItem {
  id: number;
  label: string;
}

interface MemberFeePaymentFormProps {
  memberOptions: OptionItem[];
  selectedMemberId: number | null;
  isSubmitting?: boolean;
  onMemberChange: (memberId: number | null) => void;
  onSubmit: (values: {
    member_id: number;
    cycle_id?: number;
    amount_paid: number;
    discount_amount: number;
    payment_method: PaymentMethod;
    paid_at: string;
    note?: string;
  }) => Promise<void> | void;
}

const methodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  online: "Online",
  card: "Card",
  other: "Other",
};

const currentTimestamp = () => new Date().toISOString().slice(0, 16);

export default function MemberFeePaymentForm({
  memberOptions,
  selectedMemberId,
  isSubmitting = false,
  onMemberChange,
  onSubmit,
}: MemberFeePaymentFormProps) {
  const billingSettingsQuery = useBillingSettings();
  const paymentMethods: PaymentMethod[] = billingSettingsQuery.data?.payment_methods_json?.length
    ? billingSettingsQuery.data.payment_methods_json
    : ["cash", "bank_transfer", "online"];
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useMemberPaymentForm({
    member_id: selectedMemberId ?? 0,
  });

  useEffect(() => {
    setValue("member_id", selectedMemberId ?? 0);
  }, [selectedMemberId, setValue]);

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await onSubmit({
          ...values,
          cycle_id: undefined,
          paid_at: new Date(values.paid_at).toISOString(),
          note: values.note?.trim() || undefined,
        });
        reset({
          member_id: selectedMemberId ?? 0,
          cycle_id: undefined,
          amount_paid: undefined as unknown as number,
          discount_amount: 0,
          payment_method: values.payment_method,
          paid_at: currentTimestamp(),
          note: "",
        });
      })}
    >
      <Card>
        <CardContent className="space-y-4">
          <h3 className="text-base font-semibold text-text-primary">Add Member Fee Payment</h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <SearchableSelect
                label="Member"
                placeholder="Select member"
                searchPlaceholder="Search member by name or code"
                emptyMessage="No member found."
                options={memberOptions}
                value={selectedMemberId}
                onChange={onMemberChange}
                error={errors.member_id?.message}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="number"
              step="0.01"
              label="Paid Amount (AFN)"
              error={errors.amount_paid?.message}
              {...register("amount_paid", { valueAsNumber: true })}
            />
            <Input
              type="number"
              step="0.01"
              label="Discount Amount (AFN)"
              error={errors.discount_amount?.message}
              {...register("discount_amount", { valueAsNumber: true })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Payment Method</label>
              <select
                {...register("payment_method")}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {methodLabels[method]}
                  </option>
                ))}
              </select>
              {errors.payment_method?.message && (
                <p className="mt-1.5 text-sm text-error">{errors.payment_method.message}</p>
              )}
            </div>
            <Input
              type="datetime-local"
              label="Paid At"
              error={errors.paid_at?.message}
              {...register("paid_at")}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Note</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              {...register("note")}
            />
          </div>

          <div className="flex justify-end border-t border-border pt-4">
            <Button type="submit" loading={isSubmitting}>
              Record Member Payment
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

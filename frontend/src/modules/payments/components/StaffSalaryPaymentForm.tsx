import { useEffect } from "react";

import { Button, Card, CardContent, Input, SearchableSelect } from "@/components/ui";
import { useBillingSettings } from "@/modules/settings/queries";
import { useSalaryPaymentForm } from "../hooks/useSalaryPaymentForm";
import type { PaymentMethod } from "../types/payments";

interface OptionItem {
  id: number;
  label: string;
}

interface StaffSalaryPaymentFormProps {
  staffOptions: OptionItem[];
  selectedStaffId: number | null;
  selectedCycleMonth: string;
  currentPeriodId?: number;
  maxPayableAmount?: number;
  outstandingLoading?: boolean;
  isSubmitting?: boolean;
  onStaffChange: (staffId: number | null) => void;
  onCycleMonthChange: (periodMonth: string) => void;
  onSubmit: (values: {
    staff_id: number;
    period_id?: number;
    amount_paid: number;
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

export default function StaffSalaryPaymentForm({
  staffOptions,
  selectedStaffId,
  selectedCycleMonth,
  currentPeriodId,
  maxPayableAmount = 0,
  outstandingLoading = false,
  isSubmitting = false,
  onStaffChange,
  onCycleMonthChange,
  onSubmit,
}: StaffSalaryPaymentFormProps) {
  const billingSettingsQuery = useBillingSettings();
  const paymentMethods: PaymentMethod[] = billingSettingsQuery.data?.payment_methods_json?.length
    ? billingSettingsQuery.data.payment_methods_json
    : ["cash", "bank_transfer", "online"];
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useSalaryPaymentForm({
    staff_id: selectedStaffId ?? 0,
    period_id: currentPeriodId,
  });

  useEffect(() => {
    setValue("staff_id", selectedStaffId ?? 0);
  }, [selectedStaffId, setValue]);

  useEffect(() => {
    setValue("period_id", currentPeriodId);
  }, [currentPeriodId, setValue]);

  const amountPaid = watch("amount_paid");
  const hasOutstandingBalance = maxPayableAmount > 0;

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        if (outstandingLoading) {
          return;
        }
        if (!hasOutstandingBalance) {
          return;
        }
        if (Number(values.amount_paid) > maxPayableAmount) {
          setValue("amount_paid", maxPayableAmount, { shouldDirty: true, shouldValidate: true });
          return;
        }
        await onSubmit({
          ...values,
          period_id: undefined,
          paid_at: new Date(values.paid_at).toISOString(),
          note: values.note?.trim() || undefined,
        });
        reset({
          staff_id: selectedStaffId ?? 0,
          period_id: currentPeriodId,
          amount_paid: undefined as unknown as number,
          payment_method: values.payment_method,
          paid_at: currentTimestamp(),
          note: "",
        });
      })}
    >
      <Card>
        <CardContent className="space-y-4">
          <h3 className="text-base font-semibold text-text-primary">Add Staff Salary Payment</h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <SearchableSelect
                label="Staff"
                placeholder="Select staff"
                searchPlaceholder="Search staff by name or code"
                emptyMessage="No staff found."
                options={staffOptions}
                value={selectedStaffId}
                onChange={onStaffChange}
                error={errors.staff_id?.message}
              />
            </div>

            <Input
              type="month"
              label="Salary Period"
              value={selectedCycleMonth.slice(0, 7)}
              onChange={(event) => onCycleMonthChange(`${event.target.value}-01`)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={hasOutstandingBalance ? maxPayableAmount : undefined}
              label="Paid Amount (AFN)"
              hint={
                outstandingLoading
                  ? "Loading salary balance..."
                  : hasOutstandingBalance
                    ? `Maximum payable now: AFN ${maxPayableAmount.toLocaleString()}`
                    : "No outstanding salary balance."
              }
              error={errors.amount_paid?.message}
              {...register("amount_paid", { valueAsNumber: true })}
            />
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
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={outstandingLoading || !hasOutstandingBalance || Number(amountPaid || 0) > maxPayableAmount}
            >
              Record Salary Payment
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

import { useRef } from "react";
import { Calendar } from "lucide-react";

import { Card, CardContent, Input, SearchableSelect } from "@/components/ui";

import type { AllowedMonths } from "../types/reports";
import type { PaymentMethodFilter } from "../stores/useReportsStore";

interface MemberOption {
  id: number;
  label: string;
}

interface ReportsFilterBarProps {
  months: AllowedMonths;
  paymentMemberId: number | null;
  paymentMethod: PaymentMethodFilter;
  paymentDateFrom: string;
  paymentDateTo: string;
  memberOptions: MemberOption[];
  onMonthsChange: (months: AllowedMonths) => void;
  onPaymentMemberChange: (memberId: number | null) => void;
  onPaymentMethodChange: (method: PaymentMethodFilter) => void;
  onPaymentDateFromChange: (value: string) => void;
  onPaymentDateToChange: (value: string) => void;
}

interface DateFilterInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function DateFilterInput({ label, value, onChange }: DateFilterInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openCalendar = () => {
    const input = inputRef.current;
    if (!input) return;

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
  };

  return (
    <Input
      ref={inputRef}
      label={label}
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rightIcon={
        <button
          type="button"
          aria-label={`Open ${label} calendar`}
          onClick={openCalendar}
          className="rounded p-0.5 text-muted transition-colors hover:bg-surface-hover hover:text-primary"
        >
          <Calendar className="h-4 w-4" />
        </button>
      }
    />
  );
}

export default function ReportsFilterBar({
  months,
  paymentMemberId,
  paymentMethod,
  paymentDateFrom,
  paymentDateTo,
  memberOptions,
  onMonthsChange,
  onPaymentMemberChange,
  onPaymentMethodChange,
  onPaymentDateFromChange,
  onPaymentDateToChange,
}: ReportsFilterBarProps) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <h3 className="text-base font-semibold text-text-primary">Global Filters</h3>
        <div className="grid gap-4 md:grid-cols-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Analytics Window
            </label>
            <select
              value={months}
              onChange={(event) => onMonthsChange(Number(event.target.value) as AllowedMonths)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
              <option value={24}>Last 24 months</option>
            </select>
          </div>
          <SearchableSelect
            label="Member"
            placeholder="All Members"
            searchPlaceholder="Search member code or name..."
            emptyMessage="No members found."
            options={memberOptions}
            value={paymentMemberId}
            onChange={onPaymentMemberChange}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(event) =>
                onPaymentMethodChange(event.target.value as PaymentMethodFilter)
              }
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
          </div>
          <DateFilterInput
            label="Payment Date From"
            value={paymentDateFrom}
            onChange={onPaymentDateFromChange}
          />
          <DateFilterInput
            label="Payment Date To"
            value={paymentDateTo}
            onChange={onPaymentDateToChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}

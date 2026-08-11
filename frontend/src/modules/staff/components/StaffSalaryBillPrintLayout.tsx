import { forwardRef } from "react";

import type { Staff } from "../types/staff";
import type { StaffSalaryPeriod } from "@/modules/payments/types/payments";

interface StaffSalaryBillPrintLayoutProps {
  staff: Staff;
  period: StaffSalaryPeriod;
  gymName: string;
  gymLogoUrl?: string | null;
  formatDate: (value: string) => string;
}

const formatAmount = (value: string | number, currency: string) =>
  `${Number(value).toLocaleString()} ${currency}`;

const getPositionLabel = (position: string, positionOther?: string | null) => {
  if (position === "other" && positionOther) return positionOther;
  return position.charAt(0).toUpperCase() + position.slice(1);
};

const getBillNumber = (period: StaffSalaryPeriod) =>
  `SAL-${String(period.id).padStart(6, "0")}`;

const StaffSalaryBillPrintLayout = forwardRef<HTMLDivElement, StaffSalaryBillPrintLayoutProps>(
  ({ staff, period, gymName, gymLogoUrl, formatDate }, ref) => (
    <div
      ref={ref}
      className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-xl print:rounded-none print:border-0 print:shadow-none"
    >
      <div className="h-2 w-full bg-gradient-to-r from-primary via-secondary to-accent" />

      <header className="flex flex-col gap-6 p-8 pb-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-4">
          {gymLogoUrl ? (
            <img
              src={gymLogoUrl}
              alt="Gym logo"
              className="h-16 w-16 rounded-xl border border-slate-200 object-cover"
            />
          ) : null}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Gym MIS</p>
            <h1 className="text-3xl font-black leading-tight">{gymName}</h1>
            <p className="text-sm font-medium text-slate-500">Professional Salary Statement</p>
          </div>
        </div>

        <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm md:w-auto md:min-w-[290px]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Salary Bill Info</p>
          <div className="mt-2 space-y-1.5">
            <p className="flex justify-between gap-8">
              <span className="font-semibold text-slate-500">Bill #</span>
              <span className="font-bold text-slate-900">{getBillNumber(period)}</span>
            </p>
            <p className="flex justify-between gap-8">
              <span className="font-semibold text-slate-500">Salary Month</span>
              <span className="font-bold text-slate-900">{formatDate(period.period_month)}</span>
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 px-8 pb-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Staff Details</p>
          <div className="mt-3 space-y-1.5 text-sm">
            <p><span className="font-semibold text-slate-500">Name:</span> <span className="font-medium">{period.staff_name}</span></p>
            <p><span className="font-semibold text-slate-500">Code:</span> <span className="font-medium">{period.staff_code}</span></p>
            <p><span className="font-semibold text-slate-500">Position:</span> <span className="font-medium">{getPositionLabel(staff.position, staff.position_other)}</span></p>
            <p><span className="font-semibold text-slate-500">Mobile:</span> <span className="font-medium">{staff.mobile_number || "-"}</span></p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Salary Summary</p>
          <div className="mt-3 space-y-2 text-sm">
            <p className="flex items-center justify-between"><span className="font-semibold text-slate-500">Paid Amount</span><span className="font-bold">{formatAmount(period.paid_amount, period.currency)}</span></p>
            <p className="flex items-center justify-between"><span className="font-semibold text-slate-500">Remaining</span><span className="font-bold">{formatAmount(period.remaining_amount, period.currency)}</span></p>
          </div>
        </div>
      </section>

      <section className="px-8 pb-8">
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-600">Salary Breakdown</h2>
          </div>
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Item</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="px-4 py-3 font-medium">Gross Salary</td>
                <td className="px-4 py-3 text-right">{formatAmount(period.gross_salary_amount, period.currency)}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Paid Amount</td>
                <td className="px-4 py-3 text-right">{formatAmount(period.paid_amount, period.currency)}</td>
              </tr>
              <tr className="bg-info-soft">
                <td className="px-4 py-3 text-base font-black text-info">Remaining Amount</td>
                <td className="px-4 py-3 text-right text-base font-black text-info">{formatAmount(period.remaining_amount, period.currency)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50 px-8 py-4 text-xs text-slate-500">
        This is a system-generated salary statement from {gymName}. Keep this bill for payroll records.
      </footer>
    </div>
  )
);

StaffSalaryBillPrintLayout.displayName = "StaffSalaryBillPrintLayout";

export default StaffSalaryBillPrintLayout;

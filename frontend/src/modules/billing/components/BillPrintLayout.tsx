import { forwardRef } from "react";

import type { Bill } from "../types/billing";

interface BillPrintLayoutProps {
  bill: Bill;
  gymName: string;
  gymLogoUrl?: string | null;
}

const formatAmount = (value: string, currency: string) =>
  `${Number(value).toLocaleString()} ${currency}`;

const BillPrintLayout = forwardRef<HTMLDivElement, BillPrintLayoutProps>(
  ({ bill, gymName, gymLogoUrl }, ref) => (
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
            <p className="text-sm font-medium text-slate-500">Professional Billing Statement</p>
          </div>
        </div>

        <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm md:w-auto md:min-w-[290px]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Invoice Info</p>
          <div className="mt-2 space-y-1.5">
            <p className="flex justify-between gap-8">
              <span className="font-semibold text-slate-500">Bill #</span>
              <span className="font-bold text-slate-900">{bill.bill_number}</span>
            </p>
            <p className="flex justify-between gap-8">
              <span className="font-semibold text-slate-500">Billing Date</span>
              <span className="font-bold text-slate-900">{bill.billing_date}</span>
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 px-8 pb-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Member Details</p>
          <div className="mt-3 space-y-1.5 text-sm">
            <p><span className="font-semibold text-slate-500">Name:</span> <span className="font-medium">{bill.member_name}</span></p>
            <p><span className="font-semibold text-slate-500">Code:</span> <span className="font-medium">{bill.member_code}</span></p>
            <p><span className="font-semibold text-slate-500">Role / Position:</span> <span className="font-medium capitalize">{bill.member_role_or_position}</span></p>
            <p><span className="font-semibold text-slate-500">Plan / Class:</span> <span className="font-medium">{bill.membership_plan_or_class}</span></p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Payment Summary</p>
          <div className="mt-3 space-y-2 text-sm">
            <p className="flex items-center justify-between"><span className="font-semibold text-slate-500">Total Paid (All Months)</span><span className="font-bold">{formatAmount(bill.total_paid_amount, bill.currency)}</span></p>
            <p className="flex items-center justify-between"><span className="font-semibold text-slate-500">Total Remaining (All Months)</span><span className="font-bold">{formatAmount(bill.total_outstanding_amount, bill.currency)}</span></p>
            <p className="flex items-center justify-between"><span className="font-semibold text-slate-500">This Bill Paid</span><span className="font-medium">{formatAmount(bill.paid_amount, bill.currency)}</span></p>
            <p className="flex items-center justify-between"><span className="font-semibold text-slate-500">This Bill Remaining</span><span className="font-medium">{formatAmount(bill.remaining_amount, bill.currency)}</span></p>
          </div>
        </div>
      </section>

      <section className="px-8 pb-8">
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-600">Fee Breakdown</h2>
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
                <td className="px-4 py-3 font-medium">Original Fee</td>
                <td className="px-4 py-3 text-right">{formatAmount(bill.original_fee_amount, bill.currency)}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">This Bill Discount</td>
                <td className="px-4 py-3 text-right">{formatAmount(bill.discount_amount, bill.currency)}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Total Discount (All Months)</td>
                <td className="px-4 py-3 text-right">{formatAmount(bill.total_discount_amount, bill.currency)}</td>
              </tr>
              <tr className="bg-success-soft">
                <td className="px-4 py-3 text-base font-black text-success">Final Amount</td>
                <td className="px-4 py-3 text-right text-base font-black text-success">{formatAmount(bill.final_amount, bill.currency)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50 px-8 py-4 text-xs text-slate-500">
        This is a system-generated invoice from {gymName}. Keep this bill for your records.
      </footer>
    </div>
  )
);

BillPrintLayout.displayName = "BillPrintLayout";

export default BillPrintLayout;

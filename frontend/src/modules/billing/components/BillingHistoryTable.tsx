import { Button, Card, CardContent } from "@/components/ui";

import BillStatusBadge from "./BillStatusBadge";
import type { BillListItem } from "../types/billing";

interface BillingHistoryTableProps {
  bills: BillListItem[];
  loading: boolean;
  onView: (billId: number) => void;
}

const formatAmount = (value: string, currency: string) =>
  `${Number(value).toLocaleString()} ${currency}`;

export default function BillingHistoryTable({ bills, loading, onView }: BillingHistoryTableProps) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <h3 className="text-base font-semibold text-text-primary">Billing History</h3>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-text-secondary">Bill #</th>
                <th className="px-3 py-2 text-left font-semibold text-text-secondary">Member</th>
                <th className="px-3 py-2 text-left font-semibold text-text-secondary">Fee</th>
                <th className="px-3 py-2 text-left font-semibold text-text-secondary">Discount</th>
                <th className="px-3 py-2 text-left font-semibold text-text-secondary">Final</th>
                <th className="px-3 py-2 text-left font-semibold text-text-secondary">Billing Date</th>
                <th className="px-3 py-2 text-left font-semibold text-text-secondary">Status</th>
                <th className="px-3 py-2 text-right font-semibold text-text-secondary">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {loading ? (
                <tr>
                  <td className="px-3 py-8 text-center text-text-secondary" colSpan={8}>
                    Loading bills...
                  </td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-text-secondary" colSpan={8}>
                    No bills found.
                  </td>
                </tr>
              ) : (
                bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-surface/60">
                    <td className="px-3 py-2 font-medium text-text-primary">{bill.bill_number}</td>
                    <td className="px-3 py-2 text-text-primary">{bill.member_name}</td>
                    <td className="px-3 py-2 text-text-primary">
                      {formatAmount(bill.original_fee_amount, bill.currency)}
                    </td>
                    <td className="px-3 py-2 text-text-primary">
                      {formatAmount(bill.discount_amount, bill.currency)}
                    </td>
                    <td className="px-3 py-2 text-text-primary">
                      {formatAmount(bill.final_amount, bill.currency)}
                    </td>
                    <td className="px-3 py-2 text-text-primary">{bill.billing_date}</td>
                    <td className="px-3 py-2">
                      <BillStatusBadge status={bill.payment_status} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button type="button" size="sm" variant="outline" onClick={() => onView(bill.id)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}


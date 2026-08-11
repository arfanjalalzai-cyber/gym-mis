import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components";
import { Button, Card, CardContent, CardHeader, Input } from "@/components/ui";

import { useBillingSettings, useInvoicePreview, useUpdateBillingSettings } from "../queries";
import type { BillingSettingsPayload, PaymentMethod } from "../types";

const paymentMethods: PaymentMethod[] = ["cash", "bank_transfer", "online"];

export default function PaymentBillingSettingsPage() {
  const navigate = useNavigate();
  const billingQuery = useBillingSettings();
  const updateMutation = useUpdateBillingSettings();
  const invoicePreviewMutation = useInvoicePreview();

  const [form, setForm] = useState<BillingSettingsPayload>({
    default_currency: "AFN",
    payment_methods_json: ["cash", "bank_transfer", "online"],
    default_tax_percentage: null,
    discount_mode: "none",
    discount_value: "0",
    invoice_prefix: "INV",
    invoice_padding: 6,
    invoice_next_sequence: 1,
  });

  useEffect(() => {
    if (!billingQuery.data) return;
    setForm({
      ...billingQuery.data,
      default_tax_percentage: billingQuery.data.default_tax_percentage,
    });
  }, [billingQuery.data]);

  const toggleMethod = (method: PaymentMethod) => {
    setForm((prev) => {
      const hasMethod = prev.payment_methods_json.includes(method);
      return {
        ...prev,
        payment_methods_json: hasMethod
          ? prev.payment_methods_json.filter((item) => item !== method)
          : [...prev.payment_methods_json, method],
      };
    });
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    updateMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment & Billing Settings"
        subtitle="Configure default currency, tax, discounts, and invoice numbering."
        actions={[
          {
            label: "Back",
            variant: "outline",
            onClick: () => navigate("/settings"),
          },
        ]}
      />

      <Card>
        <CardHeader title="Billing Configuration" />
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <Input label="Default Currency" value={form.default_currency} disabled />

            <div>
              <p className="mb-2 text-sm font-medium text-text-primary">Payment Methods</p>
              <div className="flex flex-wrap gap-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => toggleMethod(method)}
                    className={`rounded-lg border px-3 py-2 text-sm capitalize ${
                      form.payment_methods_json.includes(method)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-text-secondary"
                    }`}
                  >
                    {method.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Default Tax Percentage (Optional)"
                type="number"
                value={form.default_tax_percentage ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, default_tax_percentage: e.target.value || null }))
                }
              />
              <Input
                label="Discount Value"
                type="number"
                value={form.discount_value}
                onChange={(e) => setForm((prev) => ({ ...prev, discount_value: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Discount Mode</label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={form.discount_mode}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, discount_mode: e.target.value as BillingSettingsPayload["discount_mode"] }))
                }
              >
                <option value="none">None</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Invoice Prefix"
                value={form.invoice_prefix}
                onChange={(e) => setForm((prev) => ({ ...prev, invoice_prefix: e.target.value }))}
              />
              <Input
                label="Invoice Padding"
                type="number"
                value={String(form.invoice_padding)}
                onChange={(e) => setForm((prev) => ({ ...prev, invoice_padding: Number(e.target.value || 1) }))}
              />
              <Input
                label="Next Sequence"
                type="number"
                value={String(form.invoice_next_sequence)}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, invoice_next_sequence: Number(e.target.value || 1) }))
                }
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => invoicePreviewMutation.mutate(form)}
                loading={invoicePreviewMutation.isPending}
              >
                Preview Invoice Number
              </Button>
              <Button type="submit" loading={updateMutation.isPending || billingQuery.isLoading}>
                Save Billing Settings
              </Button>
            </div>
          </form>

          {invoicePreviewMutation.data && (
            <p className="mt-3 text-sm text-text-secondary">
              Next invoice will be: <span className="font-semibold text-text-primary">{invoicePreviewMutation.data.invoice_number}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

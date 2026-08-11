import { useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { pdf } from "@react-pdf/renderer";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";

import { PageHeader } from "@/components";
import { Button } from "@/components/ui";
import { useGymBranding } from "@/modules/settings/hooks";
import BillPdfDocument from "../components/BillPdfDocument";
import BillPrintLayout from "../components/BillPrintLayout";
import { useBill } from "../queries/useBilling";

export default function BillDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const billId = Number(id);
  const printRef = useRef<HTMLDivElement>(null);

  const billQuery = useBill(billId, { enabled: Number.isFinite(billId) && billId > 0 });
  const { gymName, gymLogoUrl } = useGymBranding();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: billQuery.data?.bill_number ?? "gym-bill",
  });

  const handleDownloadPdf = async () => {
    if (!billQuery.data) return;
    try {
      const blob = await pdf(
        <BillPdfDocument bill={billQuery.data} gymName={gymName} gymLogoUrl={gymLogoUrl} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${billQuery.data.bill_number}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch {
      toast.error("Failed to export PDF");
    }
  };

  if (billQuery.isLoading) {
    return <p className="text-sm text-text-secondary">Loading bill details...</p>;
  }

  if (!billQuery.data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-error">Bill not found.</p>
        <Button type="button" variant="outline" onClick={() => navigate("/members")}>
          Back to Members
        </Button>
      </div>
    );
  }

  const bill = billQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bill ${bill.bill_number}`}
        subtitle="View billing details, print, and export PDF."
        actions={[
          { label: "Back", variant: "outline", onClick: () => navigate(-1) },
          { label: "Print", onClick: () => handlePrint() },
          { label: "Export PDF", variant: "outline", onClick: () => void handleDownloadPdf() },
        ]}
      />

      <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
        <BillPrintLayout ref={printRef} bill={bill} gymName={gymName} gymLogoUrl={gymLogoUrl} />
      </div>

      <p className="text-sm text-text-secondary">
        Need to record payment? Go to <Link to="/payments" className="text-primary underline">Payments</Link>.
      </p>
    </div>
  );
}

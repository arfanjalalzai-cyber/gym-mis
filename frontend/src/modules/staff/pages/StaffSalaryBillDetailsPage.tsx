import { useRef } from "react";
import { pdf } from "@react-pdf/renderer";
import { useReactToPrint } from "react-to-print";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components";
import { Button } from "@/components/ui";
import { useStaffSalaryPeriod } from "@/modules/payments/queries/usePayments";
import { useGymBranding, useSystemPreferenceFormatters } from "@/modules/settings/hooks";
import { useStaff } from "../queries/useStaff";
import StaffSalaryBillPdfDocument from "../components/StaffSalaryBillPdfDocument";
import StaffSalaryBillPrintLayout from "../components/StaffSalaryBillPrintLayout";

const getBillNumber = (id: number) => `SAL-${String(id).padStart(6, "0")}`;

export default function StaffSalaryBillDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const periodId = Number(id);
  const printRef = useRef<HTMLDivElement>(null);
  const { gymName, gymLogoUrl } = useGymBranding();
  const { formatDate } = useSystemPreferenceFormatters();

  const periodQuery = useStaffSalaryPeriod(periodId, {
    enabled: Number.isFinite(periodId) && periodId > 0,
  });
  const staffQuery = useStaff(periodQuery.data?.staff ?? 0, {
    enabled: Boolean(periodQuery.data?.staff),
  });

  const billNumber = periodQuery.data ? getBillNumber(periodQuery.data.id) : "staff-salary-bill";

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: billNumber,
  });

  const handleDownloadPdf = async () => {
    if (!periodQuery.data || !staffQuery.data) return;
    try {
      const blob = await pdf(
        <StaffSalaryBillPdfDocument
          staff={staffQuery.data}
          period={periodQuery.data}
          gymName={gymName}
          gymLogoUrl={gymLogoUrl}
          formatDate={formatDate}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${billNumber}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch {
      toast.error("Failed to export PDF");
    }
  };

  if (periodQuery.isLoading || staffQuery.isLoading) {
    return <p className="text-sm text-text-secondary">Loading salary bill details...</p>;
  }

  if (!periodQuery.data || !staffQuery.data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-error">Salary bill not found.</p>
        <Button type="button" variant="outline" onClick={() => navigate("/staff")}>
          Back to Staff
        </Button>
      </div>
    );
  }

  const period = periodQuery.data;
  const staff = staffQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Salary Bill ${getBillNumber(period.id)}`}
        subtitle="View salary bill details, print, and export PDF."
        actions={[
          { label: "Back", variant: "outline", onClick: () => navigate(-1) },
          { label: "Print", onClick: () => handlePrint() },
          { label: "Export PDF", variant: "outline", onClick: () => void handleDownloadPdf() },
        ]}
      />

      <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
        <StaffSalaryBillPrintLayout
          ref={printRef}
          staff={staff}
          period={period}
          gymName={gymName}
          gymLogoUrl={gymLogoUrl}
          formatDate={formatDate}
        />
      </div>

      <p className="text-sm text-text-secondary">
        Need to record payment? Go to <Link to="/payments" className="text-primary underline">Payments</Link>.
      </p>
    </div>
  );
}

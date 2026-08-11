import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components";
import { Card, CardContent, Spinner } from "@/components/ui";
import { useStaff } from "@/modules/staff";
import { useGymBranding, useSystemPreferenceFormatters } from "@/modules/settings/hooks";
import CardActions from "../components/CardActions";
import CardPdfDocument from "../components/CardPdfDocument";
import CardPrintLayout from "../components/CardPrintLayout";
import RegenerateCardModal from "../components/RegenerateCardModal";
import { useCardExport } from "../hooks/useCardExport";
import { useCardProfileContext } from "../hooks/useCardProfileContext";
import {
  useGenerateStaffCard,
  useRegenerateStaffCard,
  useStaffCard,
  useStaffCardHistory,
} from "../queries/useCards";
import { useCardStore } from "../stores/useCardStore";

const getPositionLabel = (position: string, positionOther?: string | null) => {
  if (position === "other" && positionOther?.trim()) {
    return positionOther.trim();
  }
  if (!position) return "-";
  return position.charAt(0).toUpperCase() + position.slice(1);
};

export default function StaffCardPage() {
  const navigate = useNavigate();
  const { holderId: staffId, isValid } = useCardProfileContext();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: staff, isLoading: staffLoading } = useStaff(staffId, {
    enabled: isValid,
  });
  const cardQuery = useStaffCard(staffId, { enabled: isValid });
  const historyQuery = useStaffCardHistory(staffId, isValid);
  const generateMutation = useGenerateStaffCard(staffId);
  const regenerateMutation = useRegenerateStaffCard(staffId);
  const { regenerateReason, setRegenerateReason } = useCardStore();
  const { gymName, gymLogoUrl } = useGymBranding();
  const { formatDateTime } = useSystemPreferenceFormatters();
  const hasCard = Boolean(cardQuery.data);
  const [regenerateModalOpen, setRegenerateModalOpen] = useState(false);

  const fileBaseName = useMemo(() => {
    if (cardQuery.data?.card_id) return cardQuery.data.card_id;
    return staff?.staff_code ? `${staff.staff_code}_card` : `staff_${staffId}_card`;
  }, [cardQuery.data?.card_id, staff?.staff_code, staffId]);

  const buildPdfDocument = useCallback(
    (imageDataUrl: string) => (
      <CardPdfDocument
        imageDataUrl={imageDataUrl}
        title={cardQuery.data ? `${cardQuery.data.full_name} - Staff Card` : "Staff Card"}
      />
    ),
    [cardQuery.data]
  );

  const { isExporting, handleDownloadPdf, handleDownloadPng, handlePrint } = useCardExport({
    printRef,
    fileBaseName,
    buildPdfDocument,
  });

  const handleGenerate = async () => {
    await generateMutation.mutateAsync();
  };

  const handleRegenerate = async (response: string) => {
    setRegenerateReason(response);
    const reason = response.trim();
    await regenerateMutation.mutateAsync({
      reason: reason || undefined,
    });
    setRegenerateModalOpen(false);
  };

  if (!isValid) {
    return <p className="text-sm text-error">Invalid staff id.</p>;
  }

  if (staffLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 text-text-secondary">
          <Spinner size="sm" />
          Loading staff card...
        </CardContent>
      </Card>
    );
  }

  if (!staff) {
    return <p className="text-sm text-error">Staff not found.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${staff.first_name} ${staff.last_name} Card`}
        subtitle={`Staff code: ${staff.staff_code}`}
        actions={[
          {
            label: "Back to Profile",
            variant: "outline",
            onClick: () => navigate(`/staff/${staffId}`),
          },
        ]}
      />

      <CardActions
        hasCard={hasCard}
        generateLoading={generateMutation.isPending}
        regenerateLoading={regenerateMutation.isPending}
        exportLoading={isExporting}
        onGenerate={() => void handleGenerate()}
        onRegenerate={() => setRegenerateModalOpen(true)}
        onPrint={() => handlePrint()}
        onDownloadPdf={() => void handleDownloadPdf()}
        onDownloadPng={() => void handleDownloadPng()}
      />

      <RegenerateCardModal
        isOpen={regenerateModalOpen}
        loading={regenerateMutation.isPending}
        initialReason={regenerateReason}
        holderName={`${staff.first_name} ${staff.last_name}`}
        holderCode={staff.staff_code}
        onClose={() => setRegenerateModalOpen(false)}
        onConfirm={(reason) => void handleRegenerate(reason)}
      />

      <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
        {cardQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Spinner size="sm" />
            Loading card...
          </div>
        ) : cardQuery.data ? (
          <CardPrintLayout
            ref={printRef}
            card={cardQuery.data}
            gymName={gymName}
            gymLogoUrl={gymLogoUrl}
            profilePhotoUrl={staff.profile_picture_url}
            staffPosition={getPositionLabel(staff.position, staff.position_other)}
            staffFatherName={staff.father_name}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
            No card generated yet. Click <strong>Generate Card</strong> to create one.
          </div>
        )}
      </div>

      <Card>
        <CardContent className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Card History</h2>
          {historyQuery.isLoading ? (
            <p className="text-sm text-text-secondary">Loading history...</p>
          ) : historyQuery.data && historyQuery.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-secondary">
                    <th className="py-2 pr-4">Card ID</th>
                    <th className="py-2 pr-4">Version</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Generated At</th>
                  </tr>
                </thead>
                <tbody>
                  {historyQuery.data.map((item) => (
                    <tr key={item.id} className="border-b border-border/60">
                      <td className="py-2 pr-4 font-medium">{item.card_id}</td>
                      <td className="py-2 pr-4">{item.version}</td>
                      <td className="py-2 pr-4">{item.is_current ? "Current" : "Replaced"}</td>
                      <td className="py-2 pr-4">{formatDateTime(item.generated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No card history yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

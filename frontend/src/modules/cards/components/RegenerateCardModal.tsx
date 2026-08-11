import { useEffect, useState } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

import { Button, Modal, Textarea } from "@/components/ui";

interface RegenerateCardModalProps {
  isOpen: boolean;
  loading?: boolean;
  initialReason?: string;
  holderName: string;
  holderCode: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export default function RegenerateCardModal({
  isOpen,
  loading = false,
  initialReason = "",
  holderName,
  holderCode,
  onClose,
  onConfirm,
}: RegenerateCardModalProps) {
  const [reason, setReason] = useState(initialReason);

  useEffect(() => {
    if (isOpen) {
      setReason(initialReason);
    }
  }, [initialReason, isOpen]);

  const handleConfirm = () => {
    onConfirm(reason);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => undefined : onClose}
      title="Re-generate Card"
      description="Create a new card version and mark the current card as replaced."
      size="md"
      closeOnOverlayClick={!loading}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            loading={loading}
            leftIcon={<RotateCw className="h-4 w-4" />}
          >
            Re-generate
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary">
              This will replace the current card.
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {holderName} ({holderCode}) will receive a new card ID/version, while the old
              card remains in history.
            </p>
          </div>
        </div>

        <Textarea
          label="Reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Optional reason for regenerating this card"
          rows={3}
          maxLength={255}
          disabled={loading}
          hint={`${reason.length}/255 characters`}
        />
      </div>
    </Modal>
  );
}

import { useEffect, useState } from "react";

import { Button, Modal } from "@/components/ui";
import type { QuantityAdjustmentPayload } from "../types/equipment";

interface QuantityAdjustmentModalProps {
  isOpen: boolean;
  loading?: boolean;
  currentOnHand: number;
  currentInService: number;
  onClose: () => void;
  onSubmit: (payload: QuantityAdjustmentPayload) => Promise<void> | void;
}

export default function QuantityAdjustmentModal({
  isOpen,
  loading = false,
  currentOnHand,
  currentInService,
  onClose,
  onSubmit,
}: QuantityAdjustmentModalProps) {
  const [target, setTarget] = useState<QuantityAdjustmentPayload["target"]>("quantity_on_hand");
  const [operation, setOperation] =
    useState<QuantityAdjustmentPayload["operation"]>("increase");
  const [value, setValue] = useState<number>(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setTarget("quantity_on_hand");
    setOperation("increase");
    setValue(0);
    setNote("");
  }, [isOpen]);

  const handleSubmit = async () => {
    await onSubmit({
      target,
      operation,
      value,
      note: note.trim() || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adjust Quantity"
      description="Track stock movement with complete history."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Apply
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-surface p-3 text-sm text-text-secondary">
          <p>Current on hand: {currentOnHand}</p>
          <p>Current in service: {currentInService}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Target</label>
            <select
              value={target}
              onChange={(event) => setTarget(event.target.value as QuantityAdjustmentPayload["target"])}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="quantity_on_hand">Quantity On Hand</option>
              <option value="quantity_in_service">Quantity In Service</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Operation</label>
            <select
              value={operation}
              onChange={(event) =>
                setOperation(event.target.value as QuantityAdjustmentPayload["operation"])
              }
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="increase">Increase</option>
              <option value="decrease">Decrease</option>
              <option value="set">Set</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Value</label>
            <input
              type="number"
              min={0}
              value={value}
              onChange={(event) => setValue(Number(event.target.value))}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">Note</label>
          <textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Reason for this adjustment"
          />
        </div>
      </div>
    </Modal>
  );
}

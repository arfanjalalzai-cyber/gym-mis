import { useEffect, useState } from "react";
import { History, Pencil, PackagePlus, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { PageHeader } from "@/components";
import { Button, Card, CardContent, Spinner } from "@/components/ui";
import { formatLocalDateTime } from "@/utils/formatLocalDateTime";
import LowStockBadge from "../components/LowStockBadge";
import MachineStatusBadge from "../components/MachineStatusBadge";
import QuantityAdjustmentModal from "../components/QuantityAdjustmentModal";
import {
  useAdjustEquipmentQuantity,
  useChangeEquipmentStatus,
  useDeleteEquipment,
  useEquipment,
} from "../queries/useInventory";
import type { MachineStatus, QuantityAdjustmentPayload } from "../types/equipment";

export default function EquipmentProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const equipmentId = Number(id);

  const { data: equipment, isLoading } = useEquipment(equipmentId, {
    enabled: Number.isInteger(equipmentId) && equipmentId > 0,
  });
  const deleteMutation = useDeleteEquipment();
  const adjustQuantityMutation = useAdjustEquipmentQuantity(equipmentId);
  const changeStatusMutation = useChangeEquipmentStatus(equipmentId);

  const [statusValue, setStatusValue] = useState<MachineStatus>("operational");
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);

  useEffect(() => {
    if (equipment?.machine_status) {
      setStatusValue(equipment.machine_status);
    }
  }, [equipment?.machine_status]);

  if (!Number.isInteger(equipmentId) || equipmentId <= 0) {
    return <div className="text-sm text-error">Invalid equipment id.</div>;
  }

  if (isLoading || !equipment) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 text-text-secondary">
          <Spinner size="sm" />
          Loading equipment profile...
        </CardContent>
      </Card>
    );
  }

  const handleDelete = async () => {
    const confirmed = window.confirm("Are you sure you want to delete this equipment?");
    if (!confirmed) return;
    await deleteMutation.mutateAsync(equipmentId);
    navigate("/inventory");
  };

  const handleAdjustQuantity = async (payload: QuantityAdjustmentPayload) => {
    await adjustQuantityMutation.mutateAsync(payload);
    setAdjustModalOpen(false);
  };

  const handleStatusUpdate = async () => {
    await changeStatusMutation.mutateAsync({
      machine_status: statusValue,
      note: "Manual status update from profile page",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={equipment.name}
        subtitle={`Equipment code: ${equipment.equipment_code}`}
        actions={[
          {
            label: "Back to Inventory",
            variant: "outline",
            onClick: () => navigate("/inventory"),
          },
          {
            label: "History",
            icon: <History className="h-4 w-4" />,
            variant: "outline",
            onClick: () => navigate(`/inventory/${equipmentId}/history`),
          },
          {
            label: "Edit",
            icon: <Pencil className="h-4 w-4" />,
            onClick: () => navigate(`/inventory/${equipmentId}/edit`),
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <p className="text-base font-semibold text-text-primary">{equipment.name}</p>
                <p className="text-sm text-text-secondary">
                  {equipment.item_type} / {equipment.category.replace(/_/g, " ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <MachineStatusBadge status={equipment.machine_status} />
                <LowStockBadge isLowStock={equipment.is_low_stock} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InfoRow label="Quantity On Hand" value={String(equipment.quantity_on_hand)} />
              <InfoRow label="Quantity In Service" value={String(equipment.quantity_in_service)} />
              <InfoRow label="Created At" value={formatLocalDateTime(equipment.created_at)} />
              <InfoRow label="Updated At" value={formatLocalDateTime(equipment.updated_at)} />
            </div>

            <InfoRow label="Notes" value={equipment.notes} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Actions</h2>

            <Button
              onClick={() => setAdjustModalOpen(true)}
              leftIcon={<PackagePlus className="h-4 w-4" />}
              fullWidth
            >
              Adjust Quantity
            </Button>

            {equipment.item_type === "machine" && (
              <div className="space-y-3 rounded-lg border border-border bg-surface p-3">
                <label className="block text-sm font-medium text-text-primary">Machine Status</label>
                <select
                  value={statusValue}
                  onChange={(event) => setStatusValue(event.target.value as MachineStatus)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="operational">Operational</option>
                  <option value="in_use">In Use</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="out_of_order">Out of Order</option>
                  <option value="retired">Retired</option>
                </select>
                <Button onClick={handleStatusUpdate} loading={changeStatusMutation.isPending} fullWidth>
                  Update Status
                </Button>
              </div>
            )}

            <Button
              onClick={handleDelete}
              variant="danger"
              leftIcon={<Trash2 className="h-4 w-4" />}
              loading={deleteMutation.isPending}
              fullWidth
            >
              Delete Equipment
            </Button>
          </CardContent>
        </Card>
      </div>

      <QuantityAdjustmentModal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        loading={adjustQuantityMutation.isPending}
        currentOnHand={equipment.quantity_on_hand}
        currentInService={equipment.quantity_in_service}
        onSubmit={handleAdjustQuantity}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-1 text-sm text-text-primary">{value && value.trim() ? value : "-"}</p>
    </div>
  );
}

import { useNavigate, useParams } from "react-router-dom";

import { PageHeader } from "@/components";
import { Card, CardContent, Spinner } from "@/components/ui";
import EquipmentForm from "../components/EquipmentForm";
import { useEquipment, useUpdateEquipment } from "../queries/useInventory";
import type { EquipmentFormValues } from "../types/equipment";

export default function EditEquipmentPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const equipmentId = Number(id);

  const { data: equipment, isLoading } = useEquipment(equipmentId, {
    enabled: Number.isInteger(equipmentId) && equipmentId > 0,
  });
  const updateEquipmentMutation = useUpdateEquipment(equipmentId);

  if (!Number.isInteger(equipmentId) || equipmentId <= 0) {
    return <div className="text-sm text-error">Invalid equipment id.</div>;
  }

  if (isLoading || !equipment) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 text-text-secondary">
          <Spinner size="sm" />
          Loading equipment...
        </CardContent>
      </Card>
    );
  }

  const handleUpdate = async (values: EquipmentFormValues) => {
    await updateEquipmentMutation.mutateAsync(values);
    navigate(`/inventory/${equipmentId}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${equipment.name}`}
        subtitle={`Equipment code: ${equipment.equipment_code}`}
        actions={[
          {
            label: "View Profile",
            variant: "outline",
            onClick: () => navigate(`/inventory/${equipmentId}`),
          },
        ]}
      />
      <EquipmentForm
        mode="edit"
        isSubmitting={updateEquipmentMutation.isPending}
        onSubmit={handleUpdate}
        onCancel={() => navigate(`/inventory/${equipmentId}`)}
        initialValues={{
          name: equipment.name,
          item_type: equipment.item_type,
          category: equipment.category,
          quantity_on_hand: equipment.quantity_on_hand,
          quantity_in_service: equipment.quantity_in_service,
          machine_status: equipment.machine_status ?? undefined,
          notes: equipment.notes ?? "",
        }}
      />
    </div>
  );
}

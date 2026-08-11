import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components";
import EquipmentForm from "../components/EquipmentForm";
import { useCreateEquipment } from "../queries/useInventory";
import type { EquipmentFormValues } from "../types/equipment";

export default function AddEquipmentPage() {
  const navigate = useNavigate();
  const createEquipmentMutation = useCreateEquipment();

  const handleCreate = async (values: EquipmentFormValues) => {
    const createdEquipment = await createEquipmentMutation.mutateAsync(values);
    navigate(`/inventory/${createdEquipment.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Equipment"
        subtitle="Create a new inventory item"
        actions={[
          {
            label: "Back to Inventory",
            variant: "outline",
            onClick: () => navigate("/inventory"),
          },
        ]}
      />
      <EquipmentForm
        mode="create"
        isSubmitting={createEquipmentMutation.isPending}
        onSubmit={handleCreate}
        onCancel={() => navigate("/inventory")}
      />
    </div>
  );
}

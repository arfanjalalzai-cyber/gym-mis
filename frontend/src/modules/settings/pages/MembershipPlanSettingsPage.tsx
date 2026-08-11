import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";

import { PageHeader } from "@/components";
import { Button, Card, CardContent, CardHeader, Input, Modal, Textarea } from "@/components/ui";

import {
  useActivateMembershipPlan,
  useCreateMembershipPlan,
  useDeactivateMembershipPlan,
  useMembershipPlans,
  useUpdateMembershipPlan,
} from "../queries";
import type { DurationType, MembershipPlan, MembershipPlanPayload } from "../types";

const defaultPlanForm: MembershipPlanPayload = {
  name: "",
  duration_type: "monthly",
  duration_months: 1,
  fee: "0",
  description: "",
  is_active: true,
};

export default function MembershipPlanSettingsPage() {
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [form, setForm] = useState<MembershipPlanPayload>(defaultPlanForm);

  const plansQuery = useMembershipPlans();
  const createMutation = useCreateMembershipPlan();
  const updateMutation = useUpdateMembershipPlan(editingPlan?.id ?? 0);
  const activateMutation = useActivateMembershipPlan();
  const deactivateMutation = useDeactivateMembershipPlan();

  const plans = plansQuery.data?.results ?? [];

  const onCreate = (event: React.FormEvent) => {
    event.preventDefault();
    createMutation.mutate(form, {
      onSuccess: () => {
        setForm(defaultPlanForm);
        setIsCreateOpen(false);
      },
    });
  };

  const onUpdate = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingPlan) return;

    updateMutation.mutate(form, {
      onSuccess: () => {
        setEditingPlan(null);
        setForm(defaultPlanForm);
      },
    });
  };

  const openCreateModal = () => {
    setForm(defaultPlanForm);
    setIsCreateOpen(true);
  };

  const openEditModal = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      duration_type: plan.duration_type,
      duration_months: plan.duration_months,
      fee: plan.fee,
      description: plan.description,
      is_active: plan.is_active,
    });
  };

  const closePlanModal = () => {
    setIsCreateOpen(false);
    setEditingPlan(null);
    setForm(defaultPlanForm);
  };

  const onDurationTypeChange = (durationType: DurationType) => {
    const durationMonths = durationType === "monthly" ? 1 : durationType === "quarterly" ? 3 : 12;
    setForm((prev) => ({ ...prev, duration_type: durationType, duration_months: durationMonths }));
  };

  const isPlanModalOpen = isCreateOpen || editingPlan !== null;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Membership Plan Configuration"
        subtitle="Manage global Basic, Premium, VIP, and custom plan templates."
        actions={[
          {
            label: "Back",
            variant: "outline",
            onClick: () => navigate("/settings"),
          },
          {
            label: "Create Plan",
            onClick: openCreateModal,
          },
        ]}
      />

      <Card>
        <CardHeader title="Membership Plans" subtitle="Activate/deactivate plan templates used across billing and membership workflows." />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Duration</th>
                  <th className="py-2 pr-4">Fee</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-b border-border/60">
                    <td className="py-2 pr-4">{plan.name}</td>
                    <td className="py-2 pr-4 capitalize">{plan.duration_type} ({plan.duration_months} months)</td>
                    <td className="py-2 pr-4">AFN {Number(plan.fee).toLocaleString()}</td>
                    <td className="py-2 pr-4">{plan.is_active ? "Active" : "Inactive"}</td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          leftIcon={<Pencil className="h-4 w-4" />}
                          onClick={() => openEditModal(plan)}
                        >
                          Edit
                        </Button>
                      {plan.is_active ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => deactivateMutation.mutate(plan.id)}>
                          Deactivate
                        </Button>
                      ) : (
                        <Button type="button" size="sm" variant="outline" onClick={() => activateMutation.mutate(plan.id)}>
                          Activate
                        </Button>
                      )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isPlanModalOpen}
        onClose={closePlanModal}
        title={editingPlan ? "Edit Membership Plan" : "Create Membership Plan"}
        description="Set the member plan name, duration, and fee used by billing."
        size="lg"
        closeOnOverlayClick={!isSaving}
        showCloseButton={!isSaving}
      >
              <form className="space-y-4" onSubmit={editingPlan ? onUpdate : onCreate}>
                <Input label="Plan Name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Duration Type</label>
                  <select
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    value={form.duration_type}
                    onChange={(e) => onDurationTypeChange(e.target.value as DurationType)}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <Input
                  label="Plan Fee"
                  type="number"
                  min="1"
                  step="1"
                  value={form.fee}
                  onChange={(e) => setForm((prev) => ({ ...prev, fee: e.target.value }))}
                />
                <Textarea
                  label="Description"
                  value={form.description || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={closePlanModal} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={isSaving}>
                    {editingPlan ? "Save Changes" : "Create Plan"}
                  </Button>
                </div>
              </form>
      </Modal>
    </div>
  );
}

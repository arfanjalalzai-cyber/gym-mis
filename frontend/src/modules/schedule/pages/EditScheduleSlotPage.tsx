import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { PageHeader } from "@/components";
import ConflictDiagnosticsAlert from "../components/ConflictDiagnosticsAlert";
import ScheduleSlotForm from "../components/ScheduleSlotForm";
import {
  extractScheduleConflicts,
  useScheduleClassList,
  useScheduleSlot,
  useScheduleTrainers,
  useUpdateScheduleSlot,
} from "../queries/useSchedule";
import type { ScheduleSlotFormValues } from "../types/schedule";

export default function EditScheduleSlotPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const slotId = Number(id);

  const { data: classData, isLoading: classLoading } = useScheduleClassList({
    page: 1,
    page_size: 200,
    ordering: "name",
    is_active: true,
  });
  const { data: trainerOptions = [], isLoading: trainerLoading } = useScheduleTrainers();
  const { data: slot, isLoading: slotLoading } = useScheduleSlot(slotId, {
    enabled: Number.isInteger(slotId) && slotId > 0,
  });
  const updateSlotMutation = useUpdateScheduleSlot(slotId);

  if (!Number.isInteger(slotId) || slotId <= 0) {
    return <div className="text-sm text-error">Invalid schedule slot id.</div>;
  }

  const handleSubmit = async (values: ScheduleSlotFormValues) => {
    await updateSlotMutation.mutateAsync(values);
    navigate("/schedule");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={slot ? `Edit ${slot.class_name}` : "Edit Schedule Slot"}
        subtitle="Update trainer assignment, day, and time"
        actions={[
          {
            label: "Back",
            icon: <ArrowLeft className="h-4 w-4" />,
            variant: "outline",
            onClick: () => navigate("/schedule"),
          },
        ]}
      />

      <ConflictDiagnosticsAlert conflicts={extractScheduleConflicts(updateSlotMutation.error)} />

      {classLoading || trainerLoading || slotLoading || !slot ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-text-secondary">
          Loading schedule slot...
        </div>
      ) : (
        <ScheduleSlotForm
          mode="edit"
          classOptions={classData?.results ?? []}
          trainerOptions={trainerOptions}
          initialValues={{
            schedule_class: slot.schedule_class,
            trainer: slot.trainer_id,
            weekday: slot.weekday,
            start_time: slot.start_time,
            end_time: slot.end_time,
            effective_from: slot.effective_from ?? "",
            effective_to: slot.effective_to ?? "",
            notes: slot.notes ?? "",
            is_active: slot.is_active,
          }}
          isSubmitting={updateSlotMutation.isPending}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/schedule")}
        />
      )}
    </div>
  );
}

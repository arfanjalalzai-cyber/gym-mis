import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components";
import ConflictDiagnosticsAlert from "../components/ConflictDiagnosticsAlert";
import ScheduleSlotForm from "../components/ScheduleSlotForm";
import {
  extractScheduleConflicts,
  useCreateScheduleSlot,
  useScheduleClassList,
  useScheduleTrainers,
} from "../queries/useSchedule";
import type { ScheduleSlotFormValues } from "../types/schedule";

export default function AddScheduleSlotPage() {
  const navigate = useNavigate();
  const { data: classData, isLoading: classLoading } = useScheduleClassList({
    page: 1,
    page_size: 200,
    ordering: "name",
    is_active: true,
  });
  const { data: trainerOptions = [], isLoading: trainerLoading } = useScheduleTrainers();
  const createSlotMutation = useCreateScheduleSlot();

  const handleSubmit = async (values: ScheduleSlotFormValues) => {
    await createSlotMutation.mutateAsync(values);
    navigate("/schedule");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Schedule Slot"
        subtitle="Assign a trainer, weekday, and time range"
        actions={[
          {
            label: "Back",
            icon: <ArrowLeft className="h-4 w-4" />,
            variant: "outline",
            onClick: () => navigate("/schedule"),
          },
        ]}
      />

      <ConflictDiagnosticsAlert conflicts={extractScheduleConflicts(createSlotMutation.error)} />

      {classLoading || trainerLoading ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-text-secondary">
          Loading form data...
        </div>
      ) : (
        <ScheduleSlotForm
          mode="create"
          classOptions={classData?.results ?? []}
          trainerOptions={trainerOptions}
          isSubmitting={createSlotMutation.isPending}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/schedule")}
        />
      )}
    </div>
  );
}

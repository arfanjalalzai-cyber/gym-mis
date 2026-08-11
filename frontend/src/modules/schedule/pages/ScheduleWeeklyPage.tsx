import { useMemo } from "react";
import { CalendarDays, Plus, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components";
import { Card, CardContent } from "@/components/ui";
import { useMembersList } from "@/modules/members/queries/useMembers";
import ScheduleFilters from "../components/ScheduleFilters";
import WeeklyScheduleGrid from "../components/WeeklyScheduleGrid";
import { useScheduleFilters } from "../hooks/useScheduleFilters";
import {
  useDeleteScheduleSlot,
  useScheduleClassList,
  useScheduleTrainers,
  useWeeklySchedule,
} from "../queries/useSchedule";

export default function ScheduleWeeklyPage() {
  const navigate = useNavigate();
  const {
    week_start,
    trainer_id,
    class_id,
    weeklyParams,
    updateWeekStart,
    updateTrainerId,
    updateClassId,
  } = useScheduleFilters();

  const { data: classData } = useScheduleClassList({
    page: 1,
    page_size: 200,
    ordering: "name",
    is_active: true,
  });
  const { data: trainerOptions = [] } = useScheduleTrainers();
  const { data: weeklyData, isLoading } = useWeeklySchedule(weeklyParams);
  const { data: activeMembersData } = useMembersList({
    page: 1,
    page_size: 1000,
    status: "active",
  });
  const deleteSlotMutation = useDeleteScheduleSlot();

  const classOptions = useMemo(() => classData?.results ?? [], [classData?.results]);
  const activeMemberCountsBySlot = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const member of activeMembersData?.results ?? []) {
      if (!member.schedule_slot) continue;
      counts[member.schedule_slot] = (counts[member.schedule_slot] ?? 0) + 1;
    }
    return counts;
  }, [activeMembersData?.results]);

  const handleDelete = async (slotId: number) => {
    const confirmed = window.confirm("Delete this schedule slot?");
    if (!confirmed) return;
    await deleteSlotMutation.mutateAsync(slotId);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule"
        subtitle="Weekly timetable with trainer and class filters"
        actions={[
          {
            label: "Manage Classes",
            icon: <Settings2 className="h-4 w-4" />,
            onClick: () => navigate("/schedule/classes"),
            variant: "outline",
          },
          {
            label: "Add Slot",
            icon: <Plus className="h-4 w-4" />,
            onClick: () => navigate("/schedule/new"),
          },
        ]}
      />

      <ScheduleFilters
        weekStart={week_start}
        trainerId={trainer_id}
        classId={class_id}
        trainerOptions={trainerOptions}
        classOptions={classOptions}
        onWeekStartChange={updateWeekStart}
        onTrainerChange={updateTrainerId}
        onClassChange={updateClassId}
      />

      <Card>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="rounded-lg border border-border bg-surface p-8 text-sm text-text-secondary">
              Loading weekly schedule...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <WeeklyScheduleGrid
                days={weeklyData?.days ?? []}
                activeMemberCountsBySlot={activeMemberCountsBySlot}
                deletingSlotId={deleteSlotMutation.isPending ? deleteSlotMutation.variables : null}
                onEdit={(slotId) => navigate(`/schedule/${slotId}/edit`)}
                onDelete={handleDelete}
              />
            </div>
          )}

          {!isLoading && (weeklyData?.days ?? []).every((day) => day.slots.length === 0) && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-text-secondary">
              <CalendarDays className="mx-auto mb-2 h-5 w-5" />
              No schedule slots found for this week and filter selection.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

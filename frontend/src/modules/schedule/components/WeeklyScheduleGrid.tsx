import { Clock, Pencil, Trash2, UserRound, UsersRound } from "lucide-react";

import { Button } from "@/components/ui";
import type { WeeklyScheduleDay } from "../types/schedule";

interface WeeklyScheduleGridProps {
  days: WeeklyScheduleDay[];
  activeMemberCountsBySlot?: Record<number, number>;
  onEdit: (slotId: number) => void;
  onDelete: (slotId: number) => void;
  deletingSlotId?: number | null;
}

export default function WeeklyScheduleGrid({
  days,
  activeMemberCountsBySlot = {},
  onEdit,
  onDelete,
  deletingSlotId = null,
}: WeeklyScheduleGridProps) {
  const totalSlots = days.reduce((count, day) => count + day.slots.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-semibold text-text-primary">Weekly Slots</p>
          <p className="text-sm text-text-secondary">
            {totalSlots} {totalSlots === 1 ? "slot" : "slots"} scheduled this week
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
          <UsersRound className="h-4 w-4" />
          Active members per class
        </div>
      </div>

      <div className="grid min-w-[1180px] overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-7">
        {days.map((day) => (
          <section key={day.weekday} className="flex min-h-[420px] flex-col bg-background">
            <div className="flex items-start justify-between border-b border-border bg-surface px-3 py-3">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">{day.label}</h3>
                <p className="text-xs text-text-secondary">{day.date}</p>
              </div>
              <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                {day.slots.length}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-3">
              {day.slots.length === 0 ? (
                <p className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-border bg-surface px-2 py-2 text-center text-xs text-text-secondary">
                  No classes
                </p>
              ) : (
                day.slots.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    activeMemberCount={activeMemberCountsBySlot[slot.id]}
                    deleting={deletingSlotId === slot.id}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function SlotCard({
  slot,
  activeMemberCount,
  deleting,
  onEdit,
  onDelete,
}: {
  slot: WeeklyScheduleDay["slots"][number];
  activeMemberCount?: number;
  deleting: boolean;
  onEdit: (slotId: number) => void;
  onDelete: (slotId: number) => void;
}) {
  const capacity = slot.class_capacity;
  const activeMembers = activeMemberCount ?? slot.active_member_count ?? 0;
  const availableSpots = capacity === null ? null : Math.max(capacity - activeMembers, 0);
  const occupancyPercent =
    capacity && capacity > 0 ? Math.min(100, Math.round((activeMembers / capacity) * 100)) : 0;

  return (
    <article className="flex min-h-[235px] flex-col rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex flex-1 flex-col gap-3">
        <div>
          <p className="break-words text-sm font-semibold leading-5 text-text-primary">{slot.class_name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
            <span className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1">
              <Clock className="h-3.5 w-3.5" />
              {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1">
              <UserRound className="h-3.5 w-3.5" />
              {slot.trainer_name}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-text-primary">Members</span>
            <span className="font-semibold text-text-primary">
              {activeMembers} / {capacity ?? "No limit"}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: capacity ? `${occupancyPercent}%` : "0%" }}
            />
          </div>
          <p className="mt-2 text-xs text-text-secondary">
            {availableSpots === null
              ? "Capacity not set"
              : availableSpots === 0
                ? "Class is full"
                : `${availableSpots} spots available`}
          </p>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full min-w-0 px-2"
            onClick={() => onEdit(slot.id)}
            leftIcon={<Pencil className="h-3.5 w-3.5" />}
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            className="w-full min-w-0 px-2"
            loading={deleting}
            onClick={() => onDelete(slot.id)}
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
          >
            Delete
          </Button>
        </div>
      </div>
    </article>
  );
}

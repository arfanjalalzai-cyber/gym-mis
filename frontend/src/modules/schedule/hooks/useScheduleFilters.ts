import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { useScheduleStore } from "../stores/useScheduleStore";
import type { WeeklyScheduleParams } from "../types/schedule";

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCurrentWeekStart = () => {
  const today = new Date();
  const weekday = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - weekday);
  return formatLocalDate(monday);
};

const parsePositiveIntOrNull = (value: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const useScheduleFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { week_start, trainer_id, class_id, setWeekStart, setTrainerId, setClassId } =
    useScheduleStore();

  useEffect(() => {
    const urlWeekStart = searchParams.get("week_start") ?? getCurrentWeekStart();
    const urlTrainerId = parsePositiveIntOrNull(searchParams.get("trainer_id"));
    const urlClassId = parsePositiveIntOrNull(searchParams.get("class_id"));

    if (week_start !== urlWeekStart) setWeekStart(urlWeekStart);
    if (trainer_id !== urlTrainerId) setTrainerId(urlTrainerId);
    if (class_id !== urlClassId) setClassId(urlClassId);
  }, [
    class_id,
    searchParams,
    setClassId,
    setTrainerId,
    setWeekStart,
    trainer_id,
    week_start,
  ]);

  const updateWeekStart = useCallback(
    (value: string) => {
      setWeekStart(value);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value.trim()) {
          next.set("week_start", value);
        } else {
          next.delete("week_start");
        }
        return next;
      });
    },
    [setSearchParams, setWeekStart]
  );

  const updateTrainerId = useCallback(
    (value: number | null) => {
      setTrainerId(value);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set("trainer_id", String(value));
        } else {
          next.delete("trainer_id");
        }
        return next;
      });
    },
    [setSearchParams, setTrainerId]
  );

  const updateClassId = useCallback(
    (value: number | null) => {
      setClassId(value);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set("class_id", String(value));
        } else {
          next.delete("class_id");
        }
        return next;
      });
    },
    [setClassId, setSearchParams]
  );

  const weeklyParams: WeeklyScheduleParams = {
    week_start,
    trainer_id: trainer_id ?? undefined,
    class_id: class_id ?? undefined,
  };

  return {
    week_start,
    trainer_id,
    class_id,
    weeklyParams,
    updateWeekStart,
    updateTrainerId,
    updateClassId,
  };
};

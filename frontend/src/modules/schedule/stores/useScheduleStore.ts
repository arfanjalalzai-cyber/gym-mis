import { create } from "zustand";

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

interface ScheduleStoreState {
  week_start: string;
  trainer_id: number | null;
  class_id: number | null;
  setWeekStart: (weekStart: string) => void;
  setTrainerId: (trainerId: number | null) => void;
  setClassId: (classId: number | null) => void;
  resetFilters: () => void;
}

export const useScheduleStore = create<ScheduleStoreState>((set) => ({
  week_start: getCurrentWeekStart(),
  trainer_id: null,
  class_id: null,

  setWeekStart: (week_start) => set({ week_start }),
  setTrainerId: (trainer_id) => set({ trainer_id }),
  setClassId: (class_id) => set({ class_id }),
  resetFilters: () =>
    set({
      week_start: getCurrentWeekStart(),
      trainer_id: null,
      class_id: null,
    }),
}));

import { useMemo } from "react";
import jalaali from "jalaali-js";

import { useSystemPreferences } from "../queries";
import type { SystemPreferenceSettings } from "../types";

const defaultPreferences: SystemPreferenceSettings = {
  calendar_system: "gregorian",
  date_format: "YYYY-MM-DD",
  time_format: "24h",
  timezone: "Asia/Kabul",
};

const datePartFormatters = {
  year: new Intl.DateTimeFormat("en-CA", { year: "numeric" }),
  month: new Intl.DateTimeFormat("en-CA", { month: "2-digit" }),
  day: new Intl.DateTimeFormat("en-CA", { day: "2-digit" }),
};

const getGregorianDateParts = (date: Date, timezone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: parts.find((part) => part.type === "year")?.value ?? datePartFormatters.year.format(date),
    month: parts.find((part) => part.type === "month")?.value ?? datePartFormatters.month.format(date),
    day: parts.find((part) => part.type === "day")?.value ?? datePartFormatters.day.format(date),
  };
};

const getCalendarDateParts = (date: Date, preferences: SystemPreferenceSettings) => {
  if (preferences.calendar_system === "hijri_shamsi") {
    const { year, month, day } = getGregorianDateParts(date, preferences.timezone);
    const converted = jalaali.toJalaali(Number(year), Number(month), Number(day));
    return {
      year: String(converted.jy),
      month: String(converted.jm).padStart(2, "0"),
      day: String(converted.jd).padStart(2, "0"),
    };
  }

  if (preferences.calendar_system === "hijri_qamari") {
    const parts = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura", {
      timeZone: preferences.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);

    return {
      year: parts.find((part) => part.type === "year")?.value ?? "",
      month: parts.find((part) => part.type === "month")?.value ?? "",
      day: parts.find((part) => part.type === "day")?.value ?? "",
    };
  }

  return getGregorianDateParts(date, preferences.timezone);
};

const parseDate = (value: string | null | undefined) => {
  if (!value) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
};

const applyDateFormat = (dateFormat: string, year: string, month: string, day: string) => {
  if (dateFormat === "DD/MM/YYYY") return `${day}/${month}/${year}`;
  if (dateFormat === "MM/DD/YYYY") return `${month}/${day}/${year}`;
  return `${year}-${month}-${day}`;
};

export function useSystemPreferenceFormatters() {
  const preferencesQuery = useSystemPreferences();
  const preferences = preferencesQuery.data ?? defaultPreferences;

  return useMemo(() => {
    const formatDate = (value: string | null | undefined) => {
      const parsed = parseDate(value);
      if (!parsed) return value || "--";

      try {
        const { year, month, day } = getCalendarDateParts(parsed, preferences);
        return applyDateFormat(preferences.date_format, year, month, day);
      } catch {
        return value || "--";
      }
    };

    const formatDateTime = (value: string | null | undefined) => {
      const parsed = parseDate(value);
      if (!parsed) return value || "--";

      try {
        const dateText = formatDate(value);
        const timeText = new Intl.DateTimeFormat("en-US", {
          timeZone: preferences.timezone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: preferences.time_format === "12h",
        }).format(parsed);
        return `${dateText} ${timeText}`;
      } catch {
        return value || "--";
      }
    };

    return {
      preferences,
      formatDate,
      formatDateTime,
    };
  }, [preferences]);
}

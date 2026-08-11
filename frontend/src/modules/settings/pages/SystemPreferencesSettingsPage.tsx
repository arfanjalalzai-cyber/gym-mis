import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components";
import { Button, Card, CardContent, CardHeader, Input } from "@/components/ui";

import { useSystemPreferences, useUpdateSystemPreferences } from "../queries";
import type { SystemPreferenceSettings } from "../types";

const defaultPreferences: SystemPreferenceSettings = {
  calendar_system: "gregorian",
  date_format: "YYYY-MM-DD",
  time_format: "24h",
  timezone: "Asia/Kabul",
};

const calendarSystems = [
  { value: "gregorian", label: "Gregorian / میلادي" },
  { value: "hijri_shamsi", label: "Hijri Shamsi / هجري شمسي" },
  { value: "hijri_qamari", label: "Hijri Qamari / هجري قمري" },
] as const;
const dateFormats = ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"];
const timeFormats = ["24h", "12h"];

export default function SystemPreferencesSettingsPage() {
  const navigate = useNavigate();
  const preferencesQuery = useSystemPreferences();
  const updateMutation = useUpdateSystemPreferences();
  const [form, setForm] = useState<SystemPreferenceSettings>(defaultPreferences);

  useEffect(() => {
    if (!preferencesQuery.data) return;
    setForm(preferencesQuery.data);
  }, [preferencesQuery.data]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    updateMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Preferences"
        subtitle="Set default date/time formats and timezone."
        actions={[
          {
            label: "Back",
            variant: "outline",
            onClick: () => navigate("/settings"),
          },
        ]}
      />

      <Card>
        <CardHeader title="Regional Preferences" />
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Calendar</label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={form.calendar_system}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      calendar_system: e.target.value as SystemPreferenceSettings["calendar_system"],
                    }))
                  }
                >
                  {calendarSystems.map((calendar) => (
                    <option key={calendar.value} value={calendar.value}>
                      {calendar.label}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Timezone"
                value={form.timezone}
                onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Date Format</label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={form.date_format}
                  onChange={(e) => setForm((prev) => ({ ...prev, date_format: e.target.value }))}
                >
                  {dateFormats.map((format) => (
                    <option key={format} value={format}>
                      {format}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Time Format</label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={form.time_format}
                  onChange={(e) => setForm((prev) => ({ ...prev, time_format: e.target.value }))}
                >
                  {timeFormats.map((format) => (
                    <option key={format} value={format}>
                      {format}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={updateMutation.isPending || preferencesQuery.isLoading}>
                Save System Preferences
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

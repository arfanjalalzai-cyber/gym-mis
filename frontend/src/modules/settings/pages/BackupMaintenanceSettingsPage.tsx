import { useEffect, useState } from "react";
import { ChevronLeft, Folder, FolderOpen, HardDrive, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components";
import { Button, Card, CardContent, CardHeader, Input, Modal, Spinner } from "@/components/ui";

import { BackupJobsTable } from "../components";
import { useSystemPreferenceFormatters } from "../hooks";
import {
  useBackupSchedule,
  useBackups,
  useRestoreBackup,
  useRunManualBackup,
  useSystemLogs,
  useUpdateBackupSchedule,
} from "../queries";
import { settingsService } from "../services";
import type { BackupDirectoryBrowseResponse, BackupScheduleSettings } from "../types";

const defaultSchedule: BackupScheduleSettings = {
  enabled: false,
  frequency: "daily",
  run_time: "02:00",
  weekday: 0,
  retention_count: 7,
  backup_directory: "",
};

export default function BackupMaintenanceSettingsPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<BackupScheduleSettings>(defaultSchedule);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserLoading, setBrowserLoading] = useState(false);
  const [browserData, setBrowserData] = useState<BackupDirectoryBrowseResponse | null>(null);
  const { formatDateTime } = useSystemPreferenceFormatters();

  const scheduleQuery = useBackupSchedule();
  const backupsQuery = useBackups({ page: 1, page_size: 25 });
  const systemLogsQuery = useSystemLogs({ limit: 20 });

  const runManualMutation = useRunManualBackup();
  const updateScheduleMutation = useUpdateBackupSchedule();
  const restoreMutation = useRestoreBackup();

  useEffect(() => {
    if (!scheduleQuery.data) return;
    setForm({
      ...scheduleQuery.data,
      run_time: (scheduleQuery.data.run_time || "02:00").slice(0, 5),
    });
  }, [scheduleQuery.data]);

  const onSaveSchedule = (event: React.FormEvent) => {
    event.preventDefault();
    updateScheduleMutation.mutate(form);
  };

  const loadDirectory = async (path?: string) => {
    setBrowserLoading(true);
    try {
      const response = await settingsService.browseBackupDirectories(path);
      setBrowserData(response.data);
    } catch {
      toast.error("Unable to open this folder.");
    } finally {
      setBrowserLoading(false);
    }
  };

  const openDirectoryBrowser = () => {
    setBrowserOpen(true);
    void loadDirectory(form.backup_directory || undefined);
  };

  const selectCurrentDirectory = () => {
    if (!browserData?.path) return;
    setForm((prev) => ({ ...prev, backup_directory: browserData.path }));
    setBrowserOpen(false);
  };

  const onRestore = (id: number) => {
    const confirmed = window.confirm(
      "Restore this backup? This replaces the current SQLite database."
    );
    if (!confirmed) return;

    setRestoringId(id);
    restoreMutation.mutate(id, {
      onSettled: () => setRestoringId(null),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backup & Maintenance"
        subtitle="Run manual backups, configure schedule, restore data, and monitor system logs."
        actions={[
          {
            label: "Back",
            variant: "outline",
            onClick: () => navigate("/settings"),
          },
        ]}
      />

      <Card>
        <CardHeader
          title="Manual Backup"
          subtitle="Phase 1 uses SQLite file backup/restore."
        />
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-secondary">
            Run an immediate backup job and store it in the configured backup directory.
          </p>
          <Button
            type="button"
            onClick={() => runManualMutation.mutate()}
            loading={runManualMutation.isPending}
          >
            Run Manual Backup
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Backup Schedule" />
        <CardContent>
          <form className="space-y-4" onSubmit={onSaveSchedule}>
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
              />
              Enable Scheduled Backups
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Frequency</label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={form.frequency}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      frequency: e.target.value as BackupScheduleSettings["frequency"],
                    }))
                  }
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <Input
                label="Run Time"
                type="time"
                value={form.run_time}
                onChange={(e) => setForm((prev) => ({ ...prev, run_time: e.target.value }))}
              />

              <Input
                label="Weekday (0-6)"
                type="number"
                value={String(form.weekday)}
                onChange={(e) => setForm((prev) => ({ ...prev, weekday: Number(e.target.value || 0) }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Retention Count"
                type="number"
                value={String(form.retention_count)}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, retention_count: Number(e.target.value || 1) }))
                }
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                  Backup Directory
                </label>
                <div className="flex gap-2">
                  <Input
                    value={form.backup_directory}
                    placeholder="D:\\GymBackups"
                    onChange={(e) => setForm((prev) => ({ ...prev, backup_directory: e.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openDirectoryBrowser}
                    leftIcon={<FolderOpen className="h-4 w-4" />}
                  >
                    Browse
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setForm((prev) => ({ ...prev, backup_directory: "Desktop" }))}
                    leftIcon={<Home className="h-3.5 w-3.5" />}
                  >
                    Desktop
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setForm((prev) => ({ ...prev, backup_directory: "" }))}
                  >
                    Default
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-xs text-text-secondary">
              Leave empty for the default backend backups folder, use Desktop for your Windows Desktop, or enter a full path like D:\GymBackups.
              Current save location: {scheduleQuery.data?.resolved_backup_directory || "default backups folder"}.
            </p>

            <div className="flex justify-end">
              <Button type="submit" loading={updateScheduleMutation.isPending || scheduleQuery.isLoading}>
                Save Schedule
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <BackupJobsTable
        jobs={backupsQuery.data?.results ?? []}
        restoringId={restoringId}
        onRestore={onRestore}
      />

      <Card>
        <CardHeader title="System Logs" subtitle="Latest application activity log entries." />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">Table</th>
                  <th className="py-2 pr-4">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {(systemLogsQuery.data?.results ?? []).map((log) => (
                  <tr key={log.id} className="border-b border-border/60">
                    <td className="py-2 pr-4">{log.user_name}</td>
                    <td className="py-2 pr-4 capitalize">{log.action}</td>
                    <td className="py-2 pr-4">{log.table_name || "-"}</td>
                    <td className="py-2 pr-4">{formatDateTime(log.timestamp)}</td>
                  </tr>
                ))}
                {(systemLogsQuery.data?.results ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-text-secondary">
                      No logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={browserOpen}
        onClose={() => setBrowserOpen(false)}
        title="Choose Backup Folder"
        description="Browse folders on this computer and select where backups should be saved."
        size="full"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setBrowserOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={selectCurrentDirectory} disabled={!browserData?.path}>
              Use This Folder
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-xs font-medium uppercase text-text-secondary">Current Folder</p>
            <p className="mt-1 break-all text-sm font-semibold text-text-primary">
              {browserData?.path ?? "Loading..."}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <div className="space-y-3">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-text-secondary">Quick Locations</p>
                <div className="space-y-1">
                  {(browserData?.quick_locations ?? []).map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => void loadDirectory(item.path)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
                    >
                      <Home className="h-4 w-4 text-text-secondary" />
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-text-secondary">Drives</p>
                <div className="space-y-1">
                  {(browserData?.drives ?? []).map((drive) => (
                    <button
                      key={drive.path}
                      type="button"
                      onClick={() => void loadDirectory(drive.path)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
                    >
                      <HardDrive className="h-4 w-4 text-text-secondary" />
                      {drive.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="min-h-[320px] rounded-lg border border-border">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!browserData?.parent || browserLoading}
                  onClick={() => browserData?.parent && void loadDirectory(browserData.parent)}
                  leftIcon={<ChevronLeft className="h-4 w-4" />}
                >
                  Up
                </Button>
                {browserLoading && (
                  <span className="flex items-center gap-2 text-sm text-text-secondary">
                    <Spinner size="sm" />
                    Loading...
                  </span>
                )}
              </div>

              <div className="max-h-[420px] overflow-y-auto p-2">
                {!browserLoading && (browserData?.directories ?? []).length === 0 ? (
                  <p className="p-4 text-center text-sm text-text-secondary">No folders found here.</p>
                ) : (
                  (browserData?.directories ?? []).map((directory) => (
                    <button
                      key={directory.path}
                      type="button"
                      onClick={() => void loadDirectory(directory.path)}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
                    >
                      <Folder className="h-4 w-4 text-primary" />
                      <span className="truncate">{directory.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

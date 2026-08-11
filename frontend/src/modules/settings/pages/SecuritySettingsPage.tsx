import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components";
import { Button, Card, CardContent, CardHeader, Input } from "@/components/ui";

import { useSystemPreferenceFormatters } from "../hooks";
import {
  useSecurityActivityLogs,
  useSecuritySettings,
  useUpdateSecuritySettings,
} from "../queries";
import type { SecuritySettings } from "../types";

const defaultSecuritySettings: SecuritySettings = {
  min_password_length: 8,
  require_uppercase: true,
  require_lowercase: true,
  require_number: true,
  require_special: false,
  two_factor_enabled: false,
  login_attempt_limit: 5,
  lockout_minutes: 30,
};

export default function SecuritySettingsPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SecuritySettings>(defaultSecuritySettings);
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const { formatDateTime } = useSystemPreferenceFormatters();

  const securityQuery = useSecuritySettings();
  const updateMutation = useUpdateSecuritySettings();
  const logsQuery = useSecurityActivityLogs({
    page: 1,
    action: actionFilter || undefined,
    user: userFilter || undefined,
  });

  useEffect(() => {
    if (!securityQuery.data) return;
    setForm(securityQuery.data);
  }, [securityQuery.data]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    updateMutation.mutate(form);
  };

  const logs = logsQuery.data?.results ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Settings"
        subtitle="Configure password policy, optional 2FA flag, login lockout, and review recent activity."
        actions={[
          {
            label: "Back",
            variant: "outline",
            onClick: () => navigate("/settings"),
          },
        ]}
      />

      <Card>
        <CardHeader title="Security Policy" />
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Min Password Length"
                type="number"
                min={6}
                max={128}
                value={String(form.min_password_length)}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    min_password_length: Number(e.target.value || 8),
                  }))
                }
              />
              <Input
                label="Login Attempt Limit"
                type="number"
                min={1}
                max={20}
                value={String(form.login_attempt_limit)}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    login_attempt_limit: Number(e.target.value || 5),
                  }))
                }
              />
              <Input
                label="Lockout Minutes"
                type="number"
                min={1}
                max={1440}
                value={String(form.lockout_minutes)}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    lockout_minutes: Number(e.target.value || 30),
                  }))
                }
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={form.require_uppercase}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, require_uppercase: e.target.checked }))
                  }
                />
                Require Uppercase Letter
              </label>
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={form.require_lowercase}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, require_lowercase: e.target.checked }))
                  }
                />
                Require Lowercase Letter
              </label>
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={form.require_number}
                  onChange={(e) => setForm((prev) => ({ ...prev, require_number: e.target.checked }))}
                />
                Require Number
              </label>
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={form.require_special}
                  onChange={(e) => setForm((prev) => ({ ...prev, require_special: e.target.checked }))}
                />
                Require Special Character
              </label>
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={form.two_factor_enabled}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, two_factor_enabled: e.target.checked }))
                  }
                />
                Two-Factor Authentication Flag (Phase 1)
              </label>
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={updateMutation.isPending || securityQuery.isLoading}>
                Save Security Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Activity Logs" subtitle="Filtered view of recent user activity logs." />
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              label="Action"
              placeholder="create, update, delete..."
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            />
            <Input
              label="User"
              placeholder="username"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            />
            <div className="flex items-end">
              <Button type="button" variant="outline" onClick={() => logsQuery.refetch()}>
                Refresh Logs
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">Table</th>
                  <th className="py-2 pr-4">IP</th>
                  <th className="py-2 pr-4">Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border/60">
                    <td className="py-2 pr-4">{log.user_name}</td>
                    <td className="py-2 pr-4 capitalize">{log.action}</td>
                    <td className="py-2 pr-4">{log.table_name || "-"}</td>
                    <td className="py-2 pr-4">{log.ip_address || "-"}</td>
                    <td className="py-2 pr-4">{formatDateTime(log.timestamp)}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-text-secondary">
                      No activity logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

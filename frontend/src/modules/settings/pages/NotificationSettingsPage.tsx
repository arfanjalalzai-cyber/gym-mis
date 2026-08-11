import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components";
import { Button, Card, CardContent, CardHeader, Input } from "@/components/ui";

import {
  useNotificationSettings,
  useTestNotificationEmail,
  useTestNotificationSms,
  useUpdateNotificationSettings,
} from "../queries";
import type { NotificationSettingsPayload } from "../types";

const defaultNotificationForm: NotificationSettingsPayload = {
  membership_expiry_alert_enabled: true,
  membership_expiry_days_before: 7,
  payment_due_reminder_enabled: true,
  payment_due_days_before: 3,
  sms_enabled: false,
  sms_provider: "",
  sms_sender_id: "",
  sms_api_key: "",
  email_enabled: false,
  smtp_host: "",
  smtp_port: 587,
  smtp_username: "",
  smtp_password: "",
  from_email: "",
};

export default function NotificationSettingsPage() {
  const navigate = useNavigate();
  const notificationQuery = useNotificationSettings();
  const updateMutation = useUpdateNotificationSettings();
  const testEmailMutation = useTestNotificationEmail();
  const testSmsMutation = useTestNotificationSms();

  const [form, setForm] = useState<NotificationSettingsPayload>(defaultNotificationForm);

  useEffect(() => {
    if (!notificationQuery.data) return;
    setForm({ ...defaultNotificationForm, ...notificationQuery.data });
  }, [notificationQuery.data]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    updateMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Settings"
        subtitle="Configure membership expiry and payment due reminders with SMS/Email channel options."
        actions={[
          {
            label: "Back",
            variant: "outline",
            onClick: () => navigate("/settings"),
          },
        ]}
      />

      <Card>
        <CardHeader title="Reminder Rules" />
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={form.membership_expiry_alert_enabled}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, membership_expiry_alert_enabled: e.target.checked }))
                  }
                />
                Membership Expiry Alerts
              </label>
              <Input
                label="Expiry Alert Days Before"
                type="number"
                value={String(form.membership_expiry_days_before)}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, membership_expiry_days_before: Number(e.target.value || 1) }))
                }
              />
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={form.payment_due_reminder_enabled}
                  onChange={(e) => setForm((prev) => ({ ...prev, payment_due_reminder_enabled: e.target.checked }))}
                />
                Payment Due Reminders
              </label>
              <Input
                label="Payment Reminder Days Before"
                type="number"
                value={String(form.payment_due_days_before)}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, payment_due_days_before: Number(e.target.value || 1) }))
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card padding="sm">
                <CardHeader title="Email Integration" />
                <CardContent className="space-y-3">
                  <label className="flex items-center gap-2 text-sm text-text-primary">
                    <input
                      type="checkbox"
                      checked={form.email_enabled}
                      onChange={(e) => setForm((prev) => ({ ...prev, email_enabled: e.target.checked }))}
                    />
                    Enable Email
                  </label>
                  <Input
                    label="SMTP Host"
                    value={form.smtp_host}
                    onChange={(e) => setForm((prev) => ({ ...prev, smtp_host: e.target.value }))}
                  />
                  <Input
                    label="SMTP Port"
                    type="number"
                    value={String(form.smtp_port)}
                    onChange={(e) => setForm((prev) => ({ ...prev, smtp_port: Number(e.target.value || 587) }))}
                  />
                  <Input
                    label="SMTP Username"
                    value={form.smtp_username}
                    onChange={(e) => setForm((prev) => ({ ...prev, smtp_username: e.target.value }))}
                  />
                  <Input
                    label="SMTP Password"
                    type="password"
                    value={form.smtp_password || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, smtp_password: e.target.value }))}
                  />
                  <Input
                    label="From Email"
                    type="email"
                    value={form.from_email}
                    onChange={(e) => setForm((prev) => ({ ...prev, from_email: e.target.value }))}
                  />

                  <Button type="button" variant="outline" onClick={() => testEmailMutation.mutate()} loading={testEmailMutation.isPending}>
                    Test Email Configuration
                  </Button>
                </CardContent>
              </Card>

              <Card padding="sm">
                <CardHeader title="SMS Integration" />
                <CardContent className="space-y-3">
                  <label className="flex items-center gap-2 text-sm text-text-primary">
                    <input
                      type="checkbox"
                      checked={form.sms_enabled}
                      onChange={(e) => setForm((prev) => ({ ...prev, sms_enabled: e.target.checked }))}
                    />
                    Enable SMS
                  </label>
                  <Input
                    label="SMS Provider"
                    value={form.sms_provider}
                    onChange={(e) => setForm((prev) => ({ ...prev, sms_provider: e.target.value }))}
                  />
                  <Input
                    label="SMS Sender ID"
                    value={form.sms_sender_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, sms_sender_id: e.target.value }))}
                  />
                  <Input
                    label="SMS API Key"
                    type="password"
                    value={form.sms_api_key || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, sms_api_key: e.target.value }))}
                  />

                  <Button type="button" variant="outline" onClick={() => testSmsMutation.mutate()} loading={testSmsMutation.isPending}>
                    Test SMS Configuration
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={updateMutation.isPending || notificationQuery.isLoading}>
                Save Notification Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import { AlertTriangle, Clock } from "lucide-react";

import { Card, CardContent, Skeleton } from "@/components/ui";
import { useSystemPreferenceFormatters } from "@/modules/settings/hooks";
import type {
  ExpiredMembershipAlert,
  PaymentDueAlert,
} from "../types/dashboard";

interface DashboardAlertsPanelProps {
  expiredMembershipAlerts: ExpiredMembershipAlert[];
  paymentDueAlerts: PaymentDueAlert[];
  expiredMembershipsTotal: number;
  paymentDueMembersTotal: number;
  loading?: boolean;
  currency?: string;
}

const formatMoney = (value: string, currency = "AFN") =>
  `${currency} ${Number(value).toLocaleString()}`;

export default function DashboardAlertsPanel({
  expiredMembershipAlerts,
  paymentDueAlerts,
  expiredMembershipsTotal,
  paymentDueMembersTotal,
  loading = false,
  currency = "AFN",
}: DashboardAlertsPanelProps) {
  const { formatDate } = useSystemPreferenceFormatters();
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-text-primary">Notifications</h3>
          <p className="text-xs text-text-secondary">
            Expired Memberships: {expiredMembershipsTotal} | Payment Due: {paymentDueMembersTotal}
          </p>
        </div>
        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton variant="rounded" height={220} />
            <Skeleton variant="rounded" height={220} />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-warning/40 bg-warning-soft/60 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <h4 className="text-sm font-semibold text-text-primary">
                  Expired Membership Alerts
                </h4>
              </div>
              {expiredMembershipAlerts.length === 0 ? (
                <p className="text-sm text-text-secondary">No expired membership alerts.</p>
              ) : (
                <ul className="space-y-2">
                  {expiredMembershipAlerts.map((alert) => (
                    <li key={alert.member_id} className="rounded-lg bg-card/80 p-3">
                      <p className="text-sm font-medium text-text-primary">
                        {alert.member_name} ({alert.member_code})
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        Expiry: {alert.membership_expiry_date ? formatDate(alert.membership_expiry_date) : "--"}
                        {alert.days_overdue !== null
                          ? ` | ${alert.days_overdue} day(s) overdue`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="space-y-3 rounded-xl border border-error/40 bg-error-soft/60 p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-error" />
                <h4 className="text-sm font-semibold text-text-primary">Payment Due Alerts</h4>
              </div>
              {paymentDueAlerts.length === 0 ? (
                <p className="text-sm text-text-secondary">No payment due alerts.</p>
              ) : (
                <ul className="space-y-2">
                  {paymentDueAlerts.map((alert) => (
                    <li key={alert.member_id} className="rounded-lg bg-card/80 p-3">
                      <p className="text-sm font-medium text-text-primary">
                        {alert.member_name} ({alert.member_code})
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        Due: {formatMoney(alert.remaining_balance, currency)} | Cycles:{" "}
                        {alert.outstanding_cycles_count}
                      </p>
                      <p className="text-xs text-text-secondary">
                        Oldest cycle: {alert.oldest_unpaid_cycle_month ? formatDate(alert.oldest_unpaid_cycle_month) : "No paid cycle"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

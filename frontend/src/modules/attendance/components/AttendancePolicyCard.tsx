import { useEffect, useState } from "react";

import { Button, Card, CardContent } from "@/components/ui";
import { useAttendancePolicy, useUpdateAttendancePolicy } from "../queries/useAttendance";

export default function AttendancePolicyCard() {
  const { data: policy, isLoading } = useAttendancePolicy();
  const updatePolicy = useUpdateAttendancePolicy();

  const [blockFutureDates, setBlockFutureDates] = useState(true);
  const [lateDeductionEnabled, setLateDeductionEnabled] = useState(true);
  const [lateDeductionFraction, setLateDeductionFraction] = useState("0.50");
  const [absentDeductionFraction, setAbsentDeductionFraction] = useState("1.00");
  const [leaveIsPaid, setLeaveIsPaid] = useState(true);
  const [monthlyPaidLeaveDays, setMonthlyPaidLeaveDays] = useState("3");
  const [missingAsAbsent, setMissingAsAbsent] = useState(false);

  useEffect(() => {
    if (!policy) return;
    setBlockFutureDates(policy.block_future_dates);
    setLateDeductionEnabled(policy.late_deduction_enabled);
    setLateDeductionFraction(policy.late_deduction_fraction);
    setAbsentDeductionFraction(policy.absent_deduction_fraction);
    setLeaveIsPaid(policy.leave_is_paid);
    setMonthlyPaidLeaveDays(String(policy.monthly_paid_leave_days));
    setMissingAsAbsent(policy.missing_as_absent);
  }, [policy]);

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div>
          <h3 className="text-base font-semibold text-text-primary">Attendance Policy</h3>
          <p className="mt-1 text-sm text-text-secondary">
            Configure salary deduction for marked absences, late arrivals and date restrictions.
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-lg border border-border p-4 text-sm text-text-secondary">
            Loading policy...
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={blockFutureDates}
                onChange={(event) => setBlockFutureDates(event.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              Block future attendance dates
            </label>

            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={lateDeductionEnabled}
                onChange={(event) => setLateDeductionEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              Late arrivals deduct salary
            </label>

            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={missingAsAbsent}
                onChange={(event) => setMissingAsAbsent(event.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              Missing records count as absent
            </label>

            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={leaveIsPaid}
                onChange={(event) => setLeaveIsPaid(event.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              Leave is paid
            </label>

            <p className="md:col-span-2 text-xs text-text-secondary">
              Missing records count as absent is off by default to avoid salary deduction for new staff or unmarked days.
            </p>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Late deduction fraction (0 to 1)
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={lateDeductionFraction}
                onChange={(event) => setLateDeductionFraction(event.target.value)}
                disabled={!lateDeductionEnabled}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Absent deduction fraction (0 to 1)
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={absentDeductionFraction}
                onChange={(event) => setAbsentDeductionFraction(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Monthly paid leave days
              </label>
              <input
                type="number"
                min="0"
                max="31"
                step="1"
                value={monthlyPaidLeaveDays}
                onChange={(event) => setMonthlyPaidLeaveDays(event.target.value)}
                disabled={!leaveIsPaid}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button
                type="button"
                loading={updatePolicy.isPending}
                onClick={() =>
                  updatePolicy.mutate({
                    block_future_dates: blockFutureDates,
                    late_deduction_enabled: lateDeductionEnabled,
                    late_deduction_fraction: Number(lateDeductionFraction),
                    absent_deduction_fraction: Number(absentDeductionFraction),
                    leave_is_paid: leaveIsPaid,
                    monthly_paid_leave_days: Number(monthlyPaidLeaveDays),
                    missing_as_absent: missingAsAbsent,
                  })
                }
              >
                Save Policy
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

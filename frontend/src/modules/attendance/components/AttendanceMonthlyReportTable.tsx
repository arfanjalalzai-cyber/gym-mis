import { Card, CardContent } from "@/components/ui";
import type { AttendanceMonthlyReportRow } from "../types/attendance";

interface AttendanceMonthlyReportTableProps {
  rows: AttendanceMonthlyReportRow[];
  loading?: boolean;
}

const formatMoney = (value: string, currency: string) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return `${value} ${currency}`;
  return `${amount.toFixed(2)} ${currency}`;
};

export default function AttendanceMonthlyReportTable({
  rows,
  loading = false,
}: AttendanceMonthlyReportTableProps) {
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <h3 className="text-base font-semibold text-text-primary">Monthly Attendance Report</h3>

        {loading ? (
          <div className="rounded-lg border border-border p-6 text-sm text-text-secondary">
            Loading monthly report...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-border p-6 text-sm text-text-secondary">
            No attendance report rows found for selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[1060px] text-sm">
              <thead className="bg-surface">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-text-primary">Staff</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-primary">Present</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-primary">Absent</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-primary">Late</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-primary">Leave</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-primary">Missing</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-primary">Base Salary</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-primary">Payable Salary</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-primary">Deduction</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.staff_id} className="border-t border-border">
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-text-primary">{row.staff_name}</div>
                      <div className="text-xs text-text-secondary">
                        {row.staff_code} | {row.position}
                      </div>
                    </td>
                    <td className="px-4 py-3">{row.present_days}</td>
                    <td className="px-4 py-3">{row.absent_days}</td>
                    <td className="px-4 py-3">{row.late_days}</td>
                    <td className="px-4 py-3">{row.leave_days}</td>
                    <td className="px-4 py-3">{row.missing_days}</td>
                    <td className="px-4 py-3">{formatMoney(row.base_salary, row.currency)}</td>
                    <td className="px-4 py-3">{formatMoney(row.payable_salary, row.currency)}</td>
                    <td className="px-4 py-3">{formatMoney(row.deduction_amount, row.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


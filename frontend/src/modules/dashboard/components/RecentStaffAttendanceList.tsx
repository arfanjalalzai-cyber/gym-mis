import { Card, CardContent, SkeletonTable } from "@/components/ui";
import { useSystemPreferenceFormatters } from "@/modules/settings/hooks";
import type { RecentStaffAttendance } from "../types/dashboard";

interface RecentStaffAttendanceListProps {
  rows: RecentStaffAttendance[];
  loading?: boolean;
}

const formatStatus = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

export default function RecentStaffAttendanceList({
  rows,
  loading = false,
}: RecentStaffAttendanceListProps) {
  const { formatDate } = useSystemPreferenceFormatters();
  return (
    <Card>
      <CardContent className="space-y-4">
        <h3 className="text-base font-semibold text-text-primary">Recent Staff Attendance</h3>
        {loading ? (
          <SkeletonTable rows={4} />
        ) : rows.length === 0 ? (
          <p className="text-sm text-text-secondary">No recent attendance activity.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="px-2 py-2 font-medium">Staff</th>
                  <th className="px-2 py-2 font-medium">Code</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.record_id} className="border-b border-border/60 last:border-b-0">
                    <td className="px-2 py-2 text-text-primary">{row.staff_name}</td>
                    <td className="px-2 py-2 text-text-secondary">{row.staff_code}</td>
                    <td className="px-2 py-2 text-text-secondary">
                      {formatStatus(row.status)}
                    </td>
                    <td className="px-2 py-2 text-text-secondary">
                      {formatDate(row.attendance_date)}
                    </td>
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

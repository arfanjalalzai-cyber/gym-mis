import { Card, CardContent, SkeletonTable } from "@/components/ui";
import { useSystemPreferenceFormatters } from "@/modules/settings/hooks";
import type { RecentMemberRegistration } from "../types/dashboard";

interface RecentMemberRegistrationsListProps {
  rows: RecentMemberRegistration[];
  loading?: boolean;
}

export default function RecentMemberRegistrationsList({
  rows,
  loading = false,
}: RecentMemberRegistrationsListProps) {
  const { formatDate } = useSystemPreferenceFormatters();
  return (
    <Card>
      <CardContent className="space-y-4">
        <h3 className="text-base font-semibold text-text-primary">
          Recent Member Registrations
        </h3>
        {loading ? (
          <SkeletonTable rows={4} />
        ) : rows.length === 0 ? (
          <p className="text-sm text-text-secondary">No recent member registrations.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="px-2 py-2 font-medium">Member</th>
                  <th className="px-2 py-2 font-medium">Code</th>
                  <th className="px-2 py-2 font-medium">Join Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.member_id} className="border-b border-border/60 last:border-b-0">
                    <td className="px-2 py-2 text-text-primary">{row.member_name}</td>
                    <td className="px-2 py-2 text-text-secondary">{row.member_code}</td>
                    <td className="px-2 py-2 text-text-secondary">{formatDate(row.join_date)}</td>
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

import { Button, Card, CardContent } from "@/components/ui";
import { useSystemPreferenceFormatters } from "../hooks";
import type { BackupJob } from "../types";

interface Props {
  jobs: BackupJob[];
  restoringId: number | null;
  onRestore: (id: number) => void;
}

export default function BackupJobsTable({ jobs, restoringId, onRestore }: Props) {
  const { formatDateTime } = useSystemPreferenceFormatters();
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <h3 className="text-sm font-semibold text-text-primary">Backup History</h3>

        {jobs.length === 0 ? (
          <p className="text-sm text-text-secondary">No backup jobs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">File</th>
                  <th className="py-2 pr-4">Created</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-border/60">
                    <td className="py-2 pr-4 capitalize">{job.job_type}</td>
                    <td className="py-2 pr-4 capitalize">{job.status}</td>
                    <td className="py-2 pr-4">{job.file_path || "-"}</td>
                    <td className="py-2 pr-4">{formatDateTime(job.created_at)}</td>
                    <td className="py-2 pr-4">
                      {job.job_type !== "restore" && job.status === "success" && job.file_path ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          loading={restoringId === job.id}
                          onClick={() => onRestore(job.id)}
                        >
                          Restore
                        </Button>
                      ) : (
                        <span className="text-text-secondary">-</span>
                      )}
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

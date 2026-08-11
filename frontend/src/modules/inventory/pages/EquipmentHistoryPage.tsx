import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { PageHeader } from "@/components";
import { Card, CardContent, Pagination, PaginationInfo } from "@/components/ui";
import EquipmentHistoryTable from "../components/EquipmentHistoryTable";
import { useEquipmentHistory } from "../queries/useInventory";
import type { EquipmentHistoryEventType } from "../types/equipment";

const EVENT_FILTERS: Array<{ value: "all" | EquipmentHistoryEventType; label: string }> = [
  { value: "all", label: "All Events" },
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "quantity_adjusted", label: "Quantity Adjusted" },
  { value: "status_changed", label: "Status Changed" },
  { value: "deleted", label: "Deleted" },
  { value: "restored", label: "Restored" },
];

export default function EquipmentHistoryPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const equipmentId = Number(id);

  const [eventType, setEventType] = useState<"all" | EquipmentHistoryEventType>("all");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const historyParams = useMemo(
    () => ({
      page,
      page_size: pageSize,
      event_type: eventType === "all" ? undefined : eventType,
    }),
    [eventType, page]
  );

  const { data, isLoading } = useEquipmentHistory(equipmentId, historyParams, {
    enabled: Number.isInteger(equipmentId) && equipmentId > 0,
  });

  if (!Number.isInteger(equipmentId) || equipmentId <= 0) {
    return <div className="text-sm text-error">Invalid equipment id.</div>;
  }

  const totalPages = data?.count ? Math.max(1, Math.ceil(data.count / pageSize)) : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipment History"
        subtitle="Complete audit trail of updates, quantity movements, and status changes"
        actions={[
          {
            label: "Back to Profile",
            variant: "outline",
            onClick: () => navigate(`/inventory/${equipmentId}`),
          },
        ]}
      />

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <label className="text-sm font-medium text-text-primary">Event Type:</label>
        <select
          value={eventType}
          onChange={(event) => {
            setEventType(event.target.value as "all" | EquipmentHistoryEventType);
            setPage(1);
          }}
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {EVENT_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <EquipmentHistoryTable entries={data?.results ?? []} loading={isLoading} />

          <div className="flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
            <PaginationInfo currentPage={page} pageSize={pageSize} totalItems={data?.count ?? 0} />
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

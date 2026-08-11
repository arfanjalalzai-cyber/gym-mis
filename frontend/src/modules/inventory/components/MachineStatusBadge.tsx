import { Badge } from "@/components/ui";
import type { MachineStatus } from "../types/equipment";

interface MachineStatusBadgeProps {
  status: MachineStatus | null;
}

const statusConfig: Record<
  MachineStatus,
  { label: string; variant: "success" | "info" | "warning" | "danger" | "default" }
> = {
  operational: { label: "Operational", variant: "success" },
  in_use: { label: "In Use", variant: "info" },
  maintenance: { label: "Maintenance", variant: "warning" },
  out_of_order: { label: "Out of Order", variant: "danger" },
  retired: { label: "Retired", variant: "default" },
};

export default function MachineStatusBadge({ status }: MachineStatusBadgeProps) {
  if (!status) {
    return <Badge variant="default">N/A</Badge>;
  }

  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
}

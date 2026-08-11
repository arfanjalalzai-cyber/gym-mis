import { Badge } from "@/components/ui";

import type { CardStatus } from "../types/card";

interface CardStatusBadgeProps {
  status: CardStatus;
}

const statusConfig: Record<
  CardStatus,
  { label: string; variant: "success" | "warning" | "error" | "info" }
> = {
  active: { label: "Active", variant: "success" },
  expired: { label: "Expired", variant: "warning" },
  inactive: { label: "Inactive", variant: "error" },
  on_leave: { label: "On Leave", variant: "info" },
  resigned: { label: "Resigned", variant: "error" },
};

export default function CardStatusBadge({ status }: CardStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.expired;
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
}


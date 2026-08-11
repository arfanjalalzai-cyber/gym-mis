import { Badge } from "@/components/ui";

interface LowStockBadgeProps {
  isLowStock: boolean;
}

export default function LowStockBadge({ isLowStock }: LowStockBadgeProps) {
  return isLowStock ? (
    <Badge variant="warning" dot>
      Low Stock
    </Badge>
  ) : (
    <Badge variant="success" dot>
      Healthy
    </Badge>
  );
}

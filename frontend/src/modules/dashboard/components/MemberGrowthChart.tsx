import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, Skeleton } from "@/components/ui";
import type { DashboardMemberGrowthPoint } from "../types/dashboard";

interface MemberGrowthChartProps {
  data: DashboardMemberGrowthPoint[];
  loading?: boolean;
}

export default function MemberGrowthChart({
  data,
  loading = false,
}: MemberGrowthChartProps) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <h3 className="text-base font-semibold text-text-primary">Member Growth Chart</h3>
        {loading ? (
          <Skeleton variant="rounded" height={280} />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="new_members"
                  stroke="var(--color-primary)"
                  fill="color-mix(in srgb, var(--color-primary) 18%, transparent)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative_members"
                  stroke="var(--color-secondary)"
                  fill="color-mix(in srgb, var(--color-secondary) 16%, transparent)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui";
import type { AnalyticsMemberGrowthPoint } from "../types/reports";

interface MemberGrowthChartProps {
  data: AnalyticsMemberGrowthPoint[];
  actions?: ReactNode;
}

export default function MemberGrowthChart({ data, actions }: MemberGrowthChartProps) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-text-primary">Member Growth Chart</h3>
          {actions}
        </div>
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
                fill="rgba(13, 148, 136, 0.18)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="cumulative_members"
                stroke="var(--color-secondary)"
                strokeWidth={2.5}
                dot={{ r: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

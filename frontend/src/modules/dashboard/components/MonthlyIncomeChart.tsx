import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, Skeleton } from "@/components/ui";
import type { DashboardMonthlyIncomePoint } from "../types/dashboard";

interface MonthlyIncomeChartProps {
  data: DashboardMonthlyIncomePoint[];
  loading?: boolean;
  currency?: string;
}

export default function MonthlyIncomeChart({
  data,
  loading = false,
  currency = "AFN",
}: MonthlyIncomeChartProps) {
  const chartData = data.map((row) => ({
    month: row.month,
    value: Number(row.value),
  }));

  return (
    <Card>
      <CardContent className="space-y-4">
        <h3 className="text-base font-semibold text-text-primary">Monthly Income Chart</h3>
        {loading ? (
          <Skeleton variant="rounded" height={280} />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `${currency} ${Number(value).toLocaleString()}`} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

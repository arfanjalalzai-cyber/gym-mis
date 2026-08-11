import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, Skeleton } from "@/components/ui";
import type { DashboardExpenseVsIncomePoint } from "../types/dashboard";

interface ExpenseVsIncomeChartProps {
  data: DashboardExpenseVsIncomePoint[];
  loading?: boolean;
  currency?: string;
}

export default function ExpenseVsIncomeChart({
  data,
  loading = false,
  currency = "AFN",
}: ExpenseVsIncomeChartProps) {
  const chartData = data.map((row) => ({
    month: row.month,
    income: Number(row.income),
    expense: Number(row.expense),
  }));

  return (
    <Card>
      <CardContent className="space-y-4">
        <h3 className="text-base font-semibold text-text-primary">Expense vs Income Chart</h3>
        {loading ? (
          <Skeleton variant="rounded" height={280} />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `${currency} ${Number(value).toLocaleString()}`} />
                <Legend />
                <Bar dataKey="expense" name="Expense" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

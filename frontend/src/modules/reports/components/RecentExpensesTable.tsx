import { useMemo } from "react";
import { Plus } from "lucide-react";

import { Button, Card, CardContent, DataTable, type Column } from "@/components/ui";
import { useSystemPreferenceFormatters } from "@/modules/settings/hooks";
import type { RecentExpenseItem } from "../types/reports";

interface RecentExpensesTableProps {
  expenses: RecentExpenseItem[];
  loading?: boolean;
  onAddExpense: () => void;
  onAddCategory: () => void;
}

const formatMoney = (value: string) => `AFN ${Number(value).toLocaleString()}`;

const formatCategory = (value: string) =>
  value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export default function RecentExpensesTable({
  expenses,
  loading = false,
  onAddExpense,
  onAddCategory,
}: RecentExpensesTableProps) {
  const { formatDate } = useSystemPreferenceFormatters();
  const columns = useMemo<Column<RecentExpenseItem>[]>(
    () => [
      {
        key: "expense_name",
        header: "Expense Name",
        label: "Expense Name",
      },
      {
        key: "amount",
        header: "Amount",
        label: "Amount",
        render: (row) => formatMoney(row.amount),
      },
      {
        key: "expense_date",
        header: "Date",
        label: "Date",
        render: (row) => formatDate(row.expense_date),
      },
      {
        key: "category",
        header: "Category",
        label: "Category",
        render: (row) => formatCategory(row.category),
      },
      {
        key: "note",
        header: "Note",
        label: "Note",
        render: (row) => row.note?.trim() || "-",
      },
    ],
    [formatDate]
  );

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-text-primary">Last Expense Report</h3>
          <div className="grid gap-2 sm:flex sm:items-center">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onAddCategory}
              leftIcon={<Plus className="h-4 w-4" />}
              className="w-full sm:w-auto"
            >
              Add Category
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onAddExpense}
              leftIcon={<Plus className="h-4 w-4" />}
              className="w-full sm:w-auto"
            >
              Add Expense
            </Button>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={expenses}
          loading={loading}
          pagination={false}
          emptyMessage="No expenses found."
          getRowKey={(row) => row.id}
        />
      </CardContent>
    </Card>
  );
}

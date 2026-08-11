import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calendar, CornerDownLeft, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components";
import {
  Button,
  Card,
  CardContent,
  DataTable,
  Input,
  Modal,
  Pagination,
  PaginationInfo,
  Select,
  type Column,
} from "@/components/ui";
import { useSystemPreferenceFormatters } from "@/modules/settings/hooks";
import AddExpenseCategoryModal from "../components/AddExpenseCategoryModal";
import AddExpenseModal from "../components/AddExpenseModal";
import {
  useCreateExpense,
  useCreateExpenseCategory,
  useDeleteExpense,
  useExpenseCategories,
  useExpenseList,
  useExpenseNameOptions,
  useExpensePeriodSummary,
  useUpdateExpense,
} from "../queries/useReports";
import type {
  Expense,
  ExpensePeriodSummaryItem,
  ExpenseTransactionType,
} from "../types/reports";

const PAGE_SIZE = 25;

const formatMoney = (value: string, transactionType: ExpenseTransactionType = "expense") => {
  const prefix = transactionType === "return" ? "- AFN" : "AFN";
  return `${prefix} ${Number(value).toLocaleString()}`;
};

const formatReportMoney = (value?: string) => `AFN ${Number(value ?? "0").toLocaleString()}`;

const formatCategory = (value: string) =>
  value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const parsePage = (value: string | null) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

const getTodayInputValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function WeeklyExpenseChart({
  rows,
  loading,
  formatDate,
}: {
  rows: ExpensePeriodSummaryItem[];
  loading?: boolean;
  formatDate: (value: string | null | undefined) => string;
}) {
  const chartData = rows.map((row) => ({
    date: formatDate(row.date_from),
    Expense: Number(row.expense),
    Return: Number(row.return),
    Net: Number(row.net_expense),
  }));

  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-text-primary">Weekly Expense Chart</h3>
          <p className="mt-1 text-sm text-text-secondary">
            Daily expense and return trend for the selected week.
          </p>
        </div>
        <div className="h-72 w-full">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-text-secondary">
              Loading...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 20, left: 8, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${Number(value).toLocaleString()}`}
                />
                <Tooltip formatter={(value) => `AFN ${Number(value).toLocaleString()}`} />
                <Legend verticalAlign="top" height={32} />
                <Line
                  type="monotone"
                  dataKey="Expense"
                  stroke="var(--color-warning)"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Return"
                  stroke="var(--color-success)"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ExpenseSummaryCard({
  title,
  summary,
  loading,
  formatDate,
}: {
  title: string;
  summary?: ExpensePeriodSummaryItem;
  loading?: boolean;
  formatDate: (value: string | null | undefined) => string;
}) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
          <p className="mt-1 text-sm text-text-secondary">
            {summary ? `${formatDate(summary.date_from)} - ${formatDate(summary.date_to)}` : "-"}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-xs font-medium text-text-secondary">Expense</p>
            <p className="mt-1 text-lg font-semibold text-text-primary">
              {loading ? "Loading..." : formatReportMoney(summary?.expense)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-xs font-medium text-text-secondary">Return</p>
            <p className="mt-1 text-lg font-semibold text-success">
              {loading ? "Loading..." : formatReportMoney(summary?.return)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-xs font-medium text-text-secondary">Net Expense</p>
            <p className="mt-1 text-lg font-semibold text-primary">
              {loading ? "Loading..." : formatReportMoney(summary?.net_expense)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DateFilterInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openCalendar = () => {
    const input = inputRef.current;
    if (!input) return;

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
  };

  return (
    <Input
      ref={inputRef}
      label={label}
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rightIcon={
        <button
          type="button"
          aria-label={`Open ${label} calendar`}
          onClick={openCalendar}
          className="rounded p-0.5 text-muted transition-colors hover:bg-surface-hover hover:text-primary"
        >
          <Calendar className="h-4 w-4" />
        </button>
      }
    />
  );
}

export default function ExpensesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { formatDate } = useSystemPreferenceFormatters();
  const page = parsePage(searchParams.get("page"));
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";
  const reportDate = searchParams.get("report_date") ?? getTodayInputValue();

  const [searchInput, setSearchInput] = useState(search);
  const [expenseModalType, setExpenseModalType] = useState<ExpenseTransactionType | null>(null);
  const [isExpenseCategoryModalOpen, setIsExpenseCategoryModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const patchParams = useCallback(
    (patcher: (next: URLSearchParams) => void) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        patcher(next);
        return next;
      });
    },
    [setSearchParams]
  );

  useEffect(() => {
    if (searchInput === search) return;

    const timer = window.setTimeout(() => {
      patchParams((next) => {
        if (searchInput.trim()) next.set("search", searchInput.trim());
        else next.delete("search");
        next.set("page", "1");
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [patchParams, search, searchInput]);

  const expenseCategoriesQuery = useExpenseCategories();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const createExpenseCategory = useCreateExpenseCategory();
  const expensePeriodSummaryQuery = useExpensePeriodSummary(reportDate);
  const expenseNameOptionsQuery = useExpenseNameOptions();

  const expensesQuery = useExpenseList({
    search: search || undefined,
    category: category || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  const categoryNameBySlug = useMemo(
    () =>
      new Map(
        (expenseCategoriesQuery.data ?? []).map((expenseCategory) => [
          expenseCategory.slug,
          expenseCategory.name,
        ])
      ),
    [expenseCategoriesQuery.data]
  );

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "All Categories" },
      ...(expenseCategoriesQuery.data ?? []).map((expenseCategory) => ({
        value: expenseCategory.slug,
        label: expenseCategory.name,
      })),
    ],
    [expenseCategoriesQuery.data]
  );

  const columns = useMemo<Column<Expense>[]>(
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
        render: (row) => (
          <span
            className={
              row.transaction_type === "return" ? "font-medium text-success" : undefined
            }
          >
            {formatMoney(row.amount, row.transaction_type)}
          </span>
        ),
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
        render: (row) => categoryNameBySlug.get(row.category) ?? formatCategory(row.category),
      },
      {
        key: "transaction_type",
        header: "Type",
        label: "Type",
        render: (row) => (
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
              row.transaction_type === "return"
                ? "bg-success/10 text-success"
                : "bg-primary/10 text-primary"
            }`}
          >
            {row.transaction_type === "return" ? "Return" : "Expense"}
          </span>
        ),
      },
      {
        key: "note",
        header: "Note",
        label: "Note",
        render: (row) => row.note?.trim() || "-",
      },
      {
        key: "actions",
        header: "Actions",
        label: "Actions",
        width: "140px",
        render: (row) => (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                setEditingExpense(row);
              }}
              aria-label={`Edit ${row.expense_name}`}
              className="h-8 px-2"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                setDeletingExpense(row);
              }}
              aria-label={`Delete ${row.expense_name}`}
              className="h-8 px-2 text-danger hover:bg-danger/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [categoryNameBySlug, formatDate]
  );

  const totalPages = useMemo(() => {
    if (!expensesQuery.data?.count) return 1;
    return Math.max(1, Math.ceil(expensesQuery.data.count / PAGE_SIZE));
  }, [expensesQuery.data?.count]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        subtitle="Manage gym expense categories and expense records."
        actions={[
          {
            label: "Add Category",
            icon: <Plus className="h-4 w-4" />,
            variant: "outline",
            onClick: () => setIsExpenseCategoryModalOpen(true),
          },
          {
            label: "Add Expense Return",
            icon: <CornerDownLeft className="h-4 w-4" />,
            variant: "secondary",
            onClick: () => setExpenseModalType("return"),
          },
          {
            label: "Add Expense",
            icon: <Plus className="h-4 w-4" />,
            onClick: () => setExpenseModalType("expense"),
          },
        ]}
      />

      <Card>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_180px_160px_160px_auto] lg:items-end">
            <Input
              label="Search"
              placeholder="Search expense name or note"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
            <Select
              label="Category"
              value={category}
              options={categoryOptions}
              onChange={(event) =>
                patchParams((next) => {
                  if (event.target.value) next.set("category", event.target.value);
                  else next.delete("category");
                  next.set("page", "1");
                })
              }
            />
            <DateFilterInput
              label="From"
              value={dateFrom}
              onChange={(value) =>
                patchParams((next) => {
                  if (value) next.set("date_from", value);
                  else next.delete("date_from");
                  next.set("page", "1");
                })
              }
            />
            <DateFilterInput
              label="To"
              value={dateTo}
              onChange={(value) =>
                patchParams((next) => {
                  if (value) next.set("date_to", value);
                  else next.delete("date_to");
                  next.set("page", "1");
                })
              }
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSearchParams({})}
              className="h-[42px]"
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Last Expense Report</h3>
          </div>
          <DataTable
            columns={columns}
            data={expensesQuery.data?.results ?? []}
            loading={expensesQuery.isLoading}
            pagination={false}
            emptyMessage="No expenses found."
            getRowKey={(row) => row.id}
          />

          <div className="flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
            <PaginationInfo
              currentPage={page}
              pageSize={PAGE_SIZE}
              totalItems={expensesQuery.data?.count ?? 0}
            />
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(nextPage) =>
                patchParams((next) => {
                  next.set("page", String(nextPage));
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-[220px_auto] sm:items-end">
            <DateFilterInput
              label="Report Date"
              value={reportDate}
              onChange={(value) =>
                patchParams((next) => {
                  if (value) next.set("report_date", value);
                  else next.delete("report_date");
                })
              }
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                patchParams((next) => {
                  next.set("report_date", getTodayInputValue());
                })
              }
              className="h-[42px] sm:w-fit"
            >
              Today
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <ExpenseSummaryCard
          title="Daily Expense Report"
          summary={expensePeriodSummaryQuery.data?.daily}
          loading={expensePeriodSummaryQuery.isLoading}
          formatDate={formatDate}
        />
        <ExpenseSummaryCard
          title="Weekly Expense Report"
          summary={expensePeriodSummaryQuery.data?.weekly}
          loading={expensePeriodSummaryQuery.isLoading}
          formatDate={formatDate}
        />
      </div>

      <WeeklyExpenseChart
        rows={expensePeriodSummaryQuery.data?.weekly_days ?? []}
        loading={expensePeriodSummaryQuery.isLoading}
        formatDate={formatDate}
      />

      <AddExpenseModal
        isOpen={expenseModalType !== null}
        onClose={() => setExpenseModalType(null)}
        isSubmitting={createExpense.isPending}
        categories={expenseCategoriesQuery.data ?? []}
        expenseNameOptions={expenseNameOptionsQuery.data ?? []}
        title={expenseModalType === "return" ? "Add Expense Return" : "Add Expense"}
        description={
          expenseModalType === "return"
            ? "Record money returned from a previous expense."
            : "Record a new gym expense for reporting."
        }
        submitLabel={expenseModalType === "return" ? "Save Return" : "Save Expense"}
        transactionType={expenseModalType ?? "expense"}
        onSubmit={async (values) => {
          await createExpense.mutateAsync({
            expense_name: values.expense_name,
            amount: values.amount,
            expense_date: values.expense_date,
            category: values.category,
            transaction_type: values.transaction_type,
            note: values.note,
          });
        }}
      />
      <AddExpenseModal
        isOpen={editingExpense !== null}
        onClose={() => setEditingExpense(null)}
        isSubmitting={updateExpense.isPending}
        categories={expenseCategoriesQuery.data ?? []}
        title="Edit Expense"
        description="Update this expense record."
        submitLabel="Update Expense"
        initialValues={
          editingExpense
            ? {
                expense_name: editingExpense.expense_name,
                amount: Number(editingExpense.amount),
                expense_date: editingExpense.expense_date,
                category: editingExpense.category,
                transaction_type: editingExpense.transaction_type,
                note: editingExpense.note ?? "",
              }
            : undefined
        }
        onSubmit={async (values) => {
          if (!editingExpense) return;
          await updateExpense.mutateAsync({
            id: editingExpense.id,
            data: {
              expense_name: values.expense_name,
              amount: values.amount,
              expense_date: values.expense_date,
              category: values.category,
              transaction_type: values.transaction_type,
              note: values.note,
            },
          });
        }}
      />
      <AddExpenseCategoryModal
        isOpen={isExpenseCategoryModalOpen}
        onClose={() => setIsExpenseCategoryModalOpen(false)}
        isSubmitting={createExpenseCategory.isPending}
        onSubmit={async (values) => {
          await createExpenseCategory.mutateAsync(values);
        }}
      />
      <Modal
        isOpen={deletingExpense !== null}
        onClose={() => setDeletingExpense(null)}
        title="Delete Expense"
        description="This action cannot be undone."
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeletingExpense(null)}
              disabled={deleteExpense.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={deleteExpense.isPending}
              onClick={async () => {
                if (!deletingExpense) return;
                await deleteExpense.mutateAsync(deletingExpense.id);
                setDeletingExpense(null);
              }}
            >
              Delete Expense
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-text-primary">
            {deletingExpense?.expense_name}
          </span>
          ?
        </p>
      </Modal>
    </div>
  );
}

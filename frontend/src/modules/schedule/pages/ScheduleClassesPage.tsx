import { useMemo, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components";
import { Card, CardContent, Pagination, PaginationInfo } from "@/components/ui";
import ScheduleClassForm from "../components/ScheduleClassForm";
import ScheduleClassTable from "../components/ScheduleClassTable";
import {
  useCreateScheduleClass,
  useScheduleClassList,
  useUpdateScheduleClass,
} from "../queries/useSchedule";
import type { ScheduleClassFormValues, ScheduleClassListItem } from "../types/schedule";

export default function ScheduleClassesPage() {
  const navigate = useNavigate();
  const [editingClass, setEditingClass] = useState<ScheduleClassListItem | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data, isLoading } = useScheduleClassList({ page, page_size: pageSize, ordering: "name" });
  const createClassMutation = useCreateScheduleClass();
  const updateClassMutation = useUpdateScheduleClass(editingClass?.id ?? 0);

  const totalPages = useMemo(() => {
    if (!data?.count) return 1;
    return Math.max(1, Math.ceil(data.count / pageSize));
  }, [data?.count]);

  const resetFormState = () => {
    setShowCreateForm(false);
    setEditingClass(null);
  };

  const handleCreate = async (values: ScheduleClassFormValues) => {
    await createClassMutation.mutateAsync(values);
    resetFormState();
  };

  const handleUpdate = async (values: ScheduleClassFormValues) => {
    if (!editingClass) return;
    await updateClassMutation.mutateAsync(values);
    resetFormState();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule Classes"
        subtitle="Create and maintain class master records"
        actions={[
          {
            label: "Back to Schedule",
            icon: <ArrowLeft className="h-4 w-4" />,
            variant: "outline",
            onClick: () => navigate("/schedule"),
          },
          {
            label: showCreateForm ? "Close Form" : "New Class",
            icon: <Plus className="h-4 w-4" />,
            onClick: () => {
              setEditingClass(null);
              setShowCreateForm((prev) => !prev);
            },
          },
        ]}
      />

      {(showCreateForm || editingClass) && (
        <ScheduleClassForm
          mode={editingClass ? "edit" : "create"}
          initialValues={
            editingClass
              ? {
                  name: editingClass.name,
                  description: editingClass.description ?? "",
                  default_duration_minutes: editingClass.default_duration_minutes,
                  max_capacity: editingClass.max_capacity ?? undefined,
                  is_active: editingClass.is_active,
                }
              : undefined
          }
          isSubmitting={createClassMutation.isPending || updateClassMutation.isPending}
          onSubmit={editingClass ? handleUpdate : handleCreate}
          onCancel={resetFormState}
        />
      )}

      <Card>
        <CardContent className="space-y-4">
          <ScheduleClassTable
            classes={data?.results ?? []}
            loading={isLoading}
            onEdit={(scheduleClass) => {
              setEditingClass(scheduleClass);
              setShowCreateForm(false);
            }}
          />
          <div className="flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
            <PaginationInfo
              currentPage={page}
              pageSize={pageSize}
              totalItems={data?.count ?? 0}
            />
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

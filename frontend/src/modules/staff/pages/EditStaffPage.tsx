import { useNavigate, useParams } from "react-router-dom";

import { PageHeader } from "@/components";
import { Card, CardContent, Spinner } from "@/components/ui";
import StaffForm from "../components/StaffForm";
import { useStaff, useUpdateStaff } from "../queries/useStaff";
import type { StaffFormValues } from "../types/staff";

export default function EditStaffPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const staffId = Number(id);

  const { data: staff, isLoading } = useStaff(staffId, {
    enabled: Number.isInteger(staffId) && staffId > 0,
  });
  const updateStaffMutation = useUpdateStaff(staffId);

  if (!Number.isInteger(staffId) || staffId <= 0) {
    return <div className="text-sm text-error">Invalid staff id.</div>;
  }

  if (isLoading || !staff) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 text-text-secondary">
          <Spinner size="sm" />
          Loading staff...
        </CardContent>
      </Card>
    );
  }

  const handleUpdate = async (values: StaffFormValues) => {
    await updateStaffMutation.mutateAsync(values);
    navigate(`/staff/${staffId}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${staff.first_name} ${staff.last_name}`}
        subtitle="Update staff profile details"
        actions={[
          {
            label: "View Profile",
            variant: "outline",
            onClick: () => navigate(`/staff/${staffId}`),
          },
        ]}
      />
      <StaffForm
        mode="edit"
        isSubmitting={updateStaffMutation.isPending}
        onSubmit={handleUpdate}
        onCancel={() => navigate(`/staff/${staffId}`)}
        initialValues={{
          position: staff.position,
          position_other: staff.position_other ?? "",
          first_name: staff.first_name,
          last_name: staff.last_name,
          father_name: staff.father_name ?? "",
          mobile_number: staff.mobile_number,
          whatsapp_number: staff.whatsapp_number ?? "",
          address: staff.address ?? "",
          id_card_number: staff.id_card_number ?? "",
          email: staff.email ?? "",
          blood_group: staff.blood_group ?? undefined,
          date_of_birth: staff.date_of_birth ?? "",
          date_hired: staff.date_hired,
          monthly_salary: staff.monthly_salary,
          salary_currency: staff.salary_currency,
          salary_status: staff.salary_status,
          employment_status: staff.employment_status,
          assigned_class_ids: staff.assigned_classes?.map((scheduleClass) => scheduleClass.id) ?? [],
          notes: staff.notes ?? "",
        }}
        existingProfilePictureUrl={staff.profile_picture_url}
      />
    </div>
  );
}

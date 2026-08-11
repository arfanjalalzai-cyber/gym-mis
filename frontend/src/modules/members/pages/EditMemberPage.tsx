import { useNavigate, useParams } from "react-router-dom";

import { PageHeader } from "@/components";
import { Card, CardContent, Spinner } from "@/components/ui";
import MemberForm from "../components/MemberForm";
import { useMember, useUpdateMember } from "../queries/useMembers";
import type { MemberFormValues } from "../types/member";

export default function EditMemberPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const memberId = Number(id);

  const { data: member, isLoading } = useMember(memberId, {
    enabled: Number.isInteger(memberId) && memberId > 0,
  });
  const updateMemberMutation = useUpdateMember(memberId);

  if (!Number.isInteger(memberId) || memberId <= 0) {
    return <div className="text-sm text-error">Invalid member id.</div>;
  }

  if (isLoading || !member) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 text-text-secondary">
          <Spinner size="sm" />
          Loading member...
        </CardContent>
      </Card>
    );
  }

  const handleUpdate = async (values: MemberFormValues) => {
    await updateMemberMutation.mutateAsync(values);
    navigate(`/members/${memberId}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${member.first_name} ${member.last_name}`}
        subtitle="Update member profile details"
        actions={[
          {
            label: "View Profile",
            variant: "outline",
            onClick: () => navigate(`/members/${memberId}`),
          },
        ]}
      />
      <MemberForm
        mode="edit"
        isSubmitting={updateMemberMutation.isPending}
        onSubmit={handleUpdate}
        onCancel={() => navigate(`/members/${memberId}`)}
        initialValues={{
          first_name: member.first_name,
          last_name: member.last_name,
          phone: member.phone,
          address: member.address ?? "",
          id_card_number: member.id_card_number ?? "",
          email: member.email ?? "",
          blood_group: member.blood_group ?? undefined,
          date_of_birth: member.date_of_birth ?? "",
          gender: member.gender ?? undefined,
          emergency_contact_name: member.emergency_contact_name ?? "",
          emergency_contact_phone: member.emergency_contact_phone ?? "",
          height_cm: member.height_cm ?? undefined,
          weight_kg: member.weight_kg ?? undefined,
          join_date: member.join_date,
          membership_plan_template: member.membership_plan_template,
          schedule_class: member.schedule_class,
          schedule_slot: member.schedule_slot,
          status: member.status,
          notes: member.notes ?? "",
        }}
        existingProfilePictureUrl={member.profile_picture_url}
      />
    </div>
  );
}

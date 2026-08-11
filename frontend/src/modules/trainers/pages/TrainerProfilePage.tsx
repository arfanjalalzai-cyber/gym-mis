import { Pencil } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { PageHeader } from "@/components";
import { Button, Card, CardContent, Spinner } from "@/components/ui";
import { useSystemPreferenceFormatters } from "@/modules/settings/hooks";
import TrainerEmploymentStatusBadge from "../components/TrainerEmploymentStatusBadge";
import TrainerSalaryStatusBadge from "../components/TrainerSalaryStatusBadge";
import { useActivateTrainer, useDeactivateTrainer, useTrainer } from "../queries/useTrainers";

export default function TrainerProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const trainerId = Number(id);
  const { formatDate } = useSystemPreferenceFormatters();

  const { data: trainer, isLoading } = useTrainer(trainerId, {
    enabled: Number.isInteger(trainerId) && trainerId > 0,
  });
  const activateMutation = useActivateTrainer(trainerId);
  const deactivateMutation = useDeactivateTrainer(trainerId);

  if (!Number.isInteger(trainerId) || trainerId <= 0) {
    return <div className="text-sm text-error">Invalid trainer id.</div>;
  }

  if (isLoading || !trainer) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 text-text-secondary">
          <Spinner size="sm" />
          Loading trainer profile...
        </CardContent>
      </Card>
    );
  }

  const handleStatusToggle = async () => {
    if (trainer.employment_status === "active") {
      await deactivateMutation.mutateAsync();
      return;
    }
    await activateMutation.mutateAsync();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${trainer.first_name} ${trainer.last_name}`}
        subtitle={`Trainer code: ${trainer.trainer_code}`}
        actions={[
          {
            label: "Back to Trainers",
            variant: "outline",
            onClick: () => navigate("/trainers"),
          },
          {
            label: "Edit Trainer",
            icon: <Pencil className="h-4 w-4" />,
            onClick: () => navigate(`/trainers/${trainerId}/edit`),
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4">
              <img
                src={trainer.profile_picture_url ?? "/images/user.jpeg"}
                alt={`${trainer.first_name} ${trainer.last_name}`}
                className="h-20 w-20 rounded-full object-cover"
              />
              <div>
                <p className="text-lg font-semibold text-text-primary">
                  {trainer.first_name} {trainer.last_name}
                </p>
                <p className="text-sm text-text-secondary">{trainer.trainer_code}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <TrainerEmploymentStatusBadge status={trainer.employment_status} />
              <TrainerSalaryStatusBadge status={trainer.salary_status} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InfoRow label="ID Card Number" value={trainer.id_card_number} />
              <InfoRow label="Father Name" value={trainer.father_name} />
              <InfoRow label="Mobile Number" value={trainer.mobile_number} />
              <InfoRow label="WhatsApp Number" value={trainer.whatsapp_number} />
              <InfoRow label="Email" value={trainer.email} />
              <InfoRow label="Blood Group" value={trainer.blood_group} />
              <InfoRow
                label="Date of Birth"
                value={
                  trainer.date_of_birth
                    ? formatDate(trainer.date_of_birth)
                    : "-"
                }
              />
              <InfoRow label="Age" value={trainer.age?.toString() ?? "-"} />
              <InfoRow label="Date Hired" value={formatDate(trainer.date_hired)} />
              <InfoRow
                label="Classes Assigned"
                value={
                  trainer.assigned_classes?.length
                    ? trainer.assigned_classes.join(", ")
                    : "-"
                }
              />
            </div>

            <InfoRow label="Notes" value={trainer.notes} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Salary Information</h2>
            <InfoRow
              label="Monthly Salary"
              value={`${trainer.salary_currency} ${Number(trainer.monthly_salary).toLocaleString()}`}
            />
            <InfoRow label="Salary Status" value={trainer.salary_status} />
            <InfoRow label="Employment Status" value={trainer.employment_status.replace(/_/g, " ")} />
            <Button
              onClick={handleStatusToggle}
              variant={trainer.employment_status === "active" ? "danger" : "primary"}
              loading={activateMutation.isPending || deactivateMutation.isPending}
              fullWidth
            >
              {trainer.employment_status === "active" ? "Set Inactive" : "Set Active"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  const displayValue = value && value.trim() ? value : "-";
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-1 text-sm text-text-primary">{displayValue}</p>
    </div>
  );
}

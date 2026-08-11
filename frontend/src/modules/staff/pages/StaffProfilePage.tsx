import { format } from "date-fns";
import { useState } from "react";
import { AlertTriangle, CreditCard, FileText, Pencil, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components";
import { Button, Card, CardContent, Input, Modal, Spinner } from "@/components/ui";
import PaymentHistoryTable from "@/modules/payments/components/PaymentHistoryTable";
import {
  useStaffSalaryPaymentList,
  useStaffSalarySummary,
  useUpsertStaffSalaryPeriod,
} from "@/modules/payments/queries/usePayments";
import { useSystemPreferenceFormatters } from "@/modules/settings/hooks";
import StaffEmploymentStatusBadge from "../components/StaffEmploymentStatusBadge";
import StaffSalaryStatusBadge from "../components/StaffSalaryStatusBadge";
import { useActivateStaff, useDeactivateStaff, useDeleteStaff, useStaff } from "../queries/useStaff";

const getPositionLabel = (position: string, positionOther?: string | null) => {
  if (position === "other" && positionOther) {
    return positionOther;
  }
  return position.charAt(0).toUpperCase() + position.slice(1);
};

const toMonthStart = (dateValue: string) => {
  if (!dateValue) return "";
  const [year, month] = dateValue.split("-");
  if (!year || !month) return "";
  return `${year}-${month}-01`;
};

export default function StaffProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const staffId = Number(id);
  const [salaryMonth, setSalaryMonth] = useState(() => format(new Date(), "yyyy-MM-01"));
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { formatDate } = useSystemPreferenceFormatters();

  const { data: staff, isLoading } = useStaff(staffId, {
    enabled: Number.isInteger(staffId) && staffId > 0,
  });
  const salarySummaryQuery = useStaffSalarySummary(
    Number.isInteger(staffId) && staffId > 0 ? staffId : undefined,
    salaryMonth || undefined
  );
  const upsertSalaryPeriodMutation = useUpsertStaffSalaryPeriod();
  const staffPaymentsQuery = useStaffSalaryPaymentList(
    {
      staff_id: staffId,
      page: 1,
      page_size: 10,
    },
    Number.isInteger(staffId) && staffId > 0
  );
  const activateMutation = useActivateStaff(staffId);
  const deactivateMutation = useDeactivateStaff(staffId);
  const deleteMutation = useDeleteStaff();

  if (!Number.isInteger(staffId) || staffId <= 0) {
    return <div className="text-sm text-error">Invalid staff id.</div>;
  }

  if (isLoading || !staff) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 text-text-secondary">
          <Spinner size="sm" />
          Loading staff profile...
        </CardContent>
      </Card>
    );
  }

  const handleStatusToggle = async () => {
    if (staff.employment_status === "active") {
      await deactivateMutation.mutateAsync();
      return;
    }
    await activateMutation.mutateAsync();
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(staffId);
    setIsDeleteModalOpen(false);
    navigate("/staff");
  };

  const handleGenerateSalaryBill = async () => {
    const periodMonth = toMonthStart(salaryMonth);
    if (!periodMonth) {
      toast.error("Salary month is required.");
      return;
    }

    const period = await upsertSalaryPeriodMutation.mutateAsync({
      staff_id: staffId,
      period_month: periodMonth,
    });
    toast.success("Monthly salary bill generated successfully");
    navigate(`/staff-salary-bills/${period.id}`);
  };

  const salarySummary = salarySummaryQuery.data;
  const salaryPeriod = salarySummary?.period;
  const grossSalaryAmount = salaryPeriod?.gross_salary_amount ?? staff.monthly_salary;
  const remainingSalaryAmount = salarySummary?.remaining_amount ?? staff.monthly_salary;
  const salaryBillStatus = salarySummary?.status ?? "unpaid";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${staff.first_name} ${staff.last_name}`}
        subtitle={`Staff code: ${staff.staff_code}`}
        actions={[
          {
            label: "Back to Staff",
            variant: "outline",
            onClick: () => navigate("/staff"),
          },
          {
            label: "Edit Staff",
            icon: <Pencil className="h-4 w-4" />,
            onClick: () => navigate(`/staff/${staffId}/edit`),
          },
          {
            label: "Card",
            icon: <CreditCard className="h-4 w-4" />,
            variant: "outline",
            onClick: () => navigate(`/staff/${staffId}/card`),
          },
          {
            label: "Generate Bill",
            icon: <FileText className="h-4 w-4" />,
            onClick: () => void handleGenerateSalaryBill(),
            loading: upsertSalaryPeriodMutation.isPending,
            disabled: salarySummaryQuery.isLoading,
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4">
              <img
                src={staff.profile_picture_url ?? "/images/user.jpeg"}
                alt={`${staff.first_name} ${staff.last_name}`}
                className="h-20 w-20 rounded-full object-cover"
              />
              <div>
                <p className="text-lg font-semibold text-text-primary">
                  {staff.first_name} {staff.last_name}
                </p>
                <p className="text-sm text-text-secondary">{staff.staff_code}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <StaffEmploymentStatusBadge status={staff.employment_status} />
              <StaffSalaryStatusBadge status={staff.salary_status} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InfoRow label="Position" value={getPositionLabel(staff.position, staff.position_other)} />
              <InfoRow label="ID Card Number" value={staff.id_card_number} />
              <InfoRow label="Father Name" value={staff.father_name} />
              <InfoRow label="Mobile Number" value={staff.mobile_number} />
              <InfoRow label="WhatsApp Number" value={staff.whatsapp_number} />
              <InfoRow label="Address" value={staff.address} />
              <InfoRow label="Email" value={staff.email} />
              <InfoRow label="Blood Group" value={staff.blood_group} />
              <InfoRow
                label="Date of Birth"
                value={
                  staff.date_of_birth
                    ? formatDate(staff.date_of_birth)
                    : "-"
                }
              />
              <InfoRow label="Age" value={staff.age?.toString() ?? "-"} />
              <InfoRow label="Date Hired" value={formatDate(staff.date_hired)} />
              {staff.position === "trainer" && (
                <InfoRow
                  label="Assigned Classes"
                  value={
                    staff.assigned_classes.length > 0
                      ? staff.assigned_classes
                          .map((scheduleClass) => `${scheduleClass.class_code} ${scheduleClass.name}`)
                          .join(", ")
                      : "-"
                  }
                />
              )}
            </div>

            <InfoRow label="Notes" value={staff.notes} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Salary Information</h2>
            <InfoRow
              label="Monthly Salary"
              value={`${staff.salary_currency} ${Number(staff.monthly_salary).toLocaleString()}`}
            />
            <InfoRow label="Salary Status" value={staff.salary_status} />
            <InfoRow label="Employment Status" value={staff.employment_status.replace(/_/g, " ")} />
            <Button
              onClick={handleStatusToggle}
              variant={staff.employment_status === "active" ? "danger" : "primary"}
              loading={activateMutation.isPending || deactivateMutation.isPending}
              fullWidth
            >
              {staff.employment_status === "active" ? "Set Inactive" : "Set Active"}
            </Button>
            <Button
              onClick={() => setIsDeleteModalOpen(true)}
              variant="danger"
              leftIcon={<Trash2 className="h-4 w-4" />}
              loading={deleteMutation.isPending}
              fullWidth
            >
              Delete Staff
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Monthly Salary Bill</h3>
              <p className="text-sm text-text-secondary">
                Select the salary month, then use Generate Bill from the profile actions.
              </p>
            </div>
            <Button
              variant="outline"
              leftIcon={<FileText className="h-4 w-4" />}
              onClick={() => navigate(`/payments?tab=staff_salaries&staff_id=${staffId}`)}
            >
              Record Payment
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Input
              type="month"
              label="Salary Month"
              value={salaryMonth.slice(0, 7)}
              onChange={(event) => setSalaryMonth(event.target.value ? `${event.target.value}-01` : "")}
            />
            <Input
              type="number"
              step="0.01"
              label="Gross Salary (AFN)"
              value={grossSalaryAmount}
              readOnly
              hint={salarySummaryQuery.isLoading ? "Loading salary preview..." : "Loaded from staff salary"}
            />
            <Input
              type="text"
              label="Bill Status"
              value={salaryBillStatus}
              readOnly
            />
          </div>

          <div className="rounded-lg border border-border bg-surface p-3 text-sm">
            <p className="font-semibold text-text-primary">
              Remaining Amount: {Number(remainingSalaryAmount).toLocaleString()} AFN
            </p>
            <p className="mt-1 text-text-secondary">
              {salaryPeriod
                ? `Salary bill is prepared for ${formatDate(salaryPeriod.period_month)}.`
                : "No salary bill exists for this month yet."}
            </p>
          </div>

        </CardContent>
      </Card>

      <PaymentHistoryTable
        mode="staff"
        staffPayments={staffPaymentsQuery.data?.results ?? []}
        loading={staffPaymentsQuery.isLoading}
      />

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Staff Profile"
        description="Please confirm this action before continuing."
        size="sm"
        closeOnOverlayClick={!deleteMutation.isPending}
        showCloseButton={!deleteMutation.isPending}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={handleDelete}
              loading={deleteMutation.isPending}
            >
              Delete Staff
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/10 p-4">
            <div className="rounded-full bg-danger/15 p-2 text-danger">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-text-primary">
                Are you sure you want to delete this staff profile?
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                This will remove the profile for {staff.first_name} {staff.last_name} ({staff.staff_code}).
              </p>
            </div>
          </div>
          <p className="text-sm text-text-secondary">
            This action cannot be undone from this screen.
          </p>
        </div>
      </Modal>
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

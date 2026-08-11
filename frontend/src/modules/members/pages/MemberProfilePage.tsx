import { format } from "date-fns";
import { useEffect, useState } from "react";
import { AlertTriangle, CreditCard, History, Pencil, ReceiptText, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components";
import { Button, Card, CardContent, Input, Modal, Spinner } from "@/components/ui";
import { useGenerateBill } from "@/modules/billing/queries/useBilling";
import PaymentHistoryTable from "@/modules/payments/components/PaymentHistoryTable";
import { useMemberFeePaymentList, useUpsertMemberFeeCycle } from "@/modules/payments/queries/usePayments";
import { useScheduleClassList, useScheduleSlotList } from "@/modules/schedule/queries/useSchedule";
import { useSystemPreferenceFormatters } from "@/modules/settings/hooks";
import MemberStatusBadge from "../components/MemberStatusBadge";
import {
  useActivateMember,
  useDeactivateMember,
  useDeleteMember,
  useMember,
  useMemberBodyMetricHistory,
  useUpdateMember,
} from "../queries/useMembers";
import { calculateBMI, getBmiCategory } from "../services/bmi";

const bmiCategoryLabel: Record<string, string> = {
  underweight: "Underweight",
  normal: "Normal",
  overweight: "Overweight",
  obese: "Obese",
};

const toMonthStart = (dateValue: string) => {
  if (!dateValue) return "";
  const [year, month] = dateValue.split("-");
  if (!year || !month) return "";
  return `${year}-${month}-01`;
};

const weekdayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const formatTime = (value: string) => value.slice(0, 5);

export default function MemberProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const memberId = Number(id);
  const [billingDate, setBillingDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [discountAmount, setDiscountAmount] = useState("0");
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [feePreview, setFeePreview] = useState<{ originalFee: number; suggestedDiscount: number } | null>(null);
  const [loadingFeePreview, setLoadingFeePreview] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBodyMetricHistoryOpen, setIsBodyMetricHistoryOpen] = useState(false);
  const [bmiHeightCm, setBmiHeightCm] = useState("");
  const [bmiWeightKg, setBmiWeightKg] = useState("");
  const { formatDate } = useSystemPreferenceFormatters();

  const { data: member, isLoading } = useMember(memberId, {
    enabled: Number.isInteger(memberId) && memberId > 0,
  });
  const { data: classesData } = useScheduleClassList({
    page: 1,
    page_size: 200,
    is_active: true,
    ordering: "name",
  });
  const memberClassSlotsQuery = useScheduleSlotList({
    page: 1,
    page_size: 20,
    schedule_class: member?.schedule_class ?? undefined,
    is_active: true,
    ordering: "weekday",
  });
  const { mutateAsync: upsertMemberCycleAsync } = useUpsertMemberFeeCycle();
  const generateBillMutation = useGenerateBill();
  const memberPaymentsQuery = useMemberFeePaymentList(
    {
      member_id: memberId,
      page: 1,
      page_size: 10,
    },
    Number.isInteger(memberId) && memberId > 0
  );
  const activateMutation = useActivateMember(memberId);
  const deactivateMutation = useDeactivateMember(memberId);
  const deleteMutation = useDeleteMember();
  const updateMemberMutation = useUpdateMember(memberId);
  const bodyMetricHistoryQuery = useMemberBodyMetricHistory(memberId, {
    enabled: isBodyMetricHistoryOpen,
  });

  useEffect(() => {
    if (!Number.isInteger(memberId) || memberId <= 0 || !billingDate || member?.status === "inactive") {
      setFeePreview(null);
      setLoadingFeePreview(false);
      return;
    }
    const cycleMonth = toMonthStart(billingDate);
    if (!cycleMonth) {
      setFeePreview(null);
      setLoadingFeePreview(false);
      return;
    }

    setLoadingFeePreview(true);
    upsertMemberCycleAsync({
      member_id: memberId,
      cycle_month: cycleMonth,
    })
      .then((cycle) => {
        const suggestedDiscount = Number(cycle.cycle_discount_amount);
        setFeePreview({
          originalFee: Number(cycle.base_due_amount),
          suggestedDiscount,
        });
        setDiscountAmount((previousValue) => {
          const parsed = Number(previousValue);
          if (!Number.isFinite(parsed) || parsed === 0) return suggestedDiscount.toString();
          return previousValue;
        });
      })
      .catch(() => setFeePreview(null))
      .finally(() => setLoadingFeePreview(false));
  }, [billingDate, member?.status, memberId, upsertMemberCycleAsync]);

  if (!Number.isInteger(memberId) || memberId <= 0) {
    return <div className="text-sm text-error">Invalid member id.</div>;
  }

  if (isLoading || !member) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 text-text-secondary">
          <Spinner size="sm" />
          Loading member profile...
        </CardContent>
      </Card>
    );
  }

  const handleStatusToggle = async () => {
    if (member.status === "active") {
      await deactivateMutation.mutateAsync();
      return;
    }
    await activateMutation.mutateAsync();
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(memberId);
    setIsDeleteModalOpen(false);
    navigate("/members");
  };

  const handleOpenBmiHistory = () => {
    setBmiHeightCm("");
    setBmiWeightKg("");
    setIsBodyMetricHistoryOpen(true);
  };

  const handleSaveBodyMetric = async () => {
    const heightCm = Number(bmiHeightCm);
    const weightKg = Number(bmiWeightKg);

    if (!Number.isFinite(heightCm) || heightCm <= 0) {
      toast.error("Please enter a valid height.");
      return;
    }

    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      toast.error("Please enter a valid weight.");
      return;
    }

    await updateMemberMutation.mutateAsync({
      height_cm: heightCm,
      weight_kg: weightKg,
    });
  };

  const handleCardClick = () => {
    if (member.status === "inactive") {
      toast.error("This member is inactive. Card cannot be generated.");
      return;
    }
    navigate(`/members/${memberId}/card`);
  };

  const handleGenerateBill = async () => {
    if (member.status === "inactive") {
      toast.error("This member is inactive. Bill cannot be generated.");
      return;
    }

    const parsedDiscount = Number(discountAmount || "0");
    if (!Number.isFinite(parsedDiscount) || parsedDiscount < 0) {
      toast.error("Discount amount must be 0 or greater.");
      return;
    }
    const billingMonth = toMonthStart(billingDate);
    if (!billingMonth) {
      toast.error("Billing date is required.");
      return;
    }

    const created = await generateBillMutation.mutateAsync({
      member_id: memberId,
      billing_date: billingMonth,
      discount_amount: parsedDiscount,
      schedule_class_id: selectedClassId,
    });
    navigate(`/billing/${created.id}`);
  };

  const finalAmount = Math.max(
    0,
    (feePreview?.originalFee ?? 0) - (Number(discountAmount) || 0)
  );
  const membershipPlanLabel = member.membership_plan_name
    ? `${member.membership_plan_name} (${member.membership_plan_duration_months ?? 1} months) - AFN ${Number(member.membership_plan_fee ?? 0).toLocaleString()}`
    : "-";

  const scheduleClasses = classesData?.results ?? [];
  const memberClassSlots = memberClassSlotsQuery.data?.results ?? [];
  const selectedSlotTimeLabel =
    member.schedule_slot_weekday !== null &&
    member.schedule_slot_weekday !== undefined &&
    member.schedule_slot_start_time &&
    member.schedule_slot_end_time
      ? `${weekdayLabels[member.schedule_slot_weekday]} ${formatTime(member.schedule_slot_start_time)} - ${formatTime(member.schedule_slot_end_time)}`
      : null;
  const trainingTimeLabel = selectedSlotTimeLabel
    ? selectedSlotTimeLabel
    : memberClassSlotsQuery.isLoading
      ? "Loading schedule..."
      : memberClassSlots.length > 0
      ? memberClassSlots
          .map(
            (slot) =>
              `${weekdayLabels[slot.weekday]} ${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`
          )
          .join(", ")
      : member.schedule_class
        ? "No active time slots found"
        : "-";
  const trainerLabel = member.schedule_slot_trainer_name
    ? member.schedule_slot_trainer_name
    : memberClassSlotsQuery.isLoading
      ? "Loading schedule..."
      : memberClassSlots.length > 0
      ? memberClassSlots
          .map((slot) => slot.trainer_name || slot.trainer_code || "-")
          .filter((trainer, index, trainers) => trainer !== "-" && trainers.indexOf(trainer) === index)
          .join(", ") || "-"
      : "-";
  const trainingClassLabel =
    member.schedule_slot_class_name
      ? `${member.schedule_slot_class_code ?? ""} ${member.schedule_slot_class_name}`.trim()
      : member.schedule_class_name
        ? `${member.schedule_class_code ?? ""} ${member.schedule_class_name}`.trim()
        : "-";
  const bmiPreview = calculateBMI(Number(bmiWeightKg), Number(bmiHeightCm));
  const bmiPreviewCategory = getBmiCategory(bmiPreview);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${member.first_name} ${member.last_name}`}
        subtitle={`Member code: ${member.member_code}`}
        actions={[
          {
            label: "Back to Members",
            variant: "outline",
            onClick: () => navigate("/members"),
          },
          {
            label: "Edit Member",
            icon: <Pencil className="h-4 w-4" />,
            onClick: () => navigate(`/members/${memberId}/edit`),
          },
          {
            label: "Card",
            icon: <CreditCard className="h-4 w-4" />,
            variant: "outline",
            onClick: handleCardClick,
          },
          {
            label: "Generate Monthly Bill",
            icon: <ReceiptText className="h-4 w-4" />,
            onClick: handleGenerateBill,
            loading: generateBillMutation.isPending,
            disabled: member.status === "active" && (loadingFeePreview || !feePreview),
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4">
              <img
                src={member.profile_picture_url ?? "/images/user.jpeg"}
                alt={`${member.first_name} ${member.last_name}`}
                className="h-20 w-20 rounded-full object-cover"
              />
              <div>
                <p className="text-lg font-semibold text-text-primary">
                  {member.first_name} {member.last_name}
                </p>
                <p className="text-sm text-text-secondary">{member.member_code}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">Profile Details</h2>
              <MemberStatusBadge status={member.status} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <InfoRow label="ID Card Number" value={member.id_card_number} />
              <InfoRow label="Phone" value={member.phone} />
              <InfoRow label="Address" value={member.address} />
              <InfoRow label="Email" value={member.email} />
              <InfoRow label="Blood Group" value={member.blood_group} />
              <InfoRow
                label="Date of Birth"
                value={member.date_of_birth ? formatDate(member.date_of_birth) : "-"}
              />
              <InfoRow label="Gender" value={member.gender?.replace(/_/g, " ") ?? "-"} />
              <InfoRow label="Join Date" value={formatDate(member.join_date)} />
              <InfoRow label="Membership Plan" value={membershipPlanLabel} />
              <InfoRow
                label="Training Class"
                value={trainingClassLabel}
              />
              <InfoRow label="Training Time" value={trainingTimeLabel} />
              <InfoRow label="Trainer" value={trainerLabel} />
              <InfoRow label="Emergency Contact" value={member.emergency_contact_name} />
              <InfoRow label="Emergency Phone" value={member.emergency_contact_phone} />
            </div>
            <InfoRow label="Notes" value={member.notes} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Body Metrics</h2>
            <InfoRow label="Height (cm)" value={member.height_cm?.toString()} />
            <InfoRow label="Weight (kg)" value={member.weight_kg?.toString()} />
            <InfoRow label="BMI" value={member.bmi?.toString()} />
            <InfoRow
              label="BMI Category"
              value={member.bmi_category ? bmiCategoryLabel[member.bmi_category] : "-"}
            />
            <Button
              onClick={handleOpenBmiHistory}
              variant="outline"
              leftIcon={<History className="h-4 w-4" />}
              fullWidth
            >
              BMI History
            </Button>
            <Button
              onClick={handleStatusToggle}
              variant={member.status === "active" ? "danger" : "primary"}
              loading={activateMutation.isPending || deactivateMutation.isPending}
              fullWidth
            >
              {member.status === "active" ? "Set Inactive" : "Set Active"}
            </Button>
            <Button
              onClick={() => setIsDeleteModalOpen(true)}
              variant="danger"
              leftIcon={<Trash2 className="h-4 w-4" />}
              loading={deleteMutation.isPending}
              fullWidth
            >
              Delete Member
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Generate Monthly Bill</h3>
              <p className="text-sm text-text-secondary">
                Create a billing invoice for this member without leaving the profile.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Input
              type="month"
              label="Billing Month"
              value={billingDate.slice(0, 7)}
              onChange={(event) => setBillingDate(event.target.value ? `${event.target.value}-01` : "")}
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              label="Original Fee (AFN)"
              value={feePreview?.originalFee ?? 0}
              readOnly
              hint={loadingFeePreview ? "Loading fee preview..." : "Auto-loaded from current fee cycle"}
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              label="Discount (AFN)"
              value={discountAmount}
              onChange={(event) => setDiscountAmount(event.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Class (Optional)</label>
            <select
              value={selectedClassId ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedClassId(value ? Number(value) : null);
              }}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">No class selected</option>
              {scheduleClasses.map((scheduleClass) => (
                <option key={scheduleClass.id} value={scheduleClass.id}>
                  {scheduleClass.class_code} - {scheduleClass.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-border bg-surface p-3 text-sm">
            <p className="font-semibold text-text-primary">
              Final Amount: {finalAmount.toLocaleString()} AFN
            </p>
            <p className="mt-1 text-text-secondary">Formula: Final Amount = Fee - Discount</p>
          </div>

        </CardContent>
      </Card>

      <PaymentHistoryTable
        mode="member"
        memberPayments={memberPaymentsQuery.data?.results ?? []}
        loading={memberPaymentsQuery.isLoading}
      />

      <Modal
        isOpen={isBodyMetricHistoryOpen}
        onClose={() => setIsBodyMetricHistoryOpen(false)}
        title="BMI History"
        description={`${member.first_name} ${member.last_name} - ${member.member_code}`}
        size="full"
      >
        <div className="space-y-5">
          <section className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-text-primary">Record Body Metrics</h3>
              <p className="text-sm text-text-secondary">
                Enter height and weight to calculate and save the member BMI.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_220px_auto] xl:items-end">
              <Input
                type="number"
                min="1"
                step="0.01"
                label="Height (cm)"
                placeholder="Enter new height"
                value={bmiHeightCm}
                onChange={(event) => setBmiHeightCm(event.target.value)}
              />
              <Input
                type="number"
                min="1"
                step="0.01"
                label="Weight (kg)"
                placeholder="Enter new weight"
                value={bmiWeightKg}
                onChange={(event) => setBmiWeightKg(event.target.value)}
              />
              <div className="rounded-lg border border-border bg-card px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Calculated BMI
                </p>
                <p className="mt-1 text-lg font-bold text-text-primary">
                  {bmiPreview == null
                    ? "-"
                    : `${bmiPreview} (${bmiPreviewCategory ? bmiCategoryLabel[bmiPreviewCategory] : "Unknown"})`}
                </p>
              </div>
              <Button
                type="button"
                onClick={handleSaveBodyMetric}
                loading={updateMemberMutation.isPending}
                disabled={updateMemberMutation.isPending}
                className="h-11"
              >
                Save BMI
              </Button>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-base font-semibold text-text-primary">BMI History</h3>
              <p className="text-sm text-text-secondary">
                Saved BMI records for this member.
              </p>
            </div>
            {bodyMetricHistoryQuery.isLoading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-text-secondary">
                <Spinner size="sm" />
                Loading BMI history...
              </div>
            ) : bodyMetricHistoryQuery.data && bodyMetricHistoryQuery.data.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-surface">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-text-primary">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-primary">Height (cm)</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-primary">Weight (kg)</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-primary">BMI</th>
                    <th className="px-4 py-3 text-left font-semibold text-text-primary">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {bodyMetricHistoryQuery.data.map((metric) => (
                    <tr key={metric.id}>
                      <td className="px-4 py-3 text-text-primary">{formatDate(metric.measurement_date)}</td>
                      <td className="px-4 py-3 text-text-primary">{metric.height_cm}</td>
                      <td className="px-4 py-3 text-text-primary">{metric.weight_kg}</td>
                      <td className="px-4 py-3 text-text-primary">{metric.bmi}</td>
                      <td className="px-4 py-3 text-text-primary">{bmiCategoryLabel[metric.bmi_category]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            ) : (
              <div className="p-4 text-sm text-text-secondary">
                No BMI history has been recorded for this member yet.
              </div>
            )}
          </section>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Member Profile"
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
              Delete Member
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
                Are you sure you want to delete this member profile?
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                This will remove the profile for {member.first_name} {member.last_name} ({member.member_code}).
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
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-1 text-sm text-text-primary">{value && value.trim() ? value : "-"}</p>
    </div>
  );
}

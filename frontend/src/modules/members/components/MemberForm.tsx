import { Button, Card, CardContent, Input } from "@/components/ui";
import { useMembershipPlans } from "@/modules/settings/queries";
import { useScheduleSlotList } from "@/modules/schedule/queries/useSchedule";
import { useMemberForm } from "../hooks/useMemberForm";
import type { MemberFormValues } from "../types/member";

interface MemberFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<MemberFormValues>;
  existingProfilePictureUrl?: string | null;
  isSubmitting?: boolean;
  onSubmit: (values: MemberFormValues) => Promise<void> | void;
  onCancel?: () => void;
}

const bmiCategoryLabel: Record<string, string> = {
  underweight: "Underweight",
  normal: "Normal",
  overweight: "Overweight",
  obese: "Obese",
};

const weekdayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const formatTime = (value: string) => value.slice(0, 5);

export default function MemberForm({
  mode,
  initialValues,
  existingProfilePictureUrl = null,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: MemberFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    bmi,
    bmiCategory,
  } = useMemberForm(initialValues);
  const { data: membershipPlansData, isLoading: plansLoading } = useMembershipPlans({
    page: 1,
    page_size: 200,
    is_active: true,
  });
  const { data: slotsData, isLoading: slotsLoading } = useScheduleSlotList({
    page: 1,
    page_size: 500,
    is_active: true,
    ordering: "weekday",
  });
  const membershipPlans = membershipPlansData?.results ?? [];
  const scheduleSlots = slotsData?.results ?? [];

  const selectedProfilePicture = watch("profile_picture");
  const selectedFileName =
    selectedProfilePicture && selectedProfilePicture.length > 0
      ? selectedProfilePicture[0].name
      : "";

  const normalizePayload = (values: MemberFormValues): MemberFormValues => ({
    ...values,
    phone: values.phone.trim(),
    address: values.address?.trim() || undefined,
    email: values.email?.trim() || undefined,
    id_card_number: values.id_card_number?.trim() || undefined,
    blood_group: values.blood_group || undefined,
    profile_picture: values.profile_picture,
    date_of_birth: values.date_of_birth?.trim() || undefined,
    gender: values.gender || undefined,
    membership_plan_template: values.membership_plan_template || null,
    schedule_class: null,
    schedule_slot: values.schedule_slot || null,
    emergency_contact_name: values.emergency_contact_name?.trim() || undefined,
    emergency_contact_phone: values.emergency_contact_phone?.trim() || undefined,
    notes: values.notes?.trim() || undefined,
  });

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(normalizePayload(values)))}
    >
      <Card>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="First Name"
              error={errors.first_name?.message}
              {...register("first_name")}
            />
            <Input
              label="Last Name"
              error={errors.last_name?.message}
              {...register("last_name")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Phone" error={errors.phone?.message} {...register("phone")} />
            <Input
              label="ID Card Number"
              error={errors.id_card_number?.message}
              {...register("id_card_number")}
            />
          </div>

          <Input label="Address" error={errors.address?.message} {...register("address")} />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="email"
              label="Email"
              error={errors.email?.message}
              {...register("email")}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Blood Group
              </label>
              <select
                {...register("blood_group")}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select blood group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
              {errors.blood_group?.message && (
                <p className="mt-1.5 text-sm text-error">{errors.blood_group.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Profile Picture
            </label>
            <input
              type="file"
              accept="image/*"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-white"
              {...register("profile_picture")}
            />
            {selectedFileName && (
              <p className="mt-1 text-xs text-text-secondary">Selected: {selectedFileName}</p>
            )}
            {!selectedFileName && existingProfilePictureUrl && (
              <p className="mt-1 text-xs text-text-secondary">Current profile picture is set.</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Input
              type="date"
              label="Date of Birth"
              error={errors.date_of_birth?.message}
              {...register("date_of_birth")}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Gender
              </label>
              <select
                {...register("gender")}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
              {errors.gender?.message && (
                <p className="mt-1.5 text-sm text-error">{errors.gender.message}</p>
              )}
            </div>
            <Input
              type="date"
              label="Join Date"
              error={errors.join_date?.message}
              {...register("join_date")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Membership Plan
              </label>
              <select
                {...register("membership_plan_template", { valueAsNumber: true })}
                disabled={plansLoading}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <option value="">{plansLoading ? "Loading plans..." : "Select membership plan"}</option>
                {membershipPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - {plan.duration_type} ({plan.duration_months} months) - AFN {Number(plan.fee).toLocaleString()}
                  </option>
                ))}
              </select>
              {errors.membership_plan_template?.message && (
                <p className="mt-1.5 text-sm text-error">{errors.membership_plan_template.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Training Class
              </label>
              <select
                {...register("schedule_slot", { valueAsNumber: true })}
                disabled={slotsLoading}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <option value="">{slotsLoading ? "Loading classes..." : "Select training class"}</option>
                {scheduleSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.class_code} - {slot.class_name} | {weekdayLabels[slot.weekday]}{" "}
                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)} | {slot.trainer_name}
                  </option>
                ))}
              </select>
              {errors.schedule_slot?.message && (
                <p className="mt-1.5 text-sm text-error">{errors.schedule_slot.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Status
              </label>
              <select
                {...register("status")}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {errors.status?.message && (
                <p className="mt-1.5 text-sm text-error">{errors.status.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Emergency Contact Name"
              error={errors.emergency_contact_name?.message}
              {...register("emergency_contact_name")}
            />
            <Input
              label="Emergency Contact Phone"
              error={errors.emergency_contact_phone?.message}
              {...register("emergency_contact_phone")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="number"
              step="0.01"
              label="Height (cm)"
              error={errors.height_cm?.message}
              {...register("height_cm", { valueAsNumber: true })}
            />
            <Input
              type="number"
              step="0.01"
              label="Weight (kg)"
              error={errors.weight_kg?.message}
              {...register("weight_kg", { valueAsNumber: true })}
            />
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm font-medium text-text-primary">BMI Preview</p>
            <p className="mt-1 text-sm text-text-secondary">
              {bmi == null
                ? "Provide both height and weight."
                : `BMI: ${bmi} (${bmiCategory ? bmiCategoryLabel[bmiCategory] : "Unknown"})`}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Notes
            </label>
            <textarea
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              {...register("notes")}
            />
            {errors.notes?.message && (
              <p className="mt-1.5 text-sm text-error">{errors.notes.message}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" loading={isSubmitting}>
              {mode === "create" ? "Create Member" : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

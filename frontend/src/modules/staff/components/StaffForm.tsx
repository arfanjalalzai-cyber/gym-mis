import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { Button, Card, CardContent, Input } from "@/components/ui";
import { useScheduleClassList } from "@/modules/schedule/queries/useSchedule";
import type { ScheduleClassListItem } from "@/modules/schedule/types/schedule";
import { useStaffForm } from "../hooks/useStaffForm";
import type { StaffFormValues, StaffPosition } from "../types/staff";

interface StaffFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<StaffFormValues>;
  existingProfilePictureUrl?: string | null;
  isSubmitting?: boolean;
  onSubmit: (values: StaffFormValues) => Promise<void> | void;
  onCancel?: () => void;
}

interface AssignedClassesDropdownProps {
  classes: ScheduleClassListItem[];
  selectedIds: number[];
  loading?: boolean;
  error?: string;
  onChange: (selectedIds: number[]) => void;
}

function AssignedClassesDropdown({
  classes,
  selectedIds,
  loading = false,
  error,
  onChange,
}: AssignedClassesDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const normalizedSearch = search.trim().toLowerCase();

  const selectedClasses = useMemo(
    () => classes.filter((scheduleClass) => selectedIdSet.has(scheduleClass.id)),
    [classes, selectedIdSet]
  );
  const filteredClasses = useMemo(() => {
    if (!normalizedSearch) return classes;

    return classes.filter((scheduleClass) => {
      const label = `${scheduleClass.class_code} ${scheduleClass.name}`.toLowerCase();
      return label.includes(normalizedSearch);
    });
  }, [classes, normalizedSearch]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const toggleClass = (classId: number) => {
    if (selectedIdSet.has(classId)) {
      onChange(selectedIds.filter((selectedId) => selectedId !== classId));
      return;
    }

    onChange([...selectedIds, classId]);
  };

  const removeClass = (classId: number) => {
    onChange(selectedIds.filter((selectedId) => selectedId !== classId));
  };

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1.5 block text-sm font-medium text-text-primary">
        Assigned Classes
      </label>

      <button
        type="button"
        disabled={loading}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border bg-background px-4 py-2.5 text-left text-sm text-text-primary transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70 ${
          error ? "border-error focus:border-error focus:ring-error/20" : "border-border"
        }`}
      >
        <span className={selectedClasses.length ? "truncate" : "truncate text-muted"}>
          {selectedClasses.length
            ? `${selectedClasses.length} class${selectedClasses.length === 1 ? "" : "es"} selected`
            : loading
              ? "Loading classes..."
              : "Select assigned classes"}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {selectedClasses.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedClasses.map((scheduleClass) => (
            <span
              key={scheduleClass.id}
              className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-text-primary"
            >
              <span className="truncate">
                {scheduleClass.class_code} - {scheduleClass.name}
              </span>
              <button
                type="button"
                onClick={() => removeClass(scheduleClass.id)}
                className="rounded p-0.5 text-muted hover:bg-surface-hover hover:text-text-primary"
                aria-label={`Remove ${scheduleClass.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-border bg-background shadow-lg">
          <div className="relative border-b border-border">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search classes..."
              className="w-full bg-background py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-muted focus:outline-none"
            />
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {filteredClasses.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted">No classes found.</div>
            ) : (
              filteredClasses.map((scheduleClass) => {
                const isSelected = selectedIdSet.has(scheduleClass.id);

                return (
                  <button
                    key={scheduleClass.id}
                    type="button"
                    onClick={() => toggleClass(scheduleClass.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm text-text-primary hover:bg-surface-hover"
                  >
                    <span className="truncate">
                      {scheduleClass.class_code} - {scheduleClass.name}
                    </span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
    </div>
  );
}

export default function StaffForm({
  mode,
  initialValues,
  existingProfilePictureUrl = null,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: StaffFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useStaffForm(initialValues);
  const { data: classesData, isLoading: classesLoading } = useScheduleClassList({
    page: 1,
    page_size: 200,
    is_active: true,
    ordering: "name",
  });

  const selectedPosition = watch("position");
  const assignedClassIds = watch("assigned_class_ids") ?? [];
  const selectedProfilePicture = watch("profile_picture");
  const scheduleClasses = classesData?.results ?? [];
  const selectedFileName =
    selectedProfilePicture && selectedProfilePicture.length > 0
      ? selectedProfilePicture[0].name
      : "";

  const normalizePayload = (values: StaffFormValues): StaffFormValues => ({
    ...values,
    position: values.position as StaffPosition,
    position_other: values.position === "other" ? values.position_other?.trim() || undefined : undefined,
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    father_name: values.father_name?.trim() || undefined,
    mobile_number: values.mobile_number.trim(),
    whatsapp_number: values.whatsapp_number?.trim() || undefined,
    address: values.address?.trim() || undefined,
    id_card_number: values.id_card_number?.trim() || undefined,
    email: values.email?.trim() || undefined,
    blood_group: values.blood_group || undefined,
    profile_picture: values.profile_picture,
    date_of_birth: values.date_of_birth?.trim() || undefined,
    date_hired: values.date_hired.trim(),
    salary_currency: values.salary_currency.trim() || "AFN",
    assigned_class_ids: values.position === "trainer" ? values.assigned_class_ids ?? [] : [],
    notes: values.notes?.trim() || undefined,
  });

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(normalizePayload(values)))}>
      <Card>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Position
              </label>
              <select
                {...register("position")}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="trainer">Trainer</option>
                <option value="manager">Manager</option>
                <option value="cleaner">Cleaner</option>
                <option value="other">Other</option>
              </select>
              {errors.position?.message && (
                <p className="mt-1.5 text-sm text-error">{errors.position.message}</p>
              )}
            </div>

            {selectedPosition === "other" && (
              <Input
                label="Other Position"
                error={errors.position_other?.message}
                {...register("position_other")}
              />
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="First Name"
              error={errors.first_name?.message}
              {...register("first_name")}
            />
            <Input label="Last Name" error={errors.last_name?.message} {...register("last_name")} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Father Name"
              error={errors.father_name?.message}
              {...register("father_name")}
            />
            <Input
              label="ID Card Number (Tazkira)"
              error={errors.id_card_number?.message}
              {...register("id_card_number")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Mobile Number"
              error={errors.mobile_number?.message}
              {...register("mobile_number")}
            />
            <Input
              label="WhatsApp Number"
              error={errors.whatsapp_number?.message}
              {...register("whatsapp_number")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input type="email" label="Email" error={errors.email?.message} {...register("email")} />
            <Input label="Address" error={errors.address?.message} {...register("address")} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="date"
              label="Date of Birth"
              error={errors.date_of_birth?.message}
              {...register("date_of_birth")}
            />
            <Input
              type="date"
              label="Date Hired"
              error={errors.date_hired?.message}
              {...register("date_hired")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Input
              type="number"
              step="0.01"
              label="Monthly Salary"
              error={errors.monthly_salary?.message}
              {...register("monthly_salary", { valueAsNumber: true })}
            />
            <Input
              label="Salary Currency"
              error={errors.salary_currency?.message}
              {...register("salary_currency")}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Salary Status
              </label>
              <select
                {...register("salary_status")}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
              </select>
              {errors.salary_status?.message && (
                <p className="mt-1.5 text-sm text-error">{errors.salary_status.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Employment Status
              </label>
              <select
                {...register("employment_status")}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
                <option value="resigned">Resigned</option>
              </select>
              {errors.employment_status?.message && (
                <p className="mt-1.5 text-sm text-error">{errors.employment_status.message}</p>
              )}
            </div>

            {selectedPosition === "trainer" && (
              <AssignedClassesDropdown
                classes={scheduleClasses}
                selectedIds={assignedClassIds}
                loading={classesLoading}
                error={errors.assigned_class_ids?.message as string | undefined}
                onChange={(selected) =>
                  setValue("assigned_class_ids", selected, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Notes</label>
            <textarea
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              {...register("notes")}
            />
            {errors.notes?.message && <p className="mt-1.5 text-sm text-error">{errors.notes.message}</p>}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" loading={isSubmitting}>
              {mode === "create" ? "Create Staff" : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

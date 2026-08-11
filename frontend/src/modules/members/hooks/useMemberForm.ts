import { useMemo } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { calculateBMI, getBmiCategory } from "../services/bmi";
import { memberFormSchema } from "../schemas/memberSchemas";
import type { MemberFormValues } from "../types/member";

const getDefaultJoinDate = () => new Date().toISOString().slice(0, 10);

type UseMemberFormResult = UseFormReturn<MemberFormValues> & {
  bmi: number | null;
  bmiCategory: ReturnType<typeof getBmiCategory>;
};

export const useMemberForm = (
  initialValues?: Partial<MemberFormValues>
) : UseMemberFormResult => {
  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema) as any,
    defaultValues: {
      first_name: initialValues?.first_name ?? "",
      last_name: initialValues?.last_name ?? "",
      phone: initialValues?.phone ?? "",
      address: initialValues?.address ?? "",
      id_card_number: initialValues?.id_card_number ?? "",
      email: initialValues?.email ?? "",
      blood_group: initialValues?.blood_group ?? undefined,
      profile_picture: null,
      date_of_birth: initialValues?.date_of_birth ?? "",
      gender: initialValues?.gender ?? undefined,
      emergency_contact_name: initialValues?.emergency_contact_name ?? "",
      emergency_contact_phone: initialValues?.emergency_contact_phone ?? "",
      height_cm: initialValues?.height_cm,
      weight_kg: initialValues?.weight_kg,
      join_date: initialValues?.join_date ?? getDefaultJoinDate(),
      membership_plan_template: initialValues?.membership_plan_template ?? null,
      schedule_class: initialValues?.schedule_class ?? null,
      schedule_slot: initialValues?.schedule_slot ?? null,
      status: initialValues?.status ?? "active",
      notes: initialValues?.notes ?? "",
    },
  });

  const watchedHeight = form.watch("height_cm");
  const watchedWeight = form.watch("weight_kg");

  const bmi = useMemo(
    () => calculateBMI(watchedWeight, watchedHeight),
    [watchedWeight, watchedHeight]
  );

  const bmiCategory = useMemo(() => getBmiCategory(bmi), [bmi]);

  return {
    ...form,
    bmi,
    bmiCategory,
  };
};

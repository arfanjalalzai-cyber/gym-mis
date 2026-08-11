import { useForm, type Resolver, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { staffFormSchema } from "../schemas/staffSchemas";
import type { StaffFormValues } from "../types/staff";

const getDefaultDateHired = () => new Date().toISOString().slice(0, 10);

export type UseStaffFormResult = UseFormReturn<StaffFormValues>;

export const useStaffForm = (
  initialValues?: Partial<StaffFormValues>
): UseStaffFormResult => {
  return useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema) as Resolver<StaffFormValues>,
    defaultValues: {
      position: initialValues?.position ?? "manager",
      position_other: initialValues?.position_other ?? "",
      first_name: initialValues?.first_name ?? "",
      last_name: initialValues?.last_name ?? "",
      father_name: initialValues?.father_name ?? "",
      mobile_number: initialValues?.mobile_number ?? "",
      whatsapp_number: initialValues?.whatsapp_number ?? "",
      address: initialValues?.address ?? "",
      id_card_number: initialValues?.id_card_number ?? "",
      email: initialValues?.email ?? "",
      blood_group: initialValues?.blood_group ?? undefined,
      profile_picture: null,
      date_of_birth: initialValues?.date_of_birth ?? "",
      date_hired: initialValues?.date_hired ?? getDefaultDateHired(),
      monthly_salary: initialValues?.monthly_salary as number | undefined,
      salary_currency: initialValues?.salary_currency ?? "AFN",
      salary_status: initialValues?.salary_status ?? "unpaid",
      employment_status: initialValues?.employment_status ?? "active",
      assigned_class_ids: initialValues?.assigned_class_ids ?? [],
      notes: initialValues?.notes ?? "",
    },
  });
};

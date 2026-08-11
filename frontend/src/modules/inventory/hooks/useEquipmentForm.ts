import { useEffect } from "react";
import { useForm, type Resolver, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { equipmentFormSchema } from "../schemas/equipmentSchemas";
import type { EquipmentFormValues } from "../types/equipment";

type UseEquipmentFormResult = UseFormReturn<EquipmentFormValues> & {
  isMachine: boolean;
};

export const useEquipmentForm = (
  initialValues?: Partial<EquipmentFormValues>
): UseEquipmentFormResult => {
  const form = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentFormSchema) as Resolver<EquipmentFormValues>,
    defaultValues: {
      name: initialValues?.name ?? "",
      item_type: initialValues?.item_type ?? "machine",
      category: initialValues?.category ?? "other",
      quantity_on_hand: initialValues?.quantity_on_hand ?? 1,
      quantity_in_service: initialValues?.quantity_in_service ?? 0,
      machine_status: initialValues?.machine_status ?? undefined,
      notes: initialValues?.notes ?? "",
    },
  });

  const watchedItemType = form.watch("item_type");
  const isMachine = watchedItemType === "machine";

  useEffect(() => {
    if (!isMachine) {
      form.setValue("machine_status", undefined);
    }
  }, [form, isMachine]);

  return {
    ...form,
    isMachine,
  };
};

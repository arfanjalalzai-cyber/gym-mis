import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { extractAxiosError } from "@/utils/extractError";
import { cardService } from "../services/cardService";
import type { CardRegenerateInput } from "../types/card";

export const cardKeys = {
  all: ["cards"] as const,
  members: () => [...cardKeys.all, "members"] as const,
  memberCurrent: (memberId: number) => [...cardKeys.members(), "current", memberId] as const,
  memberHistory: (memberId: number) => [...cardKeys.members(), "history", memberId] as const,
  staff: () => [...cardKeys.all, "staff"] as const,
  staffCurrent: (staffId: number) => [...cardKeys.staff(), "current", staffId] as const,
  staffHistory: (staffId: number) => [...cardKeys.staff(), "history", staffId] as const,
  lookup: (cardId: string) => [...cardKeys.all, "lookup", cardId] as const,
};

export const useMemberCard = (memberId: number, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: cardKeys.memberCurrent(memberId),
    queryFn: () => cardService.getMemberCard(memberId).then((res) => res.data),
    enabled: Boolean(memberId) && (options?.enabled ?? true),
    retry: false,
  });

export const useMemberCardHistory = (memberId: number, enabled = true) =>
  useQuery({
    queryKey: cardKeys.memberHistory(memberId),
    queryFn: () => cardService.getMemberCardHistory(memberId).then((res) => res.data),
    enabled: Boolean(memberId) && enabled,
  });

export const useGenerateMemberCard = (memberId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cardService.generateMemberCard(memberId).then((res) => res.data),
    onSuccess: () => {
      toast.success("Member card generated successfully");
      queryClient.invalidateQueries({ queryKey: cardKeys.memberCurrent(memberId) });
      queryClient.invalidateQueries({ queryKey: cardKeys.memberHistory(memberId) });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to generate member card"));
    },
  });
};

export const useRegenerateMemberCard = (memberId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data?: CardRegenerateInput) =>
      cardService.regenerateMemberCard(memberId, data).then((res) => res.data),
    onSuccess: () => {
      toast.success("Member card regenerated successfully");
      queryClient.invalidateQueries({ queryKey: cardKeys.memberCurrent(memberId) });
      queryClient.invalidateQueries({ queryKey: cardKeys.memberHistory(memberId) });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to regenerate member card"));
    },
  });
};

export const useStaffCard = (staffId: number, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: cardKeys.staffCurrent(staffId),
    queryFn: () => cardService.getStaffCard(staffId).then((res) => res.data),
    enabled: Boolean(staffId) && (options?.enabled ?? true),
    retry: false,
  });

export const useStaffCardHistory = (staffId: number, enabled = true) =>
  useQuery({
    queryKey: cardKeys.staffHistory(staffId),
    queryFn: () => cardService.getStaffCardHistory(staffId).then((res) => res.data),
    enabled: Boolean(staffId) && enabled,
  });

export const useGenerateStaffCard = (staffId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cardService.generateStaffCard(staffId).then((res) => res.data),
    onSuccess: () => {
      toast.success("Staff card generated successfully");
      queryClient.invalidateQueries({ queryKey: cardKeys.staffCurrent(staffId) });
      queryClient.invalidateQueries({ queryKey: cardKeys.staffHistory(staffId) });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to generate staff card"));
    },
  });
};

export const useRegenerateStaffCard = (staffId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data?: CardRegenerateInput) =>
      cardService.regenerateStaffCard(staffId, data).then((res) => res.data),
    onSuccess: () => {
      toast.success("Staff card regenerated successfully");
      queryClient.invalidateQueries({ queryKey: cardKeys.staffCurrent(staffId) });
      queryClient.invalidateQueries({ queryKey: cardKeys.staffHistory(staffId) });
    },
    onError: (error) => {
      toast.error(extractAxiosError(error, "Failed to regenerate staff card"));
    },
  });
};

export const useLookupCard = (cardId: string, enabled = true) =>
  useQuery({
    queryKey: cardKeys.lookup(cardId),
    queryFn: () => cardService.lookupCard(cardId).then((res) => res.data),
    enabled: Boolean(cardId.trim()) && enabled,
    retry: false,
  });


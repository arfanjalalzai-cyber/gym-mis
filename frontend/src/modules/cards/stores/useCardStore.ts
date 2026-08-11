import { create } from "zustand";

interface CardStoreState {
  regenerateReason: string;
  lookupCardId: string;
  setRegenerateReason: (reason: string) => void;
  setLookupCardId: (cardId: string) => void;
  resetCardState: () => void;
}

export const useCardStore = create<CardStoreState>((set) => ({
  regenerateReason: "",
  lookupCardId: "",
  setRegenerateReason: (regenerateReason) => set({ regenerateReason }),
  setLookupCardId: (lookupCardId) => set({ lookupCardId }),
  resetCardState: () =>
    set({
      regenerateReason: "",
      lookupCardId: "",
    }),
}));


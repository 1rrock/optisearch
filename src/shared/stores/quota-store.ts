import { create } from "zustand";

interface QuotaState {
  limit: number;
  remaining: number;
  isLimitReached: boolean;
  isModalOpen: boolean;
  setQuota: (limit: number, remaining: number) => void;
  openModal: () => void;
  closeModal: () => void;
}

export const useQuotaStore = create<QuotaState>((set) => ({
  limit: 10,
  remaining: 10,
  isLimitReached: false,
  isModalOpen: false,
  setQuota: (limit, remaining) =>
    set({
      limit,
      remaining,
      isLimitReached: remaining <= 0,
    }),
  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
}));

import { create } from 'zustand';

interface AuthState {
  isLocked: boolean;
  isFirstRun: boolean;
  setLocked: (v: boolean) => void;
  setFirstRun: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLocked: true,
  isFirstRun: false,
  setLocked: (isLocked) => set({ isLocked }),
  setFirstRun: (isFirstRun) => set({ isFirstRun }),
}));

import { create } from 'zustand';

export type TourStepId =
  | 'welcome'
  | 'sidebar-projects'
  | 'new-project-modal'
  | 'env-tabs'
  | 'variable-table'
  | 'new-variable-modal'
  | 'shortcuts'
  | 'done';

interface TourState {
  active: boolean;
  step: TourStepId;
  start: () => void;
  goTo: (step: TourStepId) => void;
  next: () => void;
  skip: () => void;
}

export const STEP_ORDER: TourStepId[] = [
  'welcome',
  'sidebar-projects',
  'new-project-modal',
  'env-tabs',
  'variable-table',
  'new-variable-modal',
  'shortcuts',
  'done',
];

export const useTourStore = create<TourState>((set, get) => ({
  active: false,
  step: 'welcome',

  start: () => set({ active: true, step: 'welcome' }),

  goTo: (step) => set({ step }),

  next: () => {
    const { step } = get();
    const idx = STEP_ORDER.indexOf(step);
    const nextStep = STEP_ORDER[idx + 1];
    if (!nextStep || nextStep === 'done') {
      set({ step: 'done' });
      setTimeout(() => set({ active: false }), 2200);
    } else {
      set({ step: nextStep });
    }
  },

  skip: () => set({ active: false }),
}));

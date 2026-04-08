import { create } from 'zustand';
import type { AppConfig } from '@/types';

interface ConfigState {
  config: AppConfig;
  setConfig: (config: AppConfig) => void;
}

const DEFAULT_CONFIG: AppConfig = {
  auto_lock_minutes: 5,
  lock_on_focus_loss: false,
  audit_enabled: true,
  clipboard_clear_seconds: 30,
  show_lock_countdown: true,
};

export const useConfigStore = create<ConfigState>((set) => ({
  config: DEFAULT_CONFIG,
  setConfig: (config) => set({ config }),
}));

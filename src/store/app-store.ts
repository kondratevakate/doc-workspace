'use client';

import { create } from 'zustand';
import type { ConditionKey, Physician } from '@/src/lib/types';

interface AppState {
  physician: Physician | null;
  expiresAt: string | null;
  enabledConditions: ConditionKey[];
  activeConditionKey: ConditionKey;
  setSession: (payload: { physician: Physician; expiresAt: string; enabledConditions: ConditionKey[] }) => void;
  clearSession: () => void;
  setActiveConditionKey: (conditionKey: ConditionKey) => void;
}

export const useAppStore = create<AppState>((set) => ({
  physician: null,
  expiresAt: null,
  enabledConditions: ['migraine'],
  activeConditionKey: 'migraine',
  setSession: ({ physician, expiresAt, enabledConditions }) =>
    set((state) => ({
      physician,
      expiresAt,
      enabledConditions,
      activeConditionKey: enabledConditions.includes(state.activeConditionKey) ? state.activeConditionKey : enabledConditions[0] || 'migraine'
    })),
  clearSession: () =>
    set({
      physician: null,
      expiresAt: null,
      enabledConditions: ['migraine'],
      activeConditionKey: 'migraine'
    }),
  setActiveConditionKey: (conditionKey) => set({ activeConditionKey: conditionKey })
}));

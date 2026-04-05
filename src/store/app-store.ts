'use client';

import { create } from 'zustand';
import type { ConditionKey, Physician } from '@/src/lib/types';
import { getDefaultAppMode, getDefaultLocale, loadStoredPreferences, setStoredAppMode, setStoredLocale, type AppLocale, type AppMode } from '@/src/lib/preferences';

interface AppState {
  physician: Physician | null;
  expiresAt: string | null;
  enabledConditions: ConditionKey[];
  activeConditionKey: ConditionKey;
  appMode: AppMode;
  locale: AppLocale;
  preferencesHydrated: boolean;
  setSession: (payload: { physician: Physician; expiresAt: string; enabledConditions: ConditionKey[] }) => void;
  clearSession: () => void;
  setActiveConditionKey: (conditionKey: ConditionKey) => void;
  setAppMode: (mode: AppMode) => void;
  setLocale: (locale: AppLocale) => void;
  hydratePreferences: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  physician: null,
  expiresAt: null,
  enabledConditions: ['migraine'],
  activeConditionKey: 'migraine',
  appMode: getDefaultAppMode(),
  locale: getDefaultLocale(),
  preferencesHydrated: false,
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
  setActiveConditionKey: (conditionKey) => set({ activeConditionKey: conditionKey }),
  setAppMode: (appMode) => {
    setStoredAppMode(appMode);
    set({ appMode });
  },
  setLocale: (locale) => {
    setStoredLocale(locale);
    set({ locale });
  },
  hydratePreferences: () => {
    const preferences = loadStoredPreferences();
    set({
      appMode: preferences.appMode,
      locale: preferences.locale,
      preferencesHydrated: true
    });
  }
}));

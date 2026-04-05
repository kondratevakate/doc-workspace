export type AppMode = 'main' | 'demo';
export type AppLocale = 'en' | 'ru';

const APP_MODE_STORAGE_KEY = 'physician-workspace-web.app-mode.v1';
const APP_LOCALE_STORAGE_KEY = 'physician-workspace-web.app-locale.v1';
const DEFAULT_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === '1';

export function getDefaultAppMode(): AppMode {
  return DEFAULT_DEMO_MODE ? 'demo' : 'main';
}

export function getDefaultLocale(): AppLocale {
  return 'en';
}

export function getStoredAppMode(): AppMode {
  if (typeof window === 'undefined') return getDefaultAppMode();
  const value = window.localStorage.getItem(APP_MODE_STORAGE_KEY);
  return value === 'demo' || value === 'main' ? value : getDefaultAppMode();
}

export function setStoredAppMode(mode: AppMode): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(APP_MODE_STORAGE_KEY, mode);
}

export function getStoredLocale(): AppLocale {
  if (typeof window === 'undefined') return getDefaultLocale();
  const value = window.localStorage.getItem(APP_LOCALE_STORAGE_KEY);
  return value === 'ru' || value === 'en' ? value : getDefaultLocale();
}

export function setStoredLocale(locale: AppLocale): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, locale);
}

export function loadStoredPreferences(): { appMode: AppMode; locale: AppLocale } {
  return {
    appMode: getStoredAppMode(),
    locale: getStoredLocale()
  };
}

export function isDemoModeEnabled(): boolean {
  return getStoredAppMode() === 'demo';
}

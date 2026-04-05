'use client';

import { useCallback } from 'react';
import { t } from '@/src/lib/i18n';
import { useAppStore } from '@/src/store/app-store';

export function useI18n() {
  const locale = useAppStore((state) => state.locale);
  const translate = useCallback((key: Parameters<typeof t>[1], variables?: Record<string, string | number>) => t(locale, key, variables), [locale]);

  return {
    locale,
    t: translate
  };
}

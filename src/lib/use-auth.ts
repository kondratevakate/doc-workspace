'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getMe } from '@/src/lib/api';
import { getDemoSession } from '@/src/lib/demo-store';
import { useAppStore } from '@/src/store/app-store';

export function useAuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const physician = useAppStore((state) => state.physician);
  const appMode = useAppStore((state) => state.appMode);
  const preferencesHydrated = useAppStore((state) => state.preferencesHydrated);
  const setSession = useAppStore((state) => state.setSession);
  const clearSession = useAppStore((state) => state.clearSession);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    if (!preferencesHydrated) {
      setLoading(true);
      return () => {
        active = false;
      };
    }

    if (appMode === 'demo') {
      setSession(getDemoSession());
      setLoading(false);
      return () => {
        active = false;
      };
    }

    if (physician) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    getMe()
      .then((session) => {
        if (!active) return;
        setSession(session);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        clearSession();
        router.replace(`/login?next=${encodeURIComponent(pathname || '/today')}`);
      });

    return () => {
      active = false;
    };
  }, [appMode, physician, preferencesHydrated, setSession, clearSession, router, pathname]);

  return {
    physician,
    loading: loading || !preferencesHydrated
  };
}

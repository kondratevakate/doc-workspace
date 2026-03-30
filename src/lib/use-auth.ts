'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getMe } from '@/src/lib/api';
import { useAppStore } from '@/src/store/app-store';

export function useAuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const physician = useAppStore((state) => state.physician);
  const setSession = useAppStore((state) => state.setSession);
  const clearSession = useAppStore((state) => state.clearSession);
  const [loading, setLoading] = useState(!physician);

  useEffect(() => {
    let active = true;
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
  }, [physician, setSession, clearSession, router, pathname]);

  return {
    physician,
    loading
  };
}

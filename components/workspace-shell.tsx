'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AppBar, BottomNavigation, BottomNavigationAction, Box, Button, Chip, Container, Stack, ToggleButton, ToggleButtonGroup, Toolbar, Typography } from '@mui/material';
import { logout } from '@/src/lib/api';
import { getDemoSession, resetDemoState } from '@/src/lib/demo-store';
import type { AppLocale, AppMode } from '@/src/lib/preferences';
import { getPackUi } from '@/src/lib/packs';
import { useI18n } from '@/src/lib/use-i18n';
import { useAppStore } from '@/src/store/app-store';

export function WorkspaceShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, t } = useI18n();
  const physician = useAppStore((state) => state.physician);
  const activeConditionKey = useAppStore((state) => state.activeConditionKey);
  const appMode = useAppStore((state) => state.appMode);
  const setAppMode = useAppStore((state) => state.setAppMode);
  const setLocale = useAppStore((state) => state.setLocale);
  const setSession = useAppStore((state) => state.setSession);
  const clearSession = useAppStore((state) => state.clearSession);
  const [loggingOut, setLoggingOut] = useState(false);
  const pack = useMemo(() => getPackUi(activeConditionKey, locale), [activeConditionKey, locale]);
  const demoMode = appMode === 'demo';

  function handleLocaleChange(_: React.MouseEvent<HTMLElement>, nextLocale: AppLocale | null) {
    if (!nextLocale) return;
    setLocale(nextLocale);
  }

  function handleModeChange(_: React.MouseEvent<HTMLElement>, nextMode: AppMode | null) {
    if (!nextMode || nextMode === appMode) return;

    if (nextMode === 'demo') {
      setAppMode('demo');
      setSession(getDemoSession());
      router.replace('/today');
      return;
    }

    clearSession();
    setAppMode('main');
    router.replace('/login');
  }

  function handleDemoReset() {
    try {
      setLoggingOut(true);
      resetDemoState();
      clearSession();
      setSession(getDemoSession());
      router.replace('/today');
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await logout();
    } finally {
      clearSession();
      router.replace('/login');
    }
  }

  const navItems = [
    { href: '/today', label: t('nav.today') },
    { href: '/capture', label: t('nav.capture') },
    { href: '/drafts', label: t('nav.drafts') },
    { href: '/cohort', label: t('nav.cohort') }
  ];

  return (
    <Box sx={{ minHeight: '100vh', pb: 11 }}>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          backdropFilter: 'blur(18px)',
          backgroundColor: 'rgba(244, 239, 231, 0.76)',
          borderBottom: '1px solid rgba(22,32,36,0.08)'
        }}
      >
        <Toolbar sx={{ minHeight: 76, alignItems: 'flex-start', pt: 1.5, gap: 2 }}>
          <Stack spacing={0.75} flex={1}>
            <Chip label={pack.shortLabel} size="small" color="primary" sx={{ alignSelf: 'flex-start', fontWeight: 700 }} />
            <Typography variant="h5" className="serif-display">
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          </Stack>
          <Stack alignItems="flex-end" spacing={1}>
            <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end" useFlexGap>
              <ToggleButtonGroup size="small" exclusive value={appMode} onChange={handleModeChange} color="primary">
                <ToggleButton value="main">{t('common.main')}</ToggleButton>
                <ToggleButton value="demo">{t('common.demo')}</ToggleButton>
              </ToggleButtonGroup>
              <ToggleButtonGroup size="small" exclusive value={locale} onChange={handleLocaleChange} color="primary">
                <ToggleButton value="en">{t('common.english')}</ToggleButton>
                <ToggleButton value="ru">{t('common.russian')}</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            {demoMode ? <Chip label={t('shell.demoActive')} size="small" color="secondary" /> : null}
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {physician?.displayName || t('common.physician')}
            </Typography>
            {demoMode ? (
              <Button variant="outlined" size="small" disabled={loggingOut} onClick={handleDemoReset}>
                {t('shell.resetDemo')}
              </Button>
            ) : (
              <Button variant="outlined" size="small" disabled={loggingOut} onClick={handleLogout}>
                {t('shell.logOut')}
              </Button>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ px: 2, pt: 2.5 }}>
        <Stack spacing={2.25}>{children}</Stack>
      </Container>

      <Box
        sx={{
          position: 'fixed',
          left: 12,
          right: 12,
          bottom: 12,
          borderRadius: 999,
          overflow: 'hidden',
          border: '1px solid rgba(22,32,36,0.08)',
          boxShadow: '0 16px 40px rgba(22,32,36,0.18)',
          backgroundColor: 'rgba(255,255,255,0.92)'
        }}
      >
        <BottomNavigation value={pathname} showLabels sx={{ backgroundColor: 'transparent' }}>
          {navItems.map((item) => (
            <BottomNavigationAction
              key={item.href}
              label={item.label}
              value={item.href}
              component={Link}
              href={item.href}
              sx={{ minWidth: 0 }}
            />
          ))}
        </BottomNavigation>
      </Box>
    </Box>
  );
}

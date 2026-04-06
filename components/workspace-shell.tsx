'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AppBar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Typography,
} from '@mui/material';
import { logout } from '@/src/lib/api';
import { getDemoSession, resetDemoState } from '@/src/lib/demo-store';
import type { AppLocale, AppMode } from '@/src/lib/preferences';
import { getPackUi } from '@/src/lib/packs';
import { useI18n } from '@/src/lib/use-i18n';
import { useAppStore } from '@/src/store/app-store';

const SIDEBAR_W = 224;

export function WorkspaceShell({
  title,
  subtitle,
  children,
  rightPanel,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
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
  const [mobileOpen, setMobileOpen] = useState(false);
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
    { href: '/cohort', label: t('nav.cohort') },
  ];

  const sidebarContent = (
    <Stack sx={{ height: '100%', p: 2.5, boxSizing: 'border-box' }}>
      {/* Logo */}
      <Box sx={{ mb: 3.5 }}>
        <Typography
          variant="h6"
          className="serif-display"
          sx={{ fontStyle: 'italic', fontWeight: 500, lineHeight: 1.2, letterSpacing: '-0.01em' }}
        >
          Physician Workspace
        </Typography>
        <Chip
          label={pack.shortLabel}
          size="small"
          color="primary"
          sx={{ mt: 0.75, fontWeight: 700, fontSize: '0.7rem' }}
        />
      </Box>

      {/* Nav */}
      <Stack spacing={0.25} sx={{ flex: 1 }}>
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));
          return (
            <Box
              key={item.href}
              component={Link}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 1.5,
                py: 0.875,
                borderRadius: 2,
                color: active ? 'primary.main' : 'text.secondary',
                bgcolor: active ? 'var(--accent-soft)' : 'transparent',
                fontWeight: active ? 700 : 400,
                fontSize: '0.9375rem',
                fontFamily: 'inherit',
                textDecoration: 'none',
                transition: 'background-color 0.15s, color 0.15s',
                '&:hover': {
                  bgcolor: active ? 'var(--accent-soft)' : 'rgba(22,32,36,0.05)',
                  color: active ? 'primary.main' : 'text.primary',
                },
              }}
            >
              {item.label}
            </Box>
          );
        })}
      </Stack>

      {/* Bottom controls */}
      <Divider sx={{ my: 2 }} />
      <Stack spacing={1.25}>
        <Stack spacing={0.5}>
          <ToggleButtonGroup size="small" exclusive value={appMode} onChange={handleModeChange} color="primary" fullWidth>
            <ToggleButton value="main" sx={{ fontSize: '0.72rem', py: 0.4 }}>
              {t('common.main')}
            </ToggleButton>
            <ToggleButton value="demo" sx={{ fontSize: '0.72rem', py: 0.4 }}>
              {t('common.demo')}
            </ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup size="small" exclusive value={locale} onChange={handleLocaleChange} color="primary" fullWidth>
            <ToggleButton value="en" sx={{ fontSize: '0.72rem', py: 0.4 }}>
              {t('common.english')}
            </ToggleButton>
            <ToggleButton value="ru" sx={{ fontSize: '0.72rem', py: 0.4 }}>
              {t('common.russian')}
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        {demoMode && (
          <Chip label={t('shell.demoActive')} size="small" color="secondary" sx={{ alignSelf: 'flex-start' }} />
        )}
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {physician?.displayName || t('common.physician')}
        </Typography>
        {demoMode ? (
          <Button variant="outlined" size="small" disabled={loggingOut} onClick={handleDemoReset} fullWidth>
            {t('shell.resetDemo')}
          </Button>
        ) : (
          <Button variant="outlined" size="small" disabled={loggingOut} onClick={handleLogout} fullWidth>
            {t('shell.logOut')}
          </Button>
        )}
      </Stack>
    </Stack>
  );

  const sidebarStyles = {
    borderRight: '1px solid rgba(22,32,36,0.08)',
    backgroundColor: 'rgba(255,255,255,0.62)',
    backdropFilter: 'blur(14px)',
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
      {/* ── Desktop permanent sidebar ── */}
      <Box
        component="nav"
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          width: SIDEBAR_W,
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          ...sidebarStyles,
        }}
      >
        {sidebarContent}
      </Box>

      {/* ── Mobile temporary drawer ── */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: SIDEBAR_W,
            boxSizing: 'border-box',
            ...sidebarStyles,
          },
        }}
      >
        {sidebarContent}
      </Drawer>

      {/* ── Main column ── */}
      <Box sx={{ flex: 1, minWidth: 0, maxWidth: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Mobile header */}
        <AppBar
          position="sticky"
          color="transparent"
          elevation={0}
          sx={{
            display: { xs: 'flex', md: 'none' },
            backdropFilter: 'blur(18px)',
            backgroundColor: 'rgba(244, 239, 231, 0.82)',
            borderBottom: '1px solid rgba(22,32,36,0.08)',
          }}
        >
          <Toolbar sx={{ minHeight: 56, gap: 1.5 }}>
            <Button
              size="small"
              onClick={() => setMobileOpen(true)}
              sx={{ minWidth: 36, px: 0.5, color: 'text.secondary', fontSize: '1.25rem', lineHeight: 1 }}
            >
              ≡
            </Button>
            <Chip label={pack.shortLabel} size="small" color="primary" sx={{ fontWeight: 700 }} />
            <Typography variant="h6" className="serif-display" sx={{ flex: 1, fontStyle: 'italic' }}>
              {title}
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Content */}
        <Box
          sx={{
            flex: 1,
            px: { xs: 2, md: 3 },
            pt: { xs: 2.5, md: 4 },
            pb: { xs: 12, md: 5 },
          }}
        >
          <Stack spacing={2.25} sx={{ maxWidth: 680 }}>
            {/* Desktop page heading */}
            <Box sx={{ display: { xs: 'none', md: 'block' }, mb: 0.5 }}>
              <Typography variant="h4" className="serif-display" sx={{ fontStyle: 'italic', fontWeight: 500, letterSpacing: '-0.02em' }}>
                {title}
              </Typography>
              {subtitle ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {subtitle}
                </Typography>
              ) : null}
            </Box>
            {children}
          </Stack>
        </Box>

        {/* Mobile bottom nav */}
        <Box
          sx={{
            display: { xs: 'block', md: 'none' },
            position: 'fixed',
            left: 12,
            right: 12,
            bottom: 12,
            borderRadius: 999,
            overflow: 'hidden',
            border: '1px solid rgba(22,32,36,0.08)',
            boxShadow: '0 16px 40px rgba(22,32,36,0.18)',
            backgroundColor: 'rgba(255,255,255,0.92)',
            zIndex: 1100,
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

      {/* ── Right panel (desktop only, optional) ── */}
      {rightPanel ? (
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            width: 280,
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            maxHeight: '100vh',
            overflowY: 'auto',
            borderLeft: '1px solid rgba(22,32,36,0.08)',
            backgroundColor: 'rgba(255,255,255,0.5)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {rightPanel}
        </Box>
      ) : null}
    </Box>
  );
}

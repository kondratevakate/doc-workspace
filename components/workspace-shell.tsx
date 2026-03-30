'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AppBar, BottomNavigation, BottomNavigationAction, Box, Button, Chip, Container, Stack, Toolbar, Typography } from '@mui/material';
import { logout } from '@/src/lib/api';
import { getPackUi } from '@/src/lib/packs';
import { useAppStore } from '@/src/store/app-store';

const navItems = [
  { href: '/today', label: 'Today' },
  { href: '/capture', label: 'Capture' },
  { href: '/drafts', label: 'Drafts' },
  { href: '/cohort', label: 'Cohort' }
];

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
  const physician = useAppStore((state) => state.physician);
  const activeConditionKey = useAppStore((state) => state.activeConditionKey);
  const clearSession = useAppStore((state) => state.clearSession);
  const [loggingOut, setLoggingOut] = useState(false);
  const pack = useMemo(() => getPackUi(activeConditionKey), [activeConditionKey]);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await logout();
    } finally {
      clearSession();
      router.replace('/login');
    }
  }

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
        <Toolbar sx={{ minHeight: 76, alignItems: 'flex-start', pt: 1.5 }}>
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
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {physician?.displayName || 'Physician'}
            </Typography>
            <Button variant="outlined" size="small" disabled={loggingOut} onClick={handleLogout}>
              Log out
            </Button>
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

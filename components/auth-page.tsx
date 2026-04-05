'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Container, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { requestMagicLink } from '@/src/lib/api';
import { getDemoSession, resetDemoState } from '@/src/lib/demo-store';
import type { AppLocale, AppMode } from '@/src/lib/preferences';
import { useI18n } from '@/src/lib/use-i18n';
import { useAppStore } from '@/src/store/app-store';

export function AuthPage({ nextPath = '/today' }: { nextPath?: string }) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const appMode = useAppStore((state) => state.appMode);
  const setAppMode = useAppStore((state) => state.setAppMode);
  const setLocale = useAppStore((state) => state.setLocale);
  const setSession = useAppStore((state) => state.setSession);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const demoMode = appMode === 'demo';

  function handleLocaleChange(_: React.MouseEvent<HTMLElement>, nextLocale: AppLocale | null) {
    if (!nextLocale) return;
    setLocale(nextLocale);
  }

  function handleModeChange(_: React.MouseEvent<HTMLElement>, nextMode: AppMode | null) {
    if (!nextMode) return;
    setAppMode(nextMode);
    setMessage(null);
    setError(null);
    setVerifyUrl(null);
  }

  function enterDemo(resetState = false) {
    setAppMode('demo');
    if (resetState) {
      resetDemoState();
    }
    setSession(getDemoSession());
    router.replace(nextPath);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    setVerifyUrl(null);
    try {
      const redirectTo = typeof window === 'undefined' ? nextPath : `${window.location.origin}${nextPath}`;
      const result = await requestMagicLink(email, redirectTo);
      setVerifyUrl(rebaseVerifyUrl(result.verifyUrl, redirectTo));
      setMessage(result.verifyUrl ? t('auth.magicLinkGenerated') : t('auth.magicLinkRequested'));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('auth.requestMagicLinkError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2 }}>
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          p: 3,
          borderRadius: 6,
          border: '1px solid rgba(22,32,36,0.08)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.82) 100%)',
          boxShadow: '0 18px 48px rgba(22,32,36,0.12)'
        }}
      >
        <Stack spacing={2.25}>
          <Stack direction="row" justifyContent="space-between" flexWrap="wrap" useFlexGap spacing={1.25}>
            <ToggleButtonGroup size="small" exclusive value={appMode} onChange={handleModeChange} color="primary">
              <ToggleButton value="main">{t('common.main')}</ToggleButton>
              <ToggleButton value="demo">{t('common.demo')}</ToggleButton>
            </ToggleButtonGroup>
            <ToggleButtonGroup size="small" exclusive value={locale} onChange={handleLocaleChange} color="primary">
              <ToggleButton value="en">{t('common.english')}</ToggleButton>
              <ToggleButton value="ru">{t('common.russian')}</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.12em' }}>
              {demoMode ? t('auth.demoEyebrow') : t('auth.eyebrow')}
            </Typography>
            <Typography variant="h3" className="serif-display" sx={{ mt: 1 }}>
              {demoMode ? t('auth.demoTitle') : t('auth.title')}
            </Typography>
          </Box>

          <Typography color="text.secondary">{demoMode ? t('auth.demoDescription') : t('auth.description')}</Typography>

          {demoMode ? (
            <>
              <Alert severity="info">{t('auth.demoNotice')}</Alert>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button variant="contained" size="large" onClick={() => enterDemo(false)}>
                  {t('auth.enterDemo')}
                </Button>
                <Button variant="outlined" size="large" onClick={() => enterDemo(true)}>
                  {t('auth.resetDemoData')}
                </Button>
              </Stack>
            </>
          ) : (
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  required
                  type="email"
                  label={t('auth.physicianEmail')}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
                <Button type="submit" variant="contained" size="large" disabled={submitting || !email.trim()}>
                  {submitting ? t('auth.preparingLink') : t('auth.requestMagicLink')}
                </Button>
              </Stack>
            </Box>
          )}

          {message ? <Alert severity="success">{message}</Alert> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
          {verifyUrl ? (
            <Alert severity="info" action={<Button component={Link} href={verifyUrl}>{t('auth.open')}</Button>}>
              {t('auth.developmentLinkNotice')}
            </Alert>
          ) : null}
        </Stack>
      </Paper>
    </Container>
  );
}

function rebaseVerifyUrl(rawVerifyUrl: string | null | undefined, redirectTo: string): string | null {
  if (!rawVerifyUrl || typeof window === 'undefined') return rawVerifyUrl || null;
  try {
    const original = new URL(rawVerifyUrl);
    const rebased = new URL('/api/auth/verify', window.location.origin);
    const token = original.searchParams.get('token');
    if (token) rebased.searchParams.set('token', token);
    rebased.searchParams.set('redirect_to', redirectTo);
    return rebased.toString();
  } catch {
    return rawVerifyUrl;
  }
}

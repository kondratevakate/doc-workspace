'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import { requestMagicLink } from '@/src/lib/api';

export function AuthPage({ nextPath = '/today' }: { nextPath?: string }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setMessage(result.verifyUrl ? 'Development magic link generated.' : 'Magic link requested. Check the physician inbox.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not request magic link.');
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
          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.12em' }}>
              UAE physician workspace
            </Typography>
            <Typography variant="h3" className="serif-display" sx={{ mt: 1 }}>
              Secure case follow-up, built for the phone.
            </Typography>
          </Box>
          <Typography color="text.secondary">
            This workspace stores voice drafts, case cards, and follow-up queues in the secured web application, not in a messenger thread.
          </Typography>
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                required
                type="email"
                label="Physician email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
              <Button type="submit" variant="contained" size="large" disabled={submitting || !email.trim()}>
                {submitting ? 'Preparing link...' : 'Request magic link'}
              </Button>
            </Stack>
          </Box>
          {message ? <Alert severity="success">{message}</Alert> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
          {verifyUrl ? (
            <Alert severity="info" action={<Button component={Link} href={verifyUrl}>Open</Button>}>
              Development mode is returning the verification link directly so you can continue without email delivery.
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

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Paper, Stack, Typography } from '@mui/material';
import { ApiError, listVoiceDrafts } from '@/src/lib/api';
import type { VoiceDraft } from '@/src/lib/types';
import { useAuthGuard } from '@/src/lib/use-auth';
import { useAppStore } from '@/src/store/app-store';
import { LoadingState } from './loading-state';
import { SectionCard } from './section-card';
import { WorkspaceShell } from './workspace-shell';

export function DraftsView() {
  const { physician, loading } = useAuthGuard();
  const activeConditionKey = useAppStore((state) => state.activeConditionKey);
  const [drafts, setDrafts] = useState<VoiceDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!physician) return;
    let active = true;
    setError(null);
    listVoiceDrafts(activeConditionKey)
      .then((result) => {
        if (active) setDrafts(result);
      })
      .catch((fetchError) => {
        if (!active) return;
        setError(fetchError instanceof ApiError ? fetchError.message : 'Could not load drafts.');
      });
    return () => {
      active = false;
    };
  }, [physician, activeConditionKey]);

  if (loading || !physician) return <LoadingState label="Loading drafts..." />;

  return (
    <WorkspaceShell title="Drafts" subtitle="Voice captures stay here until they are committed into a canonical case.">
      {error ? <Alert severity="error">{error}</Alert> : null}
      <SectionCard title="Unresolved drafts" eyebrow="Review queue">
        <Stack spacing={1.25}>
          {drafts.length ? (
            drafts.map((draft) => (
              <Paper key={draft.id} component={Link} href={`/capture?draft=${draft.id}`} elevation={0} sx={{ p: 2, border: '1px solid rgba(22,32,36,0.08)' }}>
                <Stack spacing={1}>
                  <Typography sx={{ fontWeight: 700 }}>Draft #{draft.id}</Typography>
                  <Typography color="text.secondary">{draft.summary || draft.transcript || 'Transcript pending.'}</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="text">Open draft</Button>
                    <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                      {draft.reviewState.replaceAll('_', ' ')}
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            ))
          ) : (
            <Typography color="text.secondary">No unresolved drafts. Fresh captures will appear here until committed.</Typography>
          )}
        </Stack>
      </SectionCard>
    </WorkspaceShell>
  );
}

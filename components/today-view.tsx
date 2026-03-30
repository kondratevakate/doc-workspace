'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Grid, Paper, Stack, Typography } from '@mui/material';
import { ApiError, getTodayQueues } from '@/src/lib/api';
import { getPackUi } from '@/src/lib/packs';
import type { TodayQueues } from '@/src/lib/types';
import { useAuthGuard } from '@/src/lib/use-auth';
import { useAppStore } from '@/src/store/app-store';
import { CaseCard } from './case-card';
import { LoadingState } from './loading-state';
import { SectionCard } from './section-card';
import { WorkspaceShell } from './workspace-shell';

export function TodayView() {
  const { physician, loading } = useAuthGuard();
  const activeConditionKey = useAppStore((state) => state.activeConditionKey);
  const [queues, setQueues] = useState<TodayQueues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!physician) return;
    let active = true;
    setError(null);
    getTodayQueues(activeConditionKey)
      .then((result) => {
        if (active) setQueues(result);
      })
      .catch((fetchError) => {
        if (!active) return;
        setError(fetchError instanceof ApiError ? fetchError.message : 'Could not load queues.');
      });
    return () => {
      active = false;
    };
  }, [physician, activeConditionKey, refreshKey]);

  if (loading || !physician) return <LoadingState label="Loading physician workspace..." />;

  const pack = getPackUi(activeConditionKey);

  return (
    <WorkspaceShell title="Today" subtitle={pack.heroSubtitle}>
      <SectionCard title="Daily posture" eyebrow="Launch pack">
        <Typography color="text.secondary">{pack.cohortDescription}</Typography>
      </SectionCard>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {queues ? (
        <Grid container spacing={1.25}>
          <Grid size={6}>
            <StatCard label="Due today" value={queues.stats.dueToday} />
          </Grid>
          <Grid size={6}>
            <StatCard label="Overdue" value={queues.stats.overdue} tone="warm" />
          </Grid>
          <Grid size={6}>
            <StatCard label="Non-responder" value={queues.stats.nonResponder} />
          </Grid>
          <Grid size={6}>
            <StatCard label="Drafts" value={queues.stats.unresolvedDrafts} />
          </Grid>
        </Grid>
      ) : (
        <LoadingState label="Loading today queues..." />
      )}

      {queues ? (
        <>
          <QueueSection title="Due today" items={queues.dueToday} emptyLabel="No cases due today." />
          <QueueSection title="Overdue" items={queues.overdue} emptyLabel="No overdue cases." />
          <QueueSection title="Non-responder" items={queues.nonResponder} emptyLabel="No non-responder cases right now." />
          <QueueSection title="No next step" items={queues.noNextStep} emptyLabel="Every open case has a next step." />
          <SectionCard title="Drafts unresolved" eyebrow="Review queue">
            <Stack spacing={1.25}>
              {queues.unresolvedDrafts.length ? (
                queues.unresolvedDrafts.map((draft) => (
                  <Paper key={draft.id} component={Link} href={`/capture?draft=${draft.id}`} elevation={0} sx={{ p: 2, border: '1px solid rgba(22,32,36,0.08)' }}>
                    <Stack spacing={1}>
                      <Typography sx={{ fontWeight: 700 }}>Draft #{draft.id}</Typography>
                      <Typography color="text.secondary">{draft.summary || draft.transcript || 'Transcript pending.'}</Typography>
                    </Stack>
                  </Paper>
                ))
              ) : (
                <Typography color="text.secondary">No unresolved drafts.</Typography>
              )}
            </Stack>
          </SectionCard>
        </>
      ) : null}

      <Button variant="outlined" onClick={() => setRefreshKey((value) => value + 1)}>
        Refresh queues
      </Button>
    </WorkspaceShell>
  );
}

function QueueSection({ title, items, emptyLabel }: { title: string; items: TodayQueues['dueToday']; emptyLabel: string }) {
  return (
    <SectionCard title={title}>
      <Stack spacing={1.25}>
        {items.length ? items.map((item) => <CaseCard key={item.id} item={item} />) : <Typography color="text.secondary">{emptyLabel}</Typography>}
      </Stack>
    </SectionCard>
  );
}

function StatCard({ label, value, tone = 'cool' }: { label: string; value: number; tone?: 'cool' | 'warm' }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: '1px solid rgba(22,32,36,0.08)',
        background: tone === 'warm' ? 'rgba(201,111,66,0.1)' : 'rgba(14,107,116,0.08)'
      }}
    >
      <Stack spacing={0.5}>
        <Typography variant="h4" className="serif-display">
          {value}
        </Typography>
        <Typography color="text.secondary">{label}</Typography>
      </Stack>
    </Paper>
  );
}

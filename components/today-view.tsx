'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Grid, Paper, Stack, Typography } from '@mui/material';
import { ApiError, getTodayQueues } from '@/src/lib/api';
import { getPackUi } from '@/src/lib/packs';
import type { TodayQueues } from '@/src/lib/types';
import { useI18n } from '@/src/lib/use-i18n';
import { useAuthGuard } from '@/src/lib/use-auth';
import { useAppStore } from '@/src/store/app-store';
import { CaseCard } from './case-card';
import { LoadingState } from './loading-state';
import { SectionCard } from './section-card';
import { WorkspaceShell } from './workspace-shell';

export function TodayView() {
  const { physician, loading } = useAuthGuard();
  const { locale, t } = useI18n();
  const activeConditionKey = useAppStore((state) => state.activeConditionKey);
  const [queues, setQueues] = useState<TodayQueues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const pack = useMemo(() => getPackUi(activeConditionKey, locale), [activeConditionKey, locale]);

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
        setError(fetchError instanceof ApiError ? fetchError.message : t('today.loadQueuesError'));
      });
    return () => {
      active = false;
    };
  }, [physician, activeConditionKey, refreshKey, t]);

  if (loading || !physician) return <LoadingState label={t('today.loadingWorkspace')} />;

  return (
    <WorkspaceShell title={t('today.title')} subtitle={pack.heroSubtitle}>
      <SectionCard title={t('today.dailyPosture')} eyebrow={t('today.launchPack')}>
        <Typography color="text.secondary">{pack.cohortDescription}</Typography>
      </SectionCard>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {queues ? (
        <Grid container spacing={1.25}>
          <Grid size={6}>
            <StatCard label={t('today.dueToday')} value={queues.stats.dueToday} />
          </Grid>
          <Grid size={6}>
            <StatCard label={t('today.overdue')} value={queues.stats.overdue} tone="warm" />
          </Grid>
          <Grid size={6}>
            <StatCard label={t('today.nonResponder')} value={queues.stats.nonResponder} />
          </Grid>
          <Grid size={6}>
            <StatCard label={t('today.drafts')} value={queues.stats.unresolvedDrafts} />
          </Grid>
        </Grid>
      ) : (
        <LoadingState label={t('today.loadingQueues')} />
      )}

      {queues ? (
        <>
          <QueueSection title={t('today.dueToday')} items={queues.dueToday} emptyLabel={t('today.noCasesDueToday')} />
          <QueueSection title={t('today.overdue')} items={queues.overdue} emptyLabel={t('today.noOverdueCases')} />
          <QueueSection title={t('today.nonResponder')} items={queues.nonResponder} emptyLabel={t('today.noNonResponderCases')} />
          <QueueSection title={t('today.noNextStep')} items={queues.noNextStep} emptyLabel={t('today.everyCaseHasNextStep')} />
          <SectionCard title={t('today.draftsUnresolved')} eyebrow={t('today.reviewQueue')}>
            <Stack spacing={1.25}>
              {queues.unresolvedDrafts.length ? (
                queues.unresolvedDrafts.map((draft) => (
                  <Paper key={draft.id} component={Link} href={`/capture?draft=${draft.id}`} elevation={0} sx={{ p: 2, border: '1px solid rgba(22,32,36,0.08)' }}>
                    <Stack spacing={1}>
                      <Typography sx={{ fontWeight: 700 }}>{t('common.draftNumber', { id: draft.id })}</Typography>
                      <Typography color="text.secondary">{draft.summary || draft.transcript || t('today.transcriptPending')}</Typography>
                    </Stack>
                  </Paper>
                ))
              ) : (
                <Typography color="text.secondary">{t('today.noUnresolvedDrafts')}</Typography>
              )}
            </Stack>
          </SectionCard>
        </>
      ) : null}

      <Button variant="outlined" onClick={() => setRefreshKey((value) => value + 1)}>
        {t('today.refreshQueues')}
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

'use client';

import { useEffect, useState } from 'react';
import { Alert, Grid, Stack, Typography } from '@mui/material';
import { ApiError, getCohortSummary } from '@/src/lib/api';
import { formatFieldValue } from '@/src/lib/packs';
import { useI18n } from '@/src/lib/use-i18n';
import { useAuthGuard } from '@/src/lib/use-auth';
import { useAppStore } from '@/src/store/app-store';
import type { CohortSummary } from '@/src/lib/types';
import { CaseCard } from './case-card';
import { LoadingState } from './loading-state';
import { SectionCard } from './section-card';
import { WorkspaceShell } from './workspace-shell';

export function CohortView() {
  const { physician, loading } = useAuthGuard();
  const { locale, t } = useI18n();
  const activeConditionKey = useAppStore((state) => state.activeConditionKey);
  const [summary, setSummary] = useState<CohortSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!physician) return;
    let active = true;
    setError(null);
    getCohortSummary(activeConditionKey)
      .then((result) => {
        if (active) setSummary(result);
      })
      .catch((fetchError) => {
        if (!active) return;
        setError(fetchError instanceof ApiError ? fetchError.message : t('cohort.loadError'));
      });
    return () => {
      active = false;
    };
  }, [physician, activeConditionKey, t]);

  if (loading || !physician) return <LoadingState label={t('cohort.loading')} />;

  return (
    <WorkspaceShell title={t('cohort.title')} subtitle={t('cohort.subtitle')}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {!summary ? (
        <LoadingState label={t('cohort.preparing')} />
      ) : (
        <>
          <SectionCard title={t('cohort.responseDistribution')} eyebrow={t('cohort.clinicalPosture')}>
            <Grid container spacing={1.25}>
              {Object.entries(summary.responseBuckets).map(([key, value]) => (
                <Grid key={key} size={6}>
                  <BucketCard label={formatFieldValue(key, locale, activeConditionKey)} value={value} />
                </Grid>
              ))}
            </Grid>
          </SectionCard>
          <SectionCard title={t('cohort.migraineBuckets')} eyebrow={t('cohort.diseaseSlices')}>
            <Grid container spacing={1.25}>
              {Object.entries(summary.migraineBuckets).map(([key, value]) => (
                <Grid key={key} size={6}>
                  <BucketCard label={formatFieldValue(key, locale, activeConditionKey)} value={value} />
                </Grid>
              ))}
            </Grid>
          </SectionCard>
          <SectionCard title={t('cohort.recentCases')} eyebrow={t('cohort.latestActivity')}>
            <Stack spacing={1.25}>
              {summary.recentCases.length ? summary.recentCases.map((item) => <CaseCard key={item.id} item={item} />) : <Typography color="text.secondary">{t('cohort.noCommittedCases')}</Typography>}
            </Stack>
          </SectionCard>
        </>
      )}
    </WorkspaceShell>
  );
}

function BucketCard({ label, value }: { label: string; value: number }) {
  return (
    <SectionCard title={String(value)}>
      <Typography color="text.secondary">{label}</Typography>
    </SectionCard>
  );
}

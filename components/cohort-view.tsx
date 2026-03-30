'use client';

import { useEffect, useState } from 'react';
import { Alert, Grid, Stack, Typography } from '@mui/material';
import { ApiError, getCohortSummary } from '@/src/lib/api';
import { useAuthGuard } from '@/src/lib/use-auth';
import { useAppStore } from '@/src/store/app-store';
import type { CohortSummary } from '@/src/lib/types';
import { CaseCard } from './case-card';
import { LoadingState } from './loading-state';
import { SectionCard } from './section-card';
import { WorkspaceShell } from './workspace-shell';

export function CohortView() {
  const { physician, loading } = useAuthGuard();
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
        setError(fetchError instanceof ApiError ? fetchError.message : 'Could not load cohort summary.');
      });
    return () => {
      active = false;
    };
  }, [physician, activeConditionKey]);

  if (loading || !physician) return <LoadingState label="Loading cohort..." />;

  return (
    <WorkspaceShell title="Cohort" subtitle="Lightweight cohort view for fast review, not a heavy registry.">
      {error ? <Alert severity="error">{error}</Alert> : null}
      {!summary ? (
        <LoadingState label="Preparing cohort summary..." />
      ) : (
        <>
          <SectionCard title="Response distribution" eyebrow="Clinical posture">
            <Grid container spacing={1.25}>
              {Object.entries(summary.responseBuckets).map(([key, value]) => (
                <Grid key={key} size={6}>
                  <BucketCard label={key.replaceAll('_', ' ')} value={value} />
                </Grid>
              ))}
            </Grid>
          </SectionCard>
          <SectionCard title="Migraine buckets" eyebrow="Disease slices">
            <Grid container spacing={1.25}>
              {Object.entries(summary.migraineBuckets).map(([key, value]) => (
                <Grid key={key} size={6}>
                  <BucketCard label={key.replaceAll('_', ' ')} value={value} />
                </Grid>
              ))}
            </Grid>
          </SectionCard>
          <SectionCard title="Recent cases" eyebrow="Latest activity">
            <Stack spacing={1.25}>
              {summary.recentCases.length ? summary.recentCases.map((item) => <CaseCard key={item.id} item={item} />) : <Typography color="text.secondary">No committed cases yet.</Typography>}
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
      <Typography color="text.secondary" sx={{ textTransform: 'capitalize' }}>
        {label}
      </Typography>
    </SectionCard>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Alert, Box, Grid, Stack, Tooltip, Typography } from '@mui/material';
import { ApiError, getCohortSummary } from '@/src/lib/api';
import { formatFieldValue } from '@/src/lib/packs';
import { useI18n } from '@/src/lib/use-i18n';
import { useAuthGuard } from '@/src/lib/use-auth';
import { useAppStore } from '@/src/store/app-store';
import type { CaseCard, CohortSummary } from '@/src/lib/types';
import type { AppLocale } from '@/src/lib/preferences';
import { getPatientIdentity } from '@/src/lib/patient-identity';
import { PatientAvatar } from './patient-avatar';
import { CaseCard as CaseCardComponent } from './case-card';
import { LoadingState } from './loading-state';
import { SectionCard } from './section-card';
import { WorkspaceShell } from './workspace-shell';

// ── Cohort Map ────────────────────────────────────────────────────────────────

const FREQ_COLS = ['1-3_per_month', '4-7_per_month', '8-14_per_month', '15+_per_month'];
const BUCKET_ROWS = ['episodic_migraine', 'chronic_migraine', 'unclear_headache'];

const FREQ_LABELS: Record<string, Record<AppLocale, string>> = {
  '1-3_per_month':  { en: '1–3 / mo', ru: '1–3 / мес' },
  '4-7_per_month':  { en: '4–7 / mo', ru: '4–7 / мес' },
  '8-14_per_month': { en: '8–14 / mo', ru: '8–14 / мес' },
  '15+_per_month':  { en: '15+ / mo', ru: '15+ / мес' },
};

const BUCKET_LABELS: Record<string, Record<AppLocale, string>> = {
  episodic_migraine: { en: 'Episodic', ru: 'Эпизод.' },
  chronic_migraine:  { en: 'Chronic',  ru: 'Хронич.' },
  unclear_headache:  { en: 'Unclear',  ru: 'Неясно' },
};

function CohortMap({ cases, locale }: { cases: CaseCard[]; locale: AppLocale }) {
  // Build lookup: bucket×freq → cases[]
  const grid: Record<string, Record<string, CaseCard[]>> = {};
  for (const bucket of BUCKET_ROWS) {
    grid[bucket] = {};
    for (const freq of FREQ_COLS) grid[bucket][freq] = [];
  }
  for (const c of cases) {
    const bucket = (c.conditionPayload?.migraineBucket as string | null) ?? '';
    const freq = (c.conditionPayload?.attackFrequencyBand as string | null) ?? '';
    if (grid[bucket] && grid[bucket][freq] !== undefined) {
      grid[bucket][freq].push(c);
    }
  }

  const cellBorder = '1px solid rgba(22,32,36,0.07)';

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ minWidth: 360 }}>
        {/* Header row */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '72px repeat(4, 1fr)', mb: 0.5 }}>
          <Box />
          {FREQ_COLS.map((freq) => (
            <Typography
              key={freq}
              variant="caption"
              color="text.secondary"
              sx={{ textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem', px: 0.5 }}
            >
              {FREQ_LABELS[freq]?.[locale] ?? freq}
            </Typography>
          ))}
        </Box>

        {/* Data rows */}
        {BUCKET_ROWS.map((bucket) => (
          <Box
            key={bucket}
            sx={{ display: 'grid', gridTemplateColumns: '72px repeat(4, 1fr)', mb: 0 }}
          >
            {/* Row label */}
            <Box sx={{ display: 'flex', alignItems: 'center', pr: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.3 }}
              >
                {BUCKET_LABELS[bucket]?.[locale] ?? bucket}
              </Typography>
            </Box>

            {/* Cells */}
            {FREQ_COLS.map((freq) => {
              const cellCases = grid[bucket][freq];
              return (
                <Box
                  key={freq}
                  sx={{
                    minHeight: 56,
                    border: cellBorder,
                    borderRadius: 1.5,
                    m: 0.25,
                    p: 0.75,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 0.5,
                    alignContent: 'flex-start',
                    backgroundColor: cellCases.length > 0 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)',
                  }}
                >
                  {cellCases.map((c) => (
                    <Tooltip
                      key={c.id}
                      title={
                        <Box sx={{ p: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                            {c.caseToken}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>
                            {c.summary}
                          </Typography>
                        </Box>
                      }
                      arrow
                      placement="top"
                    >
                      <Box
                        component={Link}
                        href={`/cases/${c.id}`}
                        sx={{ display: 'inline-flex', textDecoration: 'none' }}
                      >
                        <PatientAvatar case={c} locale={locale} size={32} showTooltip={false} />
                      </Box>
                    </Tooltip>
                  ))}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

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
      .then((result) => { if (active) setSummary(result); })
      .catch((fetchError) => {
        if (!active) return;
        setError(fetchError instanceof ApiError ? fetchError.message : t('cohort.loadError'));
      });
    return () => { active = false; };
  }, [physician, activeConditionKey, t]);

  if (loading || !physician) return <LoadingState label={t('cohort.loading')} />;

  return (
    <WorkspaceShell title={t('cohort.title')} subtitle={t('cohort.subtitle')}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {!summary ? (
        <LoadingState label={t('cohort.preparing')} />
      ) : (
        <>
          {/* Cohort map — spatial grid */}
          <SectionCard title={t('cohort.migraineBuckets')} eyebrow={t('cohort.diseaseSlices')}>
            <CohortMap cases={summary.recentCases} locale={locale} />
          </SectionCard>

          {/* Response distribution */}
          <SectionCard title={t('cohort.responseDistribution')} eyebrow={t('cohort.clinicalPosture')}>
            <Grid container spacing={1.25}>
              {Object.entries(summary.responseBuckets).map(([key, value]) => (
                <Grid key={key} size={6}>
                  <BucketCard
                    label={key === 'null' || key === 'not_set' || !key ? t('common.notSet') : formatFieldValue(key, locale, activeConditionKey)}
                    value={value}
                  />
                </Grid>
              ))}
            </Grid>
          </SectionCard>

          {/* Recent cases with avatars */}
          <SectionCard title={t('cohort.recentCases')} eyebrow={t('cohort.latestActivity')}>
            <Stack spacing={1.25}>
              {summary.recentCases.length
                ? summary.recentCases.map((item) => <CaseCardComponent key={item.id} item={item} />)
                : <Typography color="text.secondary">{t('cohort.noCommittedCases')}</Typography>}
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

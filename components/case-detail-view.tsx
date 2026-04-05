'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Button, Chip, Stack, Typography } from '@mui/material';
import { ApiError, buildApiUrl, getCaseDetail } from '@/src/lib/api';
import { formatPriority, formatTaskType } from '@/src/lib/i18n';
import { formatFieldValue, getPackFieldLabel, getPackUi } from '@/src/lib/packs';
import type { CaseDetail } from '@/src/lib/types';
import { useI18n } from '@/src/lib/use-i18n';
import { useAuthGuard } from '@/src/lib/use-auth';
import { LoadingState } from './loading-state';
import { SectionCard } from './section-card';
import { WorkspaceShell } from './workspace-shell';

export function CaseDetailView({ caseId }: { caseId: number }) {
  const { physician, loading } = useAuthGuard();
  const { locale, t } = useI18n();
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pack = useMemo(() => (detail ? getPackUi(detail.case.conditionKey, locale) : null), [detail, locale]);

  useEffect(() => {
    if (!physician) return;
    let active = true;
    setError(null);
    getCaseDetail(caseId)
      .then((result) => {
        if (active) setDetail(result);
      })
      .catch((fetchError) => {
        if (!active) return;
        setError(fetchError instanceof ApiError ? fetchError.message : t('case.loadError'));
      });
    return () => {
      active = false;
    };
  }, [physician, caseId, t]);

  if (loading || !physician) return <LoadingState label={t('case.loading')} />;

  return (
    <WorkspaceShell title={detail?.case.caseToken || t('case.titleFallback')} subtitle={t('case.subtitle')}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {!detail ? (
        <LoadingState label={t('case.preparing')} />
      ) : (
        <>
          <SectionCard title={detail.case.summary} eyebrow={pack?.label || detail.case.conditionKey}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {detail.case.sex ? <Chip label={detail.case.sex} size="small" /> : null}
              {detail.case.ageBand ? <Chip label={detail.case.ageBand} size="small" /> : null}
              {detail.case.nextFollowupDueAt ? <Chip label={t('common.due', { date: detail.case.nextFollowupDueAt })} size="small" color="primary" /> : null}
            </Stack>
            {Object.entries(detail.case.conditionPayload).map(([key, value]) =>
              value ? (
                <Typography key={key} color="text.secondary">
                  {getPackFieldLabel(detail.case.conditionKey, key, locale)}: {formatFieldValue(value, locale, detail.case.conditionKey)}
                </Typography>
              ) : null
            )}
          </SectionCard>

          <SectionCard title={t('case.openTasks')} eyebrow={t('case.followUp')}>
            <Stack spacing={1}>
              {detail.tasks.length ? (
                detail.tasks.map((task) => (
                  <Typography key={task.id} color="text.secondary">
                    {t('case.taskLine', {
                      taskType: formatTaskType(locale, task.taskType),
                      dueAt: task.dueAt,
                      priority: formatPriority(locale, task.priority)
                    })}
                  </Typography>
                ))
              ) : (
                <Typography color="text.secondary">{t('case.noOpenTasks')}</Typography>
              )}
            </Stack>
          </SectionCard>

          <SectionCard title={t('case.updates')} eyebrow={t('case.evidenceTrail')}>
            <Stack spacing={1.25}>
              {detail.updates.map((update) => (
                <Accordion key={update.id} disableGutters elevation={0} sx={{ border: '1px solid rgba(22,32,36,0.08)', borderRadius: '16px !important' }}>
                  <AccordionSummary>
                    <Stack spacing={0.5}>
                      <Typography sx={{ fontWeight: 700 }}>{update.authoredSummary}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {update.createdAt}
                      </Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={1.25}>
                      <Typography color="text.secondary">{update.transcript || t('case.transcriptUnavailable')}</Typography>
                      {update.audioUrl ? <audio controls preload="none" src={buildApiUrl(update.audioUrl)} /> : null}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </SectionCard>

          <Button component={Link} href="/capture" variant="contained">
            {t('case.addAnotherUpdate')}
          </Button>
        </>
      )}
    </WorkspaceShell>
  );
}

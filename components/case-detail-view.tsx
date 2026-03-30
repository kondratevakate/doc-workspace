'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Button, Chip, Stack, Typography } from '@mui/material';
import { ApiError, buildApiUrl, getCaseDetail } from '@/src/lib/api';
import { getPackUi } from '@/src/lib/packs';
import type { CaseDetail } from '@/src/lib/types';
import { useAuthGuard } from '@/src/lib/use-auth';
import { LoadingState } from './loading-state';
import { SectionCard } from './section-card';
import { WorkspaceShell } from './workspace-shell';

export function CaseDetailView({ caseId }: { caseId: number }) {
  const { physician, loading } = useAuthGuard();
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        setError(fetchError instanceof ApiError ? fetchError.message : 'Could not load case detail.');
      });
    return () => {
      active = false;
    };
  }, [physician, caseId]);

  if (loading || !physician) return <LoadingState label="Loading case..." />;

  return (
    <WorkspaceShell title={detail?.case.caseToken || 'Case'} subtitle="Canonical case card with updates and task evidence.">
      {error ? <Alert severity="error">{error}</Alert> : null}
      {!detail ? (
        <LoadingState label="Preparing case detail..." />
      ) : (
        <>
          <SectionCard title={detail.case.summary} eyebrow={getPackUi(detail.case.conditionKey).label}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {detail.case.sex ? <Chip label={detail.case.sex} size="small" /> : null}
              {detail.case.ageBand ? <Chip label={detail.case.ageBand} size="small" /> : null}
              {detail.case.nextFollowupDueAt ? <Chip label={`Due ${detail.case.nextFollowupDueAt}`} size="small" color="primary" /> : null}
            </Stack>
            {Object.entries(detail.case.conditionPayload).map(([key, value]) =>
              value ? (
                <Typography key={key} color="text.secondary">
                  {key}: {String(value).replaceAll('_', ' ')}
                </Typography>
              ) : null
            )}
          </SectionCard>

          <SectionCard title="Open tasks" eyebrow="Follow-up">
            <Stack spacing={1}>
              {detail.tasks.length ? (
                detail.tasks.map((task) => (
                  <Typography key={task.id} color="text.secondary">
                    {task.taskType} - due {task.dueAt} - {task.priority}
                  </Typography>
                ))
              ) : (
                <Typography color="text.secondary">No open tasks.</Typography>
              )}
            </Stack>
          </SectionCard>

          <SectionCard title="Case updates" eyebrow="Evidence trail">
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
                      <Typography color="text.secondary">{update.transcript || 'Transcript unavailable.'}</Typography>
                      {update.audioUrl ? (
                        <audio controls preload="none" src={buildApiUrl(update.audioUrl)} />
                      ) : null}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </SectionCard>

          <Button component={Link} href="/capture" variant="contained">
            Add another update
          </Button>
        </>
      )}
    </WorkspaceShell>
  );
}

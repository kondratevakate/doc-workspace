'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Paper, Stack, Typography } from '@mui/material';
import { ApiError, listVoiceDrafts } from '@/src/lib/api';
import { formatReviewState } from '@/src/lib/i18n';
import type { VoiceDraft } from '@/src/lib/types';
import { useI18n } from '@/src/lib/use-i18n';
import { useAuthGuard } from '@/src/lib/use-auth';
import { useAppStore } from '@/src/store/app-store';
import { LoadingState } from './loading-state';
import { SectionCard } from './section-card';
import { WorkspaceShell } from './workspace-shell';

export function DraftsView() {
  const { physician, loading } = useAuthGuard();
  const { locale, t } = useI18n();
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
        setError(fetchError instanceof ApiError ? fetchError.message : t('drafts.loadError'));
      });
    return () => {
      active = false;
    };
  }, [physician, activeConditionKey, t]);

  if (loading || !physician) return <LoadingState label={t('drafts.loading')} />;

  return (
    <WorkspaceShell title={t('drafts.title')} subtitle={t('drafts.subtitle')}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <SectionCard title={t('drafts.unresolved')} eyebrow={t('today.reviewQueue')}>
        <Stack spacing={1.25}>
          {drafts.length ? (
            drafts.map((draft) => (
              <Paper key={draft.id} component={Link} href={`/capture?draft=${draft.id}`} elevation={0} sx={{ p: 2, border: '1px solid rgba(22,32,36,0.08)' }}>
                <Stack spacing={1}>
                  <Typography sx={{ fontWeight: 700 }}>{t('common.draftNumber', { id: draft.id })}</Typography>
                  <Typography color="text.secondary">{draft.summary || draft.transcript || t('today.transcriptPending')}</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="text">{t('drafts.openDraft')}</Button>
                    <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                      {formatReviewState(locale, draft.reviewState)}
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            ))
          ) : (
            <Typography color="text.secondary">{t('drafts.noUnresolved')}</Typography>
          )}
        </Stack>
      </SectionCard>
    </WorkspaceShell>
  );
}

'use client';

import Link from 'next/link';
import { Chip, Paper, Stack, Typography } from '@mui/material';
import { formatPriority, t } from '@/src/lib/i18n';
import { formatFieldValue } from '@/src/lib/packs';
import { useI18n } from '@/src/lib/use-i18n';
import type { CaseCard as CaseCardModel } from '@/src/lib/types';
import { PatientAvatar } from './patient-avatar';

export function CaseCard({ item }: { item: CaseCardModel }) {
  const { locale } = useI18n();

  return (
    <Paper
      component={Link}
      href={`/cases/${item.id}`}
      elevation={0}
      sx={{
        p: 2,
        border: '1px solid rgba(22,32,36,0.08)',
        display: 'block',
        transition: 'box-shadow 0.15s, background-color 0.15s',
        '&:hover': {
          backgroundColor: 'rgba(255,255,255,0.95)',
          boxShadow: '0 4px 16px rgba(22,32,36,0.1)',
        },
      }}
    >
      <Stack spacing={1.25}>
        <Stack direction="row" alignItems="flex-start" spacing={1.25}>
          {/* Patient visual identity avatar */}
          <PatientAvatar case={item} locale={locale} size={40} />

          <Stack spacing={0.25} flex={1} minWidth={0}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {item.caseToken}
              </Typography>
              {item.openTask ? (
                <Chip
                  label={t(locale, 'common.priorityBadge', { priority: formatPriority(locale, item.openTask.priority) })}
                  size="small"
                  color={item.openTask.priority === 'high' ? 'secondary' : 'default'}
                />
              ) : null}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
              {item.summary}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {item.sex ? <Chip label={item.sex} size="small" /> : null}
          {item.ageBand ? <Chip label={item.ageBand} size="small" /> : null}
          {item.openTask?.dueAt ? (
            <Chip
              label={t(locale, 'common.due', { date: item.openTask.dueAt })}
              size="small"
              color="primary"
              variant="outlined"
            />
          ) : null}
          {item.conditionPayload.responseStatus ? (
            <Chip
              label={formatFieldValue(item.conditionPayload.responseStatus, locale, item.conditionKey)}
              size="small"
            />
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
}

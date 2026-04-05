'use client';

import Link from 'next/link';
import { Chip, Paper, Stack, Typography } from '@mui/material';
import { formatPriority, t } from '@/src/lib/i18n';
import { formatFieldValue } from '@/src/lib/packs';
import { useI18n } from '@/src/lib/use-i18n';
import type { CaseCard as CaseCardModel } from '@/src/lib/types';

export function CaseCard({ item }: { item: CaseCardModel }) {
  const { locale } = useI18n();

  return (
    <Paper component={Link} href={`/cases/${item.id}`} elevation={0} sx={{ p: 2, border: '1px solid rgba(22,32,36,0.08)', display: 'block' }}>
      <Stack spacing={1.25}>
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
        <Typography variant="body1">{item.summary}</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {item.sex ? <Chip label={item.sex} size="small" /> : null}
          {item.ageBand ? <Chip label={item.ageBand} size="small" /> : null}
          {item.openTask?.dueAt ? <Chip label={t(locale, 'common.due', { date: item.openTask.dueAt })} size="small" color="primary" variant="outlined" /> : null}
          {item.conditionPayload.responseStatus ? <Chip label={formatFieldValue(item.conditionPayload.responseStatus, locale, item.conditionKey)} size="small" /> : null}
        </Stack>
      </Stack>
    </Paper>
  );
}

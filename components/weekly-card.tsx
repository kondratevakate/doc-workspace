'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { getWeeklySummary, type WeeklySummary } from '@/src/lib/api';
import { useI18n } from '@/src/lib/use-i18n';
import { narrativeLine } from '@/src/lib/weekly-narrative';

export function WeeklyCard() {
  const { t } = useI18n();
  const [summary, setSummary] = useState<WeeklySummary | null>(null);

  useEffect(() => {
    getWeeklySummary().then(setSummary).catch(() => { /* telemetry — fail silently */ });
  }, []);

  if (!summary) {
    return (
      <Paper elevation={0} sx={{ p: 2, border: '1px solid rgba(22,32,36,0.08)' }}>
        <Skeleton width="60%" height={20} />
        <Skeleton width="80%" height={16} sx={{ mt: 0.5 }} />
        <Skeleton width="70%" height={16} sx={{ mt: 0.5 }} />
      </Paper>
    );
  }

  // Warm tint only when all pings done — never red for incomplete
  const allPingsDone = summary.pingsViewed > 0 && summary.pingsCalled >= summary.pingsViewed;
  const bg = allPingsDone ? 'rgba(14,158,138,0.07)' : 'rgba(255,255,255,0.6)';

  return (
    <Paper elevation={0} sx={{ p: 2, border: '1px solid rgba(22,32,36,0.08)', background: bg }}>
      <Stack spacing={0.75}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '0.65rem' }}>
          {t('weekly.thisWeek')}
        </Typography>

        <Row value={summary.visitsRecorded} label={t('weekly.visitsRecorded')} />
        <Row
          value={`${summary.pingsCalled} / ${summary.pingsViewed}`}
          label={t('weekly.followUpsDone')}
        />

        {summary.openDrafts > 0 && (
          <Box
            component={Link}
            href="/drafts"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, textDecoration: 'none', mt: 0.25 }}
          >
            <Typography variant="body2" color="text.secondary">
              {t('weekly.draftsOpen', { n: summary.openDrafts })}
            </Typography>
            <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
              →
            </Typography>
          </Box>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic' }}>
          {narrativeLine(summary, t)}
        </Typography>
      </Stack>
    </Paper>
  );
}

function Row({ value, label }: { value: string | number; label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
      <Typography variant="h6" className="serif-display" sx={{ fontWeight: 500, lineHeight: 1, minWidth: 32 }}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

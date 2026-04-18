import type { WeeklySummary } from '@/src/lib/api';
import type { useI18n } from '@/src/lib/use-i18n';

type TFn = ReturnType<typeof useI18n>['t'];

// Positive/neutral only — no deficit language, no comparisons (habit design principle)
export function narrativeLine(s: WeeklySummary, t: TFn): string {
  if (s.pingsCalled > 0 && s.pingsCalled >= s.pingsViewed) return t('weekly.narrativeAllPings');
  if (s.visitsRecorded >= 10) return t('weekly.narrativeActiveWeek');
  if (s.visitsRecorded > 0) return t('weekly.narrativeGoodStart');
  return t('weekly.narrativeReady');
}

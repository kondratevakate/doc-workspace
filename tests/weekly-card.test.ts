import { describe, it, expect } from 'vitest';
import { narrativeLine } from '@/src/lib/weekly-narrative';
import { t } from '@/src/lib/i18n';
import type { WeeklySummary } from '@/src/lib/api';

// Bind t to 'en' locale, matching the TFn signature expected by narrativeLine
const tEn = (key: Parameters<typeof t>[1], vars?: Record<string, string | number>) =>
  t('en', key, vars);

function summary(overrides: Partial<WeeklySummary>): WeeklySummary {
  return { visitsRecorded: 0, pingsCalled: 0, pingsViewed: 0, openDrafts: 0, weekStart: '', ...overrides };
}

describe('narrativeLine()', () => {
  it('returns narrativeAllPings when all pings are done', () => {
    const result = narrativeLine(summary({ pingsCalled: 4, pingsViewed: 4 }), tEn);
    expect(result).toBe('All follow-ups done — great week.');
  });

  it('returns narrativeActiveWeek when 10+ visits and no pings', () => {
    const result = narrativeLine(summary({ visitsRecorded: 12 }), tEn);
    expect(result).toBe('Active week — patients are covered.');
  });

  it('returns narrativeGoodStart when a few visits, no pings done', () => {
    const result = narrativeLine(summary({ visitsRecorded: 3 }), tEn);
    expect(result).toBe('Good start. More visits ahead.');
  });

  it('returns narrativeReady when all counters are zero', () => {
    const result = narrativeLine(summary({}), tEn);
    expect(result).toBe('Ready to record your first visit.');
  });
});

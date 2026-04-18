import { describe, it, expect } from 'vitest';
import { t, getModeLabel } from '@/src/lib/i18n';

// All TranslationKeys — must stay in sync with the type union in i18n.ts
// This list is the regression guard: if a key is added to the type but not to messages, this test catches it.
const ALL_KEYS = [
  'common.language', 'common.mode', 'common.english', 'common.russian', 'common.notSet',
  'common.due', 'common.priorityBadge', 'common.open', 'common.demo', 'common.main',
  'common.physician', 'common.draftNumber',
  'auth.eyebrow', 'auth.title', 'auth.description', 'auth.demoEyebrow', 'auth.demoTitle',
  'auth.demoDescription', 'auth.demoNotice', 'auth.physicianEmail', 'auth.preparingLink',
  'auth.requestMagicLink', 'auth.enterDemo', 'auth.resetDemoData', 'auth.magicLinkGenerated',
  'auth.magicLinkRequested', 'auth.requestMagicLinkError', 'auth.developmentLinkNotice', 'auth.open',
  'nav.today', 'nav.capture', 'nav.drafts', 'nav.cohort',
  'shell.logOut', 'shell.resetDemo', 'shell.demoActive',
  'today.title', 'today.dailyPosture', 'today.launchPack', 'today.dueToday', 'today.overdue',
  'today.nonResponder', 'today.drafts', 'today.noNextStep', 'today.loadingWorkspace',
  'today.loadingQueues', 'today.noCasesDueToday', 'today.noOverdueCases',
  'today.noNonResponderCases', 'today.everyCaseHasNextStep', 'today.draftsUnresolved',
  'today.reviewQueue', 'today.transcriptPending', 'today.noUnresolvedDrafts',
  'today.refreshQueues', 'today.loadQueuesError',
  'weekly.thisWeek', 'weekly.visitsRecorded', 'weekly.followUpsDone', 'weekly.draftsOpen',
  'weekly.narrativeAllPings', 'weekly.narrativeActiveWeek', 'weekly.narrativeGoodStart',
  'weekly.narrativeReady',
  'drafts.title', 'drafts.subtitle', 'drafts.loading', 'drafts.unresolved', 'drafts.openDraft',
  'drafts.noUnresolved', 'drafts.loadError',
  'cohort.title', 'cohort.subtitle', 'cohort.loading', 'cohort.preparing',
  'cohort.responseDistribution', 'cohort.clinicalPosture', 'cohort.migraineBuckets',
  'cohort.diseaseSlices', 'cohort.recentCases', 'cohort.latestActivity',
  'cohort.noCommittedCases', 'cohort.loadError',
  'capture.title', 'capture.subtitle', 'capture.loading', 'capture.newNote',
  'capture.voiceCapture', 'capture.description', 'capture.startRecording', 'capture.stopRecording',
  'capture.uploadAudio', 'capture.recordingInProgress', 'capture.browserRecordingUnavailable',
  'capture.uploadingVoice', 'capture.voiceReceived', 'capture.uploadVoiceError',
  'capture.loadDraftError', 'capture.refreshDraftError', 'capture.draftReady',
  'capture.draftNeedsReview', 'capture.transcriptProcessing', 'capture.summary',
  'capture.nextFollowupDue', 'capture.newCase', 'capture.existingCase', 'capture.attachToCase',
  'capture.commitDraft', 'capture.caseSaved', 'capture.commitDraftError', 'capture.tapToRecord',
  'capture.startCaptureHint', 'capture.tapToStop', 'capture.processingAudio', 'capture.recordAgain',
  'capture.reviewDraft', 'capture.quickInput', 'capture.backToVoice', 'capture.visitType',
  'capture.visitPrimary', 'capture.visitFollowup', 'capture.patientInitial', 'capture.discussed',
  'capture.nextVisit', 'capture.in1Week', 'capture.in2Weeks', 'capture.in1Month', 'capture.in3Months',
  'case.titleFallback', 'case.subtitle', 'case.loading', 'case.preparing', 'case.loadError',
  'case.openTasks', 'case.followUp', 'case.noOpenTasks', 'case.taskLine', 'case.updates',
  'case.evidenceTrail', 'case.transcriptUnavailable', 'case.addAnotherUpdate',
  'reviewState.ready', 'reviewState.needs_review', 'reviewState.committed',
  'priority.high', 'priority.medium', 'priority.low',
  'task.follow_up',
] as const;

describe('i18n', () => {
  it('every key resolves to a non-empty string in en locale', () => {
    for (const key of ALL_KEYS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = t('en', key as any);
      expect(result, `key "${key}" missing in en`).not.toBe(key);
      expect(result.length, `key "${key}" is empty in en`).toBeGreaterThan(0);
    }
  });

  it('every key resolves to a non-empty string in ru locale', () => {
    for (const key of ALL_KEYS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = t('ru', key as any);
      expect(result, `key "${key}" missing in ru`).not.toBe(key);
      expect(result.length, `key "${key}" is empty in ru`).toBeGreaterThan(0);
    }
  });

  it('interpolates a single variable', () => {
    expect(t('en', 'common.due', { date: '2026-05-01' })).toBe('Due 2026-05-01');
  });

  it('interpolates multiple variables', () => {
    expect(t('en', 'case.taskLine', { taskType: 'Follow-up', dueAt: '2026-05-01', priority: 'High' }))
      .toBe('Follow-up - due 2026-05-01 - High');
  });

  it('leaves unknown variable placeholder unexpanded', () => {
    const result = t('en', 'common.due', { notDate: 'x' } as Record<string, string>);
    expect(result).toContain('{date}');
  });

  it('interpolates Russian translation', () => {
    expect(t('ru', 'capture.caseSaved', { caseToken: 'O-007' })).toBe('Кейс O-007 сохранён.');
  });

  it('getModeLabel returns correct label per locale', () => {
    expect(getModeLabel('en', 'demo')).toBe('Demo');
    expect(getModeLabel('en', 'main')).toBe('Live');
    expect(getModeLabel('ru', 'demo')).toBe('Демо');
    expect(getModeLabel('ru', 'main')).toBe('Основной');
  });
});

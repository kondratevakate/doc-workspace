import type { CaseCard, CaseDetail, CohortSummary, ConditionKey, Physician, PhysicianSession, Task, TodayQueues, VoiceDraft } from '@/src/lib/types';

const STORAGE_KEY = 'physician-workspace-web.demo-state.v1';
const STATE_VERSION = 1;
const DEFAULT_CONDITION_KEY = 'migraine';

interface DemoState {
  version: number;
  physician: Physician;
  expiresAt: string;
  enabledConditions: ConditionKey[];
  nextCaseId: number;
  nextDraftId: number;
  nextTaskId: number;
  nextUpdateId: number;
  cases: CaseDetail[];
  drafts: VoiceDraft[];
}

const DEMO_PHYSICIAN: Physician = {
  id: 1,
  email: 'demo.physician@local.test',
  displayName: 'Demo Physician',
  role: 'physician',
  createdAt: '2026-01-01T09:00:00.000Z',
  updatedAt: '2026-01-01T09:00:00.000Z'
};

const DEMO_DRAFT_TEMPLATES = [
  {
    transcript:
      'Patient reports headache frequency down to four days this month after the preventive dose increase, with mild evening nausea and no new red flags.',
    summary: 'Improving migraine frequency after preventive adjustment; monitor mild nausea.',
    conditionPayload: {
      migraineBucket: 'episodic_migraine',
      attackFrequencyBand: '4-7_per_month',
      currentPreventive: 'Topiramate 25 mg nightly',
      responseStatus: 'partial_responder',
      nextStep: 'Review tolerability after the next dose adjustment'
    }
  },
  {
    transcript:
      'Headache burden remains high with two missed workdays this week, poor rescue response, and concern that the current preventive plan is not enough.',
    summary: 'Persistent migraine burden despite current plan; reassess preventive strategy.',
    conditionPayload: {
      migraineBucket: 'chronic_migraine',
      attackFrequencyBand: '15+_per_month',
      currentPreventive: 'Propranolol 40 mg twice daily',
      responseStatus: 'non_responder',
      nextStep: 'Escalate treatment discussion and adherence review'
    }
  }
] as const;

export function getDemoSession(): PhysicianSession {
  const state = readDemoState();
  return clone({
    physician: state.physician,
    expiresAt: state.expiresAt,
    enabledConditions: state.enabledConditions
  });
}

export function resetDemoState(): void {
  writeDemoState(createInitialDemoState());
}

export function listDemoCases(conditionKey: string, limit = 30): CaseCard[] {
  const state = readDemoState();
  return clone(getSortedCaseCards(state, conditionKey).slice(0, limit));
}

export function getDemoCaseDetail(caseId: number): CaseDetail {
  const state = readDemoState();
  const detail = state.cases.find((item) => item.case.id === caseId);
  if (!detail) throw new Error('Case not found in demo data.');
  return clone(detail);
}

export function listDemoVoiceDrafts(conditionKey: string): VoiceDraft[] {
  const state = readDemoState();
  const drafts = state.drafts
    .filter((draft) => draft.conditionKey === conditionKey && draft.committedCaseId === null)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  return clone(drafts);
}

export function getDemoVoiceDraft(draftId: number): VoiceDraft {
  const state = readDemoState();
  const draft = state.drafts.find((item) => item.id === draftId);
  if (!draft) throw new Error('Draft not found in demo data.');
  return clone(draft);
}

export function createDemoVoiceDraft(input: {
  conditionKey: string;
  audioBase64: string;
  contentType: string;
  languageCode?: string;
}): VoiceDraft {
  return mutateDemoState((state) => {
    const now = new Date();
    const draftId = state.nextDraftId++;
    const template = DEMO_DRAFT_TEMPLATES[draftId % DEMO_DRAFT_TEMPLATES.length];
    const draft: VoiceDraft = {
      id: draftId,
      conditionKey: input.conditionKey,
      status: 'done',
      provider: 'demo-local',
      channel: 'web',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      error: null,
      transcript: template.transcript,
      audioUrl: input.audioBase64 ? `data:${input.contentType || 'audio/webm'};base64,${input.audioBase64}` : '',
      summary: template.summary,
      dueAt: formatLocalDate(addDays(startOfToday(now), 10)),
      conditionPayload: normalizeConditionPayload(template.conditionPayload),
      confidence: {
        transcript: 0.96,
        summary: 0.92
      },
      reviewState: 'ready',
      committedCaseId: null
    };

    state.drafts.unshift(draft);
    return draft;
  });
}

export function commitDemoVoiceDraft(
  draftId: number,
  input: {
    conditionKey: string;
    caseId?: number;
    createNewCase?: boolean;
    summary: string;
    dueAt: string;
    conditionPayload: Record<string, string | null>;
  }
): { case: CaseDetail; draft: VoiceDraft } {
  return mutateDemoState((state) => {
    const draftIndex = state.drafts.findIndex((item) => item.id === draftId);
    if (draftIndex === -1) throw new Error('Draft not found in demo data.');

    const draft = state.drafts[draftIndex];
    const now = new Date();
    const nowIso = now.toISOString();
    const dueAt = input.dueAt || formatLocalDate(addDays(startOfToday(now), 10));
    const summary = input.summary.trim() || draft.summary || 'Demo follow-up update';
    const conditionPayload = normalizeConditionPayload({
      ...draft.conditionPayload,
      ...input.conditionPayload,
      nextStep: input.conditionPayload.nextStep ?? draft.conditionPayload.nextStep ?? 'Schedule follow-up review'
    });
    const update = {
      id: state.nextUpdateId++,
      authoredSummary: summary,
      transcript: draft.transcript || null,
      audioUrl: draft.audioUrl || null,
      extract: {
        source: 'demo'
      },
      confidence: draft.confidence,
      createdAt: nowIso
    };

    const createNewCase = input.createNewCase || !input.caseId;
    const detail = createNewCase
      ? createCaseFromDraft(state, {
          now,
          summary,
          dueAt,
          conditionKey: input.conditionKey,
          conditionPayload,
          update
        })
      : updateExistingCase(state, input.caseId, {
          nowIso,
          summary,
          dueAt,
          conditionPayload,
          update
        });

    const committedDraft: VoiceDraft = {
      ...draft,
      summary,
      dueAt,
      conditionPayload,
      reviewState: 'committed',
      committedCaseId: detail.case.id,
      updatedAt: nowIso
    };

    state.drafts[draftIndex] = committedDraft;

    return {
      case: detail,
      draft: committedDraft
    };
  });
}

export function getDemoTodayQueues(conditionKey: string): TodayQueues {
  const state = readDemoState();
  const caseCards = getSortedCaseCards(state, conditionKey);
  const today = formatLocalDate(startOfToday(new Date()));
  const unresolvedDrafts = listDemoVoiceDrafts(conditionKey);
  const dueToday = caseCards.filter((item) => item.openTask?.dueAt === today);
  const overdue = caseCards.filter((item) => Boolean(item.openTask?.dueAt && item.openTask.dueAt < today));
  const nonResponder = caseCards.filter((item) => item.conditionPayload.responseStatus === 'non_responder');
  const noNextStep = caseCards.filter((item) => !item.openTask || !item.conditionPayload.nextStep);

  return clone({
    conditionKey,
    stats: {
      totalCases: caseCards.length,
      dueToday: dueToday.length,
      overdue: overdue.length,
      nonResponder: nonResponder.length,
      noNextStep: noNextStep.length,
      unresolvedDrafts: unresolvedDrafts.length
    },
    dueToday,
    overdue,
    nonResponder,
    noNextStep,
    unresolvedDrafts
  });
}

export function getDemoCohortSummary(conditionKey: string): CohortSummary {
  const state = readDemoState();
  const caseCards = getSortedCaseCards(state, conditionKey);
  const queues = getDemoTodayQueues(conditionKey);
  const responseBuckets: Record<string, number> = {
    naive: 0,
    stable: 0,
    partial_responder: 0,
    non_responder: 0,
    not_set: 0
  };
  const migraineBuckets: Record<string, number> = {
    episodic_migraine: 0,
    chronic_migraine: 0,
    unclear_headache: 0,
    not_set: 0
  };

  for (const item of caseCards) {
    const responseKey = item.conditionPayload.responseStatus || 'not_set';
    const migraineKey = item.conditionPayload.migraineBucket || 'not_set';
    responseBuckets[responseKey] = (responseBuckets[responseKey] || 0) + 1;
    migraineBuckets[migraineKey] = (migraineBuckets[migraineKey] || 0) + 1;
  }

  return clone({
    conditionKey,
    stats: queues.stats,
    responseBuckets,
    migraineBuckets,
    queueCounts: {
      dueToday: queues.dueToday.length,
      overdue: queues.overdue.length,
      nonResponder: queues.nonResponder.length,
      noNextStep: queues.noNextStep.length,
      unresolvedDrafts: queues.unresolvedDrafts.length
    },
    recentCases: caseCards.slice(0, 5),
    unresolvedDrafts: queues.unresolvedDrafts.length
  });
}

function createCaseFromDraft(
  state: DemoState,
  input: {
    now: Date;
    summary: string;
    dueAt: string;
    conditionKey: string;
    conditionPayload: Record<string, string | null>;
    update: CaseDetail['updates'][number];
  }
): CaseDetail {
  const caseId = state.nextCaseId++;
  const nowIso = input.now.toISOString();
  const detail: CaseDetail = {
    case: {
      id: caseId,
      caseToken: `MIG-${caseId}`,
      conditionKey: input.conditionKey,
      sex: null,
      age: null,
      ageBand: null,
      summary: input.summary,
      nextFollowupDueAt: input.dueAt,
      status: 'active',
      updatedAt: nowIso,
      hasMisRef: false,
      conditionPayload: input.conditionPayload,
      createdAt: nowIso
    },
    tasks: [createOpenTask(state, input.dueAt, input.now)],
    updates: [input.update]
  };

  state.cases.unshift(detail);
  return detail;
}

function updateExistingCase(
  state: DemoState,
  caseId: number | undefined,
  input: {
    nowIso: string;
    summary: string;
    dueAt: string;
    conditionPayload: Record<string, string | null>;
    update: CaseDetail['updates'][number];
  }
): CaseDetail {
  const caseIndex = state.cases.findIndex((item) => item.case.id === caseId);
  if (caseIndex === -1) throw new Error('Case not found in demo data.');

  const existing = state.cases[caseIndex];
  const refreshed: CaseDetail = {
    case: {
      ...existing.case,
      summary: input.summary,
      nextFollowupDueAt: input.dueAt,
      updatedAt: input.nowIso,
      conditionPayload: input.conditionPayload
    },
    tasks: [
      createOpenTask(state, input.dueAt, new Date(input.nowIso)),
      ...existing.tasks.map((task) =>
        task.status === 'open'
          ? {
              ...task,
              status: 'completed',
              updatedAt: input.nowIso
            }
          : task
      )
    ],
    updates: [input.update, ...existing.updates]
  };

  state.cases[caseIndex] = refreshed;
  return refreshed;
}

function createOpenTask(state: DemoState, dueAt: string, now: Date): Task {
  const nowIso = now.toISOString();
  return {
    id: state.nextTaskId++,
    taskType: 'follow_up',
    dueAt,
    status: 'open',
    priority: getPriorityForDueAt(dueAt),
    createdAt: nowIso,
    updatedAt: nowIso
  };
}

function getSortedCaseCards(state: DemoState, conditionKey: string): CaseCard[] {
  return state.cases
    .filter((item) => item.case.conditionKey === conditionKey)
    .map(toCaseCard)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function toCaseCard(detail: CaseDetail): CaseCard {
  const openTask = detail.tasks.find((task) => task.status === 'open') || null;
  return {
    id: detail.case.id,
    caseToken: detail.case.caseToken,
    conditionKey: detail.case.conditionKey,
    sex: detail.case.sex,
    age: detail.case.age,
    ageBand: detail.case.ageBand,
    summary: detail.case.summary,
    nextFollowupDueAt: detail.case.nextFollowupDueAt,
    status: detail.case.status,
    updatedAt: detail.case.updatedAt,
    hasMisRef: detail.case.hasMisRef,
    conditionPayload: detail.case.conditionPayload,
    openTask: openTask
      ? {
          id: openTask.id,
          taskType: openTask.taskType,
          dueAt: openTask.dueAt,
          status: openTask.status,
          priority: openTask.priority
        }
      : null
  };
}

function getPriorityForDueAt(dueAt: string): string {
  const today = formatLocalDate(startOfToday(new Date()));
  if (dueAt < today) return 'high';
  if (dueAt === today) return 'medium';
  return 'low';
}

function readDemoState(): DemoState {
  if (typeof window === 'undefined') return createInitialDemoState();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initialState = createInitialDemoState();
      writeDemoState(initialState);
      return initialState;
    }

    const parsed = JSON.parse(raw) as DemoState;
    if (!isValidDemoState(parsed)) {
      const initialState = createInitialDemoState();
      writeDemoState(initialState);
      return initialState;
    }

    return parsed;
  } catch {
    const initialState = createInitialDemoState();
    writeDemoState(initialState);
    return initialState;
  }
}

function writeDemoState(state: DemoState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function mutateDemoState<T>(mutator: (state: DemoState) => T): T {
  const state = readDemoState();
  const result = mutator(state);
  writeDemoState(state);
  return clone(result);
}

function isValidDemoState(value: DemoState | null | undefined): value is DemoState {
  return Boolean(value && value.version === STATE_VERSION && Array.isArray(value.cases) && Array.isArray(value.drafts));
}

function createInitialDemoState(): DemoState {
  const today = startOfToday(new Date());
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 7);
  const now = new Date();

  const firstCaseCreated = setTime(addDays(today, -28), 9, 15);
  const secondCaseCreated = setTime(addDays(today, -21), 10, 30);
  const thirdCaseCreated = setTime(addDays(today, -14), 11, 0);
  const fourthCaseCreated = setTime(addDays(today, -10), 8, 45);

  return {
    version: STATE_VERSION,
    physician: DEMO_PHYSICIAN,
    expiresAt: addDays(now, 30).toISOString(),
    enabledConditions: [DEFAULT_CONDITION_KEY],
    nextCaseId: 105,
    nextDraftId: 203,
    nextTaskId: 305,
    nextUpdateId: 407,
    cases: [
      {
        case: {
          id: 101,
          caseToken: 'MIG-101',
          conditionKey: DEFAULT_CONDITION_KEY,
          sex: 'F',
          age: 34,
          ageBand: '30-39',
          summary: 'Improving after CGRP start; review nausea and sleep quality.',
          nextFollowupDueAt: formatLocalDate(today),
          status: 'active',
          updatedAt: setTime(today, 8, 30).toISOString(),
          hasMisRef: false,
          conditionPayload: {
            migraineBucket: 'chronic_migraine',
            attackFrequencyBand: '4-7_per_month',
            currentPreventive: 'Fremanezumab monthly',
            responseStatus: 'partial_responder',
            nextStep: 'Review tolerability after the second injection'
          },
          createdAt: firstCaseCreated.toISOString()
        },
        tasks: [
          {
            id: 301,
            taskType: 'follow_up',
            dueAt: formatLocalDate(today),
            status: 'open',
            priority: 'medium',
            createdAt: addDays(firstCaseCreated, 20).toISOString(),
            updatedAt: setTime(today, 8, 30).toISOString()
          }
        ],
        updates: [
          {
            id: 401,
            authoredSummary: 'Started CGRP preventive with early reduction in headache days.',
            transcript:
              'Patient says the first month on the injectable preventive reduced headache days from near-daily to about six days in total, with mild nausea in the evening.',
            audioUrl: null,
            extract: {
              source: 'demo'
            },
            confidence: {
              summary: 0.94
            },
            createdAt: addDays(firstCaseCreated, 20).toISOString()
          },
          {
            id: 402,
            authoredSummary: 'Initial migraine follow-up established in the workspace.',
            transcript: 'Baseline follow-up captured after preventive initiation.',
            audioUrl: null,
            extract: {
              source: 'demo'
            },
            confidence: {
              summary: 0.89
            },
            createdAt: firstCaseCreated.toISOString()
          }
        ]
      },
      {
        case: {
          id: 102,
          caseToken: 'MIG-102',
          conditionKey: DEFAULT_CONDITION_KEY,
          sex: 'M',
          age: 41,
          ageBand: '40-49',
          summary: 'Overdue follow-up for persistent migraine burden and missed work.',
          nextFollowupDueAt: formatLocalDate(yesterday),
          status: 'active',
          updatedAt: setTime(yesterday, 17, 10).toISOString(),
          hasMisRef: false,
          conditionPayload: {
            migraineBucket: 'chronic_migraine',
            attackFrequencyBand: '15+_per_month',
            currentPreventive: 'Propranolol 40 mg twice daily',
            responseStatus: 'non_responder',
            nextStep: 'Escalate preventive discussion and adherence review'
          },
          createdAt: secondCaseCreated.toISOString()
        },
        tasks: [
          {
            id: 302,
            taskType: 'follow_up',
            dueAt: formatLocalDate(yesterday),
            status: 'open',
            priority: 'high',
            createdAt: addDays(secondCaseCreated, 18).toISOString(),
            updatedAt: setTime(yesterday, 17, 10).toISOString()
          }
        ],
        updates: [
          {
            id: 403,
            authoredSummary: 'Migraine burden unchanged despite current preventive.',
            transcript:
              'Patient reports near-daily headache burden, poor response to rescue medication, and two missed workdays this week.',
            audioUrl: null,
            extract: {
              source: 'demo'
            },
            confidence: {
              summary: 0.93
            },
            createdAt: addDays(secondCaseCreated, 18).toISOString()
          }
        ]
      },
      {
        case: {
          id: 103,
          caseToken: 'MIG-103',
          conditionKey: DEFAULT_CONDITION_KEY,
          sex: 'F',
          age: 29,
          ageBand: '20-29',
          summary: 'Stable migraine control but no next step has been entered yet.',
          nextFollowupDueAt: null,
          status: 'active',
          updatedAt: setTime(tomorrow, 7, 50).toISOString(),
          hasMisRef: false,
          conditionPayload: {
            migraineBucket: 'episodic_migraine',
            attackFrequencyBand: '1-3_per_month',
            currentPreventive: 'Riboflavin and sleep hygiene',
            responseStatus: 'stable',
            nextStep: null
          },
          createdAt: thirdCaseCreated.toISOString()
        },
        tasks: [],
        updates: [
          {
            id: 404,
            authoredSummary: 'Symptoms stable after lifestyle-focused follow-up.',
            transcript: 'Patient reports stable control and no emergency visits since the last review.',
            audioUrl: null,
            extract: {
              source: 'demo'
            },
            confidence: {
              summary: 0.9
            },
            createdAt: addDays(thirdCaseCreated, 10).toISOString()
          }
        ]
      },
      {
        case: {
          id: 104,
          caseToken: 'MIG-104',
          conditionKey: DEFAULT_CONDITION_KEY,
          sex: 'M',
          age: 37,
          ageBand: '30-39',
          summary: 'Future follow-up scheduled after a positive early response.',
          nextFollowupDueAt: formatLocalDate(nextWeek),
          status: 'active',
          updatedAt: setTime(today, 14, 5).toISOString(),
          hasMisRef: false,
          conditionPayload: {
            migraineBucket: 'episodic_migraine',
            attackFrequencyBand: '4-7_per_month',
            currentPreventive: 'Amitriptyline 10 mg nightly',
            responseStatus: 'stable',
            nextStep: 'Continue current plan and reassess in one week'
          },
          createdAt: fourthCaseCreated.toISOString()
        },
        tasks: [
          {
            id: 303,
            taskType: 'follow_up',
            dueAt: formatLocalDate(nextWeek),
            status: 'open',
            priority: 'low',
            createdAt: addDays(fourthCaseCreated, 8).toISOString(),
            updatedAt: setTime(today, 14, 5).toISOString()
          }
        ],
        updates: [
          {
            id: 405,
            authoredSummary: 'Marked reduction in headache days after low-dose preventive start.',
            transcript: 'Patient describes a clear early response and improved sleep, with no new adverse events.',
            audioUrl: null,
            extract: {
              source: 'demo'
            },
            confidence: {
              summary: 0.95
            },
            createdAt: addDays(fourthCaseCreated, 8).toISOString()
          },
          {
            id: 406,
            authoredSummary: 'Initial plan documented for interval follow-up.',
            transcript: 'Follow-up interval agreed after starting amitriptyline.',
            audioUrl: null,
            extract: {
              source: 'demo'
            },
            confidence: {
              summary: 0.87
            },
            createdAt: fourthCaseCreated.toISOString()
          }
        ]
      }
    ],
    drafts: [
      {
        id: 201,
        conditionKey: DEFAULT_CONDITION_KEY,
        status: 'done',
        provider: 'demo-local',
        channel: 'web',
        createdAt: setTime(today, 9, 20).toISOString(),
        updatedAt: setTime(today, 9, 25).toISOString(),
        error: null,
        transcript:
          'Patient says migraine days are down to five this month but there is breakthrough nausea after night shifts and concern about hydration.',
        audioUrl: '',
        summary: 'Improving headache frequency with breakthrough nausea after night shifts.',
        dueAt: formatLocalDate(addDays(today, 5)),
        conditionPayload: {
          migraineBucket: 'episodic_migraine',
          attackFrequencyBand: '4-7_per_month',
          currentPreventive: 'Topiramate 25 mg nightly',
          responseStatus: 'partial_responder',
          nextStep: 'Review sleep pattern and hydration before next follow-up'
        },
        confidence: {
          transcript: 0.95,
          summary: 0.9
        },
        reviewState: 'ready',
        committedCaseId: null
      },
      {
        id: 202,
        conditionKey: DEFAULT_CONDITION_KEY,
        status: 'done',
        provider: 'demo-local',
        channel: 'web',
        createdAt: setTime(today, 11, 10).toISOString(),
        updatedAt: setTime(today, 11, 12).toISOString(),
        error: null,
        transcript:
          'Patient reports several disabling headaches this week, poor benefit from rescue medication, and wants to reconsider the current preventive strategy.',
        audioUrl: '',
        summary: '',
        dueAt: formatLocalDate(addDays(today, 3)),
        conditionPayload: {
          migraineBucket: 'chronic_migraine',
          attackFrequencyBand: '15+_per_month',
          currentPreventive: 'Propranolol 40 mg twice daily',
          responseStatus: 'non_responder',
          nextStep: 'Reassess treatment escalation options'
        },
        confidence: {
          transcript: 0.94,
          summary: 0.82
        },
        reviewState: 'needs_review',
        committedCaseId: null
      }
    ]
  };
}

function normalizeConditionPayload(input: Record<string, string | null | undefined>): Record<string, string | null> {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, typeof value === 'string' && value.trim() ? value.trim() : null])
  );
}

function startOfToday(date: Date): Date {
  return setTime(date, 0, 0);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function setTime(date: Date, hours: number, minutes: number): Date {
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function formatLocalDate(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

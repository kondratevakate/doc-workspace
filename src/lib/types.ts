export type ConditionKey = 'migraine' | string;

export interface Physician {
  id: number;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface PhysicianSession {
  physician: Physician;
  expiresAt: string;
  enabledConditions: ConditionKey[];
}

export interface VoiceDraft {
  id: number;
  conditionKey: ConditionKey;
  status: string;
  provider: string;
  channel: string;
  createdAt: string;
  updatedAt: string;
  error: string | null;
  transcript: string | null;
  audioUrl: string;
  summary: string;
  dueAt: string | null;
  conditionPayload: Record<string, string | null>;
  confidence: Record<string, number | null>;
  reviewState: string;
  committedCaseId: number | null;
}

export interface Task {
  id: number;
  taskType: string;
  dueAt: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseCard {
  id: number;
  caseToken: string;
  conditionKey: ConditionKey;
  sex: string | null;
  age: number | null;
  ageBand: string | null;
  summary: string;
  nextFollowupDueAt: string | null;
  status: string;
  updatedAt: string;
  hasMisRef: boolean;
  conditionPayload: Record<string, string | null>;
  openTask: {
    id: number;
    taskType: string;
    dueAt: string;
    status: string;
    priority: string;
  } | null;
}

export interface CaseUpdate {
  id: number;
  authoredSummary: string;
  transcript: string | null;
  audioUrl: string | null;
  extract: Record<string, unknown>;
  confidence: Record<string, unknown>;
  createdAt: string;
}

export interface CaseDetail {
  case: Omit<CaseCard, 'openTask'> & {
    createdAt: string;
  };
  tasks: Task[];
  updates: CaseUpdate[];
}

export interface TodayQueues {
  conditionKey: ConditionKey;
  stats: {
    totalCases: number;
    dueToday: number;
    overdue: number;
    nonResponder: number;
    noNextStep: number;
    unresolvedDrafts: number;
  };
  dueToday: CaseCard[];
  overdue: CaseCard[];
  nonResponder: CaseCard[];
  noNextStep: CaseCard[];
  unresolvedDrafts: VoiceDraft[];
}

export interface CohortSummary {
  conditionKey: ConditionKey;
  stats: TodayQueues['stats'];
  responseBuckets: Record<string, number>;
  migraineBuckets: Record<string, number>;
  queueCounts: Record<string, number>;
  recentCases: CaseCard[];
  unresolvedDrafts: number;
}

export interface MagicLinkResponse {
  ok: boolean;
  queued?: boolean;
  verifyUrl?: string | null;
  expiresAt?: string | null;
}

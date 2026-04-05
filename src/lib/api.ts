import { commitDemoVoiceDraft, createDemoVoiceDraft, getDemoCaseDetail, getDemoCohortSummary, getDemoSession, getDemoTodayQueues, getDemoVoiceDraft, listDemoCases, listDemoVoiceDrafts, resetDemoState } from '@/src/lib/demo-store';
import { isDemoModeEnabled } from '@/src/lib/preferences';
import type { CaseCard, CaseDetail, CohortSummary, MagicLinkResponse, PhysicianSession, TodayQueues, VoiceDraft } from '@/src/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

async function apiRequest<T>(pathname: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(buildApiUrl(pathname), {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {})
    },
    cache: 'no-store'
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'error' in payload ? String((payload as { error?: unknown }).error || 'request_failed') : 'request_failed';
    throw new ApiError(message, response.status, payload);
  }
  return payload as T;
}

export function buildApiUrl(pathname: string): string {
  if (pathname.startsWith('data:') || pathname.startsWith('blob:')) {
    return pathname;
  }
  if (pathname.startsWith('http://') || pathname.startsWith('https://')) {
    return pathname;
  }
  if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
    return new URL(pathname, API_BASE_URL).toString();
  }
  const base = API_BASE_URL.replace(/\/$/, '');
  return `${base}${pathname}`;
}

export async function requestMagicLink(email: string, redirectTo?: string): Promise<MagicLinkResponse> {
  if (isDemoModeEnabled()) {
    return {
      ok: true,
      queued: false,
      verifyUrl: null,
      expiresAt: getDemoSession().expiresAt
    };
  }
  return apiRequest('/auth/request-magic-link', {
    method: 'POST',
    body: JSON.stringify({ email, redirectTo })
  });
}

export async function getMe(): Promise<PhysicianSession> {
  if (isDemoModeEnabled()) {
    return getDemoSession();
  }
  const payload = await apiRequest<{ ok: boolean; physician: PhysicianSession['physician']; expiresAt: string; enabledConditions: string[] }>('/auth/me');
  return {
    physician: payload.physician,
    expiresAt: payload.expiresAt,
    enabledConditions: payload.enabledConditions
  };
}

export async function logout(): Promise<void> {
  if (isDemoModeEnabled()) {
    resetDemoState();
    return;
  }
  await apiRequest('/auth/logout', { method: 'POST', body: '{}' });
}

export async function createVoiceDraft(input: {
  conditionKey: string;
  audioBase64: string;
  contentType: string;
  languageCode?: string;
}): Promise<VoiceDraft> {
  if (isDemoModeEnabled()) {
    return createDemoVoiceDraft(input);
  }
  const payload = await apiRequest<{ ok: boolean; draft: VoiceDraft }>('/voice-drafts', {
    method: 'POST',
    body: JSON.stringify(input)
  });
  return payload.draft;
}

export async function getVoiceDraft(draftId: number): Promise<VoiceDraft> {
  if (isDemoModeEnabled()) {
    return getDemoVoiceDraft(draftId);
  }
  const payload = await apiRequest<{ ok: boolean; draft: VoiceDraft }>(`/voice-drafts/${draftId}`);
  return payload.draft;
}

export async function listVoiceDrafts(conditionKey: string): Promise<VoiceDraft[]> {
  if (isDemoModeEnabled()) {
    return listDemoVoiceDrafts(conditionKey);
  }
  const payload = await apiRequest<{ ok: boolean; drafts: VoiceDraft[] }>(`/voice-drafts?condition=${encodeURIComponent(conditionKey)}`);
  return payload.drafts;
}

export async function commitVoiceDraft(
  draftId: number,
  input: {
    conditionKey: string;
    caseId?: number;
    createNewCase?: boolean;
    summary: string;
    dueAt: string;
    conditionPayload: Record<string, string | null>;
  }
): Promise<{ case: CaseDetail; draft: VoiceDraft }> {
  if (isDemoModeEnabled()) {
    return commitDemoVoiceDraft(draftId, input);
  }
  const payload = await apiRequest<{ ok: boolean; result: { case: CaseDetail; draft: VoiceDraft } }>(`/voice-drafts/${draftId}/commit`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
  return payload.result;
}

export async function getTodayQueues(conditionKey: string): Promise<TodayQueues> {
  if (isDemoModeEnabled()) {
    return getDemoTodayQueues(conditionKey);
  }
  const payload = await apiRequest<{ ok: boolean; queues: TodayQueues }>(`/cases/today?condition=${encodeURIComponent(conditionKey)}`);
  return payload.queues;
}

export async function listCases(conditionKey: string, limit = 30): Promise<CaseCard[]> {
  if (isDemoModeEnabled()) {
    return listDemoCases(conditionKey, limit);
  }
  const payload = await apiRequest<{ ok: boolean; cases: CaseCard[] }>(`/cases?condition=${encodeURIComponent(conditionKey)}&limit=${limit}`);
  return payload.cases;
}

export async function getCaseDetail(caseId: number): Promise<CaseDetail> {
  if (isDemoModeEnabled()) {
    return getDemoCaseDetail(caseId);
  }
  const payload = await apiRequest<{ ok: boolean; detail: CaseDetail }>(`/cases/${caseId}`);
  return payload.detail;
}

export async function patchCase(caseId: number, input: Record<string, unknown>): Promise<CaseDetail> {
  const payload = await apiRequest<{ ok: boolean; detail: CaseDetail }>(`/cases/${caseId}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
  return payload.detail;
}

export async function getCohortSummary(conditionKey: string): Promise<CohortSummary> {
  if (isDemoModeEnabled()) {
    return getDemoCohortSummary(conditionKey);
  }
  const payload = await apiRequest<{ ok: boolean; summary: CohortSummary }>(`/cohorts/${encodeURIComponent(conditionKey)}/summary`);
  return payload.summary;
}

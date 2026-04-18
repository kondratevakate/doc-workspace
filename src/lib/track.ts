'use client';

/**
 * Fire-and-forget process mining event tracker.
 * Never throws, never awaits — call from any component or hook.
 * Zero PHI in payloads: no names, no transcripts, no audio content.
 * Demo mode: events are silently dropped (no backend call).
 */

import { isDemoModeEnabled } from './preferences';

export type TrackEventType =
  | 'recording_started'
  | 'recording_stopped'
  | 'audio_uploaded'
  | 'transcript_received'
  | 'visit_committed'
  | 'ping_viewed'
  | 'ping_called'
  | 'ping_rescheduled'
  | 'ping_dismissed';

interface TrackPayload {
  conditionKey?: string;
  source?: 'voice' | 't9';
  durationSec?: number;
  fileSizeMb?: number;
  uploadMs?: number;
  wordCount?: number;
  processingMs?: number;
  isNewCase?: boolean;
  caseId?: number;
  taskId?: number;
  overdueDays?: number;
  newDate?: string;
}

// Stable session ID per browser tab — anonymous, not tied to physician identity
const SESSION_ID = typeof crypto !== 'undefined'
  ? crypto.randomUUID()
  : Math.random().toString(36).slice(2);

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export function track(eventType: TrackEventType, payload: TrackPayload = {}): void {
  if (isDemoModeEnabled()) return;
  // fire and forget — never block the caller
  fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ eventType, payload, sessionId: SESSION_ID }),
  }).catch(() => { /* telemetry loss is acceptable — never surface to user */ });
}

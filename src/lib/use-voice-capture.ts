'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createVoiceDraft, getVoiceDraft } from '@/src/lib/api';
import { track } from '@/src/lib/track';
import type { VoiceDraft } from '@/src/lib/types';

// ── Web Speech API type shims (not in standard TS lib) ──────────────────────
interface SpeechRecognitionAlternative {
  readonly transcript: string;
}
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly 0: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition ||
    null
  );
}

// ── Types ────────────────────────────────────────────────────────────────────
export type CaptureStatus = 'idle' | 'recording' | 'uploading' | 'polling' | 'review' | 'error';

export interface UseVoiceCaptureOptions {
  locale: 'en' | 'ru';
  activeConditionKey: string;
}

export interface UseVoiceCaptureReturn {
  status: CaptureStatus;
  liveTranscript: string;
  elapsed: number;
  draft: VoiceDraft | null;
  error: string | null;
  info: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  uploadFile: (file: File | Blob, contentType?: string) => Promise<void>;
  hydrateDraft: (draft: VoiceDraft) => void;
  reset: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useVoiceCapture({ locale, activeConditionKey }: UseVoiceCaptureOptions): UseVoiceCaptureReturn {
  const [status, setStatus] = useState<CaptureStatus>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [draft, setDraft] = useState<VoiceDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const pollRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef('');

  // Refs for latest values — avoid stale closures in async fns
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const conditionKeyRef = useRef(activeConditionKey);
  conditionKeyRef.current = activeConditionKey;

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearTimeout(pollRef.current);
      if (timerRef.current) window.clearInterval(timerRef.current);
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    };
  }, []);

  const hydrateDraft = useCallback((nextDraft: VoiceDraft) => {
    setDraft(nextDraft);
  }, []);

  const reset = useCallback(() => {
    if (pollRef.current) window.clearTimeout(pollRef.current);
    if (timerRef.current) window.clearInterval(timerRef.current);
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
    setStatus('idle');
    setLiveTranscript('');
    setElapsed(0);
    setDraft(null);
    setError(null);
    setInfo(null);
    finalTranscriptRef.current = '';
  }, []);

  function startTimer() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setElapsed(0);
    timerRef.current = window.setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startSpeechRecognition(lang: string) {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) return;

    finalTranscriptRef.current = '';
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscriptRef.current += result[0].transcript + ' ';
        } else {
          interim = result[0].transcript;
        }
      }
      setLiveTranscript(finalTranscriptRef.current + interim);
    };

    recognition.onerror = () => { /* progressive enhancement — fail silently */ };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch { /* already started */ }
  }

  async function uploadBlobInternal(blob: Blob | File, contentType: string) {
    setStatus('uploading');
    setInfo('Uploading voice note...');
    setError(null);
    const uploadStart = Date.now();
    try {
      const audioBase64 = await blobToBase64(blob);
      const created = await createVoiceDraft({
        conditionKey: conditionKeyRef.current,
        audioBase64,
        contentType,
        languageCode: localeRef.current === 'ru' ? 'ru' : 'en',
      });
      track('audio_uploaded', {
        fileSizeMb: Math.round(blob.size / 1024 / 1024 * 100) / 100,
        uploadMs: Date.now() - uploadStart,
      });
      hydrateDraft(created);
      setInfo('Voice note received. Building draft...');
      setStatus('polling');
      pollDraftInternal(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload voice note.');
      setStatus('error');
      setInfo(null);
    }
  }

  function pollDraftInternal(draftId: number) {
    if (pollRef.current) window.clearTimeout(pollRef.current);
    const tick = async () => {
      try {
        const current = await getVoiceDraft(draftId);
        hydrateDraft(current);
        const ready = current.status === 'done' || Boolean(current.transcript);
        if (ready) {
          track('transcript_received', {
            wordCount: current.transcript ? current.transcript.split(/\s+/).filter(Boolean).length : 0,
          });
          setStatus('review');
          setInfo(current.reviewState === 'ready' ? 'Draft ready for review.' : 'Draft needs review before commit.');
          return;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not refresh draft status.');
        setStatus('error');
        return;
      }
      pollRef.current = window.setTimeout(tick, 1500);
    };
    void tick();
  }

  const startRecording = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Recording is not available in this browser. Use the upload option.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const durationSec = elapsed;
        stopTimer();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        try { recognitionRef.current?.stop(); } catch { /* ignore */ }
        track('recording_stopped', { durationSec });
        await uploadBlobInternal(blob, recorder.mimeType || 'audio/webm');
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus('recording');
      startTimer();
      startSpeechRecognition(localeRef.current === 'ru' ? 'ru-RU' : 'en-US');
      track('recording_started', { conditionKey: conditionKeyRef.current, source: 'voice' });
    } catch {
      setError('Microphone access denied.');
      setStatus('idle');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    stopTimer();
  }, []);

  const uploadFile = useCallback(async (file: File | Blob, contentType?: string) => {
    const ct = contentType ?? (file instanceof File ? (file.type || 'audio/mp4') : 'audio/wav');
    await uploadBlobInternal(file, ct);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, liveTranscript, elapsed, draft, error, info, startRecording, stopRecording, uploadFile, hydrateDraft, reset };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function blobToBase64(blob: Blob | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',').pop() || '' : result);
    };
    reader.onerror = () => reject(reader.error || new Error('file_read_failed'));
    reader.readAsDataURL(blob);
  });
}

/** Minimal valid WAV blob (44-byte header, 0 samples) — used by T9 mode to create a text-only draft */
export function createSilentAudioBlob(): Blob {
  const buffer = new ArrayBuffer(44);
  const v = new DataView(buffer);
  // RIFF
  [0x52, 0x49, 0x46, 0x46].forEach((b, i) => v.setUint8(i, b));
  v.setUint32(4, 36, true);
  [0x57, 0x41, 0x56, 0x45].forEach((b, i) => v.setUint8(8 + i, b));
  // fmt
  [0x66, 0x6d, 0x74, 0x20].forEach((b, i) => v.setUint8(12 + i, b));
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);   // PCM
  v.setUint16(22, 1, true);   // mono
  v.setUint32(24, 16000, true); // 16 kHz
  v.setUint32(28, 32000, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  // data
  [0x64, 0x61, 0x74, 0x61].forEach((b, i) => v.setUint8(36 + i, b));
  v.setUint32(40, 0, true);   // 0 bytes of audio
  return new Blob([buffer], { type: 'audio/wav' });
}

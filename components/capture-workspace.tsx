'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ApiError, buildApiUrl, commitVoiceDraft, getTodayQueues, listCases } from '@/src/lib/api';
import { getPackUi } from '@/src/lib/packs';
import type { CaseCard, VoiceDraft } from '@/src/lib/types';
import { useI18n } from '@/src/lib/use-i18n';
import { useAuthGuard } from '@/src/lib/use-auth';
import { useAppStore } from '@/src/store/app-store';
import { createSilentAudioBlob, useVoiceCapture } from '@/src/lib/use-voice-capture';
import { LoadingState } from './loading-state';
import { SectionCard } from './section-card';
import { WorkspaceShell } from './workspace-shell';

// ── Types ────────────────────────────────────────────────────────────────────
type TFn = ReturnType<typeof useI18n>['t'];
type CaptureInputMode = 'voice' | 'quickinput';
type CaseMode = 'new' | 'existing';
type VisitType = 'primary' | 'followup';

// ── Constants ────────────────────────────────────────────────────────────────
const LATIN_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const CYRILLIC_LETTERS = 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЭЮЯ'.split('');

const TOPICS: Record<'en' | 'ru', string[]> = {
  en: ['Pain', 'Medication', 'Frequency', 'Side effects', 'Labs', 'Worsening', 'Improvement', 'Triggers'],
  ru: ['Боль', 'Препараты', 'Частота', 'Побочные эффекты', 'Анализы', 'Ухудшение', 'Улучшение', 'Триггеры'],
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function generateT9Summary(
  visitType: VisitType | null,
  patientInitial: string,
  topics: string[],
  locale: 'en' | 'ru'
): string {
  if (locale === 'ru') {
    const parts: string[] = [];
    if (visitType === 'primary') parts.push('Первичный приём.');
    else if (visitType === 'followup') parts.push('Повторный приём.');
    if (patientInitial) parts.push(`Пациент ${patientInitial}.`);
    if (topics.length > 0) parts.push(`Обсуждали: ${topics.join(', ')}.`);
    return parts.join(' ') || 'Быстрый ввод.';
  }
  const parts: string[] = [];
  if (visitType === 'primary') parts.push('Primary visit.');
  else if (visitType === 'followup') parts.push('Follow-up visit.');
  if (patientInitial) parts.push(`Patient ${patientInitial}.`);
  if (topics.length > 0) parts.push(`Discussed: ${topics.join(', ')}.`);
  return parts.join(' ') || 'Quick input.';
}

// ── Inline SVG icons ─────────────────────────────────────────────────────────
function MicSvg({ size = 44, color = 'white' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" fill={color} />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" fill={color} />
    </svg>
  );
}

// ── DueTodayPanel ────────────────────────────────────────────────────────────
function DueTodayPanel({ conditionKey }: { conditionKey: string }) {
  const [cases, setCases] = useState<CaseCard[]>([]);
  const { locale, t } = useI18n();

  useEffect(() => {
    getTodayQueues(conditionKey)
      .then((q) => setCases(q.dueToday.slice(0, 8)))
      .catch(() => undefined);
  }, [conditionKey]);

  return (
    <Stack sx={{ p: 2.5, height: '100%' }} spacing={2}>
      <Box>
        <Typography
          variant="overline"
          sx={{ color: 'text.secondary', letterSpacing: '0.12em', fontSize: '0.7rem' }}
        >
          {t('today.dueToday')}
        </Typography>
      </Box>
      {cases.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('today.noCasesDueToday')}
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {cases.map((c) => (
            <Box
              key={c.id}
              component={Link}
              href={`/cases/${c.id}`}
              sx={{
                display: 'block',
                textDecoration: 'none',
                p: 1.5,
                borderRadius: 2,
                border: '1px solid rgba(22,32,36,0.07)',
                backgroundColor: 'rgba(255,255,255,0.7)',
                transition: 'background-color 0.15s',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {c.caseToken}
                </Typography>
                {c.nextFollowupDueAt ? (
                  <Typography variant="caption" color="text.secondary">
                    {c.nextFollowupDueAt}
                  </Typography>
                ) : null}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, lineHeight: 1.4 }}>
                {c.summary}
              </Typography>
              {c.openTask ? (
                <Chip
                  label={c.openTask.priority === 'high' ? (locale === 'ru' ? 'Срочно' : 'Urgent') : c.openTask.taskType}
                  size="small"
                  color={c.openTask.priority === 'high' ? 'secondary' : 'default'}
                  sx={{ mt: 0.75, height: 18, fontSize: '0.65rem' }}
                />
              ) : null}
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function CaptureWorkspace() {
  const { physician, loading } = useAuthGuard();
  const { locale, t } = useI18n();
  const activeConditionKey = useAppStore((state) => state.activeConditionKey);
  const router = useRouter();

  const pack = useMemo(() => getPackUi(activeConditionKey, locale), [activeConditionKey, locale]);

  // Voice capture hook
  const voiceCapture = useVoiceCapture({ locale, activeConditionKey });

  // UI mode
  const [captureMode, setCaptureMode] = useState<CaptureInputMode>('voice');

  // Review form state
  const [cases, setCases] = useState<CaseCard[]>([]);
  const [caseMode, setCaseMode] = useState<CaseMode>('new');
  const [selectedCaseId, setSelectedCaseId] = useState<number | ''>('');
  const [summary, setSummary] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [conditionPayload, setConditionPayload] = useState<Record<string, string | null>>({});
  const [commitBusy, setCommitBusy] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  // T9 state
  const [visitType, setVisitType] = useState<VisitType | null>(null);
  const [patientInitial, setPatientInitial] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [t9DueAt, setT9DueAt] = useState('');
  const pendingT9DataRef = useRef<{ summary: string; dueAt: string } | null>(null);

  // Date shortcuts (computed once on mount)
  const dateShortcuts = useMemo(() => [
    { labelKey: 'capture.in1Week' as const, date: addDays(7) },
    { labelKey: 'capture.in2Weeks' as const, date: addDays(14) },
    { labelKey: 'capture.in1Month' as const, date: addDays(30) },
    { labelKey: 'capture.in3Months' as const, date: addDays(90) },
  ], []);

  // Load cases for the "attach to case" selector
  useEffect(() => {
    if (!physician) return;
    listCases(activeConditionKey, 20).then(setCases).catch(() => undefined);
  }, [physician, activeConditionKey]);

  // Sync form fields when a new draft arrives
  useEffect(() => {
    const draft = voiceCapture.draft;
    if (!draft) return;
    setSummary((prev) => prev || draft.summary || '');
    setDueAt((prev) => prev || draft.dueAt || '');
    setConditionPayload((prev) => (Object.keys(prev).length > 0 ? prev : draft.conditionPayload || {}));
    if (draft.committedCaseId) {
      setCaseMode('existing');
      setSelectedCaseId(draft.committedCaseId);
    }
  }, [voiceCapture.draft]);

  // Load existing draft from ?draft= query param
  useEffect(() => {
    if (!physician) return;
    const draftParam = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('draft');
    if (!draftParam) return;
    const draftId = Number(draftParam);
    if (!Number.isFinite(draftId)) return;
    import('@/src/lib/api').then(({ getVoiceDraft }) =>
      getVoiceDraft(draftId)
        .then((d) => {
          voiceCapture.hydrateDraft(d);
          // Treat as already in review state
        })
        .catch(() => undefined)
    );
  }, [physician]); // eslint-disable-line react-hooks/exhaustive-deps

  // T9 auto-commit: once draft is ready after silent audio upload
  useEffect(() => {
    if (!pendingT9DataRef.current) return;
    if (voiceCapture.status === 'review' && voiceCapture.draft) {
      const data = pendingT9DataRef.current;
      pendingT9DataRef.current = null;
      void doCommit(voiceCapture.draft.id, data.summary, data.dueAt);
    } else if (voiceCapture.status === 'error') {
      pendingT9DataRef.current = null;
      setCommitError(t('capture.commitDraftError'));
      setCommitBusy(false);
    }
  }, [voiceCapture.status, voiceCapture.draft]); // eslint-disable-line react-hooks/exhaustive-deps

  async function doCommit(draftId: number, summaryOverride?: string, dueAtOverride?: string) {
    setCommitBusy(true);
    setCommitError(null);
    try {
      const result = await commitVoiceDraft(draftId, {
        conditionKey: activeConditionKey,
        caseId: caseMode === 'existing' && selectedCaseId ? Number(selectedCaseId) : undefined,
        createNewCase: caseMode === 'new',
        summary: summaryOverride ?? summary,
        dueAt: dueAtOverride ?? dueAt,
        conditionPayload,
      });
      router.push(`/cases/${result.case.case.id}`);
    } catch (err) {
      if (err instanceof ApiError && typeof err.payload === 'object' && err.payload && 'draft' in err.payload) {
        const nextDraft = (err.payload as { draft?: VoiceDraft }).draft;
        if (nextDraft) voiceCapture.hydrateDraft(nextDraft);
      }
      setCommitError(err instanceof Error ? err.message : t('capture.commitDraftError'));
    } finally {
      setCommitBusy(false);
    }
  }

  function handleCommit() {
    if (!voiceCapture.draft) return;
    void doCommit(voiceCapture.draft.id);
  }

  function handleT9Commit() {
    if (!visitType) {
      setCommitError(locale === 'ru' ? 'Выбери тип приёма.' : 'Select visit type.');
      return;
    }
    if (!t9DueAt) {
      setCommitError(locale === 'ru' ? 'Выбери дату следующего визита.' : 'Select next visit date.');
      return;
    }
    const generatedSummary = generateT9Summary(visitType, patientInitial, selectedTopics, locale);
    pendingT9DataRef.current = { summary: generatedSummary, dueAt: t9DueAt };
    setCommitBusy(true);
    setCommitError(null);
    void voiceCapture.uploadFile(createSilentAudioBlob(), 'audio/wav');
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    void voiceCapture.uploadFile(file);
    event.target.value = '';
  }

  function toggleTopic(topic: string) {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  }

  const busy = commitBusy || voiceCapture.status === 'uploading' || voiceCapture.status === 'polling';
  const canCommit =
    !busy &&
    !!voiceCapture.draft &&
    summary.trim().length > 0 &&
    dueAt.length > 0 &&
    (caseMode === 'new' || !!selectedCaseId);

  if (loading || !physician) return <LoadingState label={t('capture.loading')} />;

  return (
    <WorkspaceShell
      title={t('capture.title')}
      subtitle={t('capture.subtitle')}
      rightPanel={<DueTodayPanel conditionKey={activeConditionKey} />}
    >
      {/* Global errors / info from the hook */}
      {voiceCapture.error ? <Alert severity="error">{voiceCapture.error}</Alert> : null}
      {voiceCapture.info && voiceCapture.status !== 'review' ? (
        <Alert severity="info">{voiceCapture.info}</Alert>
      ) : null}
      {commitError ? <Alert severity="error">{commitError}</Alert> : null}

      {/* ── Mode toggle: Voice / Quick Input ── */}
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button
          variant={captureMode === 'voice' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setCaptureMode('voice')}
        >
          🎤 {locale === 'ru' ? 'Голос' : 'Voice'}
        </Button>
        <Button
          variant={captureMode === 'quickinput' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setCaptureMode('quickinput')}
        >
          ⌨ {t('capture.quickInput')}
        </Button>
      </Stack>

      {captureMode === 'voice' ? (
        <VoicePanel
          voiceCapture={voiceCapture}
          pack={pack}
          cases={cases}
          caseMode={caseMode}
          selectedCaseId={selectedCaseId}
          summary={summary}
          dueAt={dueAt}
          conditionPayload={conditionPayload}
          canCommit={canCommit}
          busy={busy}
          dateShortcuts={dateShortcuts}
          t={t}
          locale={locale}
          onFileChange={handleFileChange}
          onCaseModeChange={setCaseMode}
          onSelectedCaseIdChange={setSelectedCaseId}
          onSummaryChange={setSummary}
          onDueAtChange={setDueAt}
          onConditionPayloadChange={setConditionPayload}
          onCommit={handleCommit}
        />
      ) : (
        <QuickInputPanel
          locale={locale}
          t={t}
          visitType={visitType}
          patientInitial={patientInitial}
          selectedTopics={selectedTopics}
          t9DueAt={t9DueAt}
          dateShortcuts={dateShortcuts}
          busy={busy}
          onVisitTypeChange={setVisitType}
          onPatientInitialChange={setPatientInitial}
          onTopicToggle={toggleTopic}
          onDueAtChange={setT9DueAt}
          onCommit={handleT9Commit}
        />
      )}
    </WorkspaceShell>
  );
}

// ── Voice Panel ───────────────────────────────────────────────────────────────
function VoicePanel({
  voiceCapture,
  pack,
  cases,
  caseMode,
  selectedCaseId,
  summary,
  dueAt,
  conditionPayload,
  canCommit,
  busy,
  dateShortcuts,
  t,
  locale,
  onFileChange,
  onCaseModeChange,
  onSelectedCaseIdChange,
  onSummaryChange,
  onDueAtChange,
  onConditionPayloadChange,
  onCommit,
}: {
  voiceCapture: ReturnType<typeof useVoiceCapture>;
  pack: ReturnType<typeof getPackUi>;
  cases: CaseCard[];
  caseMode: CaseMode;
  selectedCaseId: number | '';
  summary: string;
  dueAt: string;
  conditionPayload: Record<string, string | null>;
  canCommit: boolean;
  busy: boolean;
  dateShortcuts: { labelKey: 'capture.in1Week' | 'capture.in2Weeks' | 'capture.in1Month' | 'capture.in3Months'; date: string }[];
  t: TFn;
  locale: 'en' | 'ru';
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCaseModeChange: (m: CaseMode) => void;
  onSelectedCaseIdChange: (id: number | '') => void;
  onSummaryChange: (v: string) => void;
  onDueAtChange: (v: string) => void;
  onConditionPayloadChange: (fn: (prev: Record<string, string | null>) => Record<string, string | null>) => void;
  onCommit: () => void;
}) {
  const { status, liveTranscript, elapsed, draft, startRecording, stopRecording } = voiceCapture;

  // ── Idle state ──
  if (status === 'idle' && !draft) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, py: { xs: 4, md: 6 } }}>
        <Box
          className="mic-idle"
          onClick={() => void startRecording()}
          sx={{
            width: 160,
            height: 160,
            borderRadius: '50%',
            backgroundColor: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <MicSvg size={48} />
        </Box>

        <Stack spacing={0.5} alignItems="center" sx={{ textAlign: 'center' }}>
          <Typography variant="h5" className="serif-display" sx={{ fontStyle: 'italic', fontWeight: 500 }}>
            {t('capture.tapToRecord')}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textTransform: 'uppercase', letterSpacing: '0.12em' }}
          >
            {t('capture.startCaptureHint')}
          </Typography>
        </Stack>

        <Button variant="outlined" size="small" component="label" sx={{ color: 'text.secondary', borderColor: 'rgba(22,32,36,0.2)' }}>
          📎 {t('capture.uploadAudio')}
          <input hidden accept="audio/*" type="file" onChange={onFileChange} />
        </Button>
      </Box>
    );
  }

  // ── Recording state ──
  if (status === 'recording') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, py: { xs: 4, md: 6 } }}>
        <Box
          className="mic-recording"
          onClick={stopRecording}
          sx={{
            width: 160,
            height: 160,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <MicSvg size={48} />
        </Box>

        <Stack spacing={0.5} alignItems="center" sx={{ textAlign: 'center' }}>
          <Typography variant="h5" className="serif-display" sx={{ fontWeight: 500 }}>
            {formatElapsed(elapsed)}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textTransform: 'uppercase', letterSpacing: '0.12em' }}
          >
            {t('capture.recordingInProgress')} — {t('capture.tapToStop')}
          </Typography>
        </Stack>

        {liveTranscript ? (
          <Paper
            sx={{
              width: '100%',
              p: 2,
              backgroundColor: 'rgba(255,255,255,0.85)',
              maxHeight: 180,
              overflowY: 'auto',
            }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', lineHeight: 1.75 }}>
              {liveTranscript}
            </Typography>
          </Paper>
        ) : null}

        <Button variant="outlined" color="error" onClick={stopRecording}>
          ■ {t('capture.stopRecording')}
        </Button>
      </Box>
    );
  }

  // ── Uploading / Polling state (no draft yet) ──
  if ((status === 'uploading' || status === 'polling') && !draft) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5, py: 6 }}>
        <CircularProgress size={48} thickness={3} />
        <Typography variant="body1" color="text.secondary">
          {t('capture.processingAudio')}
        </Typography>
      </Box>
    );
  }

  // ── Review state (draft received) ──
  return (
    <SectionCard title={t('capture.reviewDraft')} eyebrow={pack.label}>
      <Stack spacing={2}>
        {/* Record again button */}
        <Box>
          <Button
            variant="text"
            size="small"
            onClick={() => void voiceCapture.reset()}
            sx={{ color: 'text.secondary', pl: 0 }}
          >
            🎤 {t('capture.recordAgain')}
          </Button>
        </Box>

        {/* Audio playback */}
        {draft?.audioUrl ? (
          <audio controls preload="none" src={buildApiUrl(draft.audioUrl)} style={{ width: '100%', borderRadius: 8 }} />
        ) : null}

        {/* Live transcript / Gemini transcript */}
        {(liveTranscript || draft?.transcript) ? (
          <Paper sx={{ p: 1.75, backgroundColor: 'rgba(255,255,255,0.7)' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', lineHeight: 1.75 }}>
              {draft?.transcript || liveTranscript || t('capture.transcriptProcessing')}
            </Typography>
          </Paper>
        ) : null}

        {/* Summary */}
        <TextField
          label={t('capture.summary')}
          value={summary}
          onChange={(e) => onSummaryChange(e.target.value)}
          multiline
          minRows={3}
          disabled={busy}
        />

        {/* Due date shortcuts */}
        <Stack spacing={0.75}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {t('capture.nextVisit')}
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {dateShortcuts.map((s) => (
              <Chip
                key={s.date}
                label={t(s.labelKey)}
                onClick={() => onDueAtChange(s.date)}
                color={dueAt === s.date ? 'primary' : 'default'}
                variant={dueAt === s.date ? 'filled' : 'outlined'}
                clickable
                size="small"
                disabled={busy}
              />
            ))}
          </Stack>
          <TextField
            label={t('capture.nextFollowupDue')}
            type="date"
            value={dueAt}
            onChange={(e) => onDueAtChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            disabled={busy}
          />
        </Stack>

        {/* Case mode toggle */}
        <Stack direction="row" spacing={1}>
          <Button
            variant={caseMode === 'new' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => onCaseModeChange('new')}
            disabled={busy}
          >
            {t('capture.newCase')}
          </Button>
          <Button
            variant={caseMode === 'existing' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => onCaseModeChange('existing')}
            disabled={busy}
          >
            {t('capture.existingCase')}
          </Button>
        </Stack>

        {caseMode === 'existing' ? (
          <FormControl fullWidth size="small">
            <InputLabel id="case-select-label">{t('capture.attachToCase')}</InputLabel>
            <Select
              labelId="case-select-label"
              label={t('capture.attachToCase')}
              value={selectedCaseId}
              onChange={(e) => onSelectedCaseIdChange(Number(e.target.value))}
              disabled={busy}
            >
              {cases.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.caseToken} — {c.summary}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}

        {/* Condition-specific fields */}
        {pack.fields.map((field) =>
          field.type === 'select' ? (
            <FormControl key={field.key} fullWidth size="small">
              <InputLabel id={`${field.key}-label`}>{field.label}</InputLabel>
              <Select
                labelId={`${field.key}-label`}
                label={field.label}
                value={conditionPayload[field.key] || ''}
                onChange={(e) =>
                  onConditionPayloadChange((prev) => ({ ...prev, [field.key]: String(e.target.value) || null }))
                }
                disabled={busy}
              >
                <MenuItem value="">{t('common.notSet')}</MenuItem>
                {field.options?.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <TextField
              key={field.key}
              label={field.label}
              size="small"
              value={conditionPayload[field.key] || ''}
              onChange={(e) =>
                onConditionPayloadChange((prev) => ({ ...prev, [field.key]: e.target.value || null }))
              }
              disabled={busy}
            />
          )
        )}

        <Button variant="contained" size="large" disabled={!canCommit} onClick={onCommit}>
          {busy ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : null}
          {t('capture.commitDraft')}
        </Button>
      </Stack>
    </SectionCard>
  );
}

// ── Quick Input Panel ─────────────────────────────────────────────────────────
function QuickInputPanel({
  locale,
  t,
  visitType,
  patientInitial,
  selectedTopics,
  t9DueAt,
  dateShortcuts,
  busy,
  onVisitTypeChange,
  onPatientInitialChange,
  onTopicToggle,
  onDueAtChange,
  onCommit,
}: {
  locale: 'en' | 'ru';
  t: TFn;
  visitType: VisitType | null;
  patientInitial: string;
  selectedTopics: string[];
  t9DueAt: string;
  dateShortcuts: { labelKey: 'capture.in1Week' | 'capture.in2Weeks' | 'capture.in1Month' | 'capture.in3Months'; date: string }[];
  busy: boolean;
  onVisitTypeChange: (v: VisitType) => void;
  onPatientInitialChange: (v: string) => void;
  onTopicToggle: (topic: string) => void;
  onDueAtChange: (v: string) => void;
  onCommit: () => void;
}) {
  const letters = locale === 'ru' ? CYRILLIC_LETTERS : LATIN_LETTERS;
  const topics = TOPICS[locale];

  return (
    <SectionCard title={t('capture.quickInput')} eyebrow={locale === 'ru' ? 'Без голоса' : 'No voice needed'}>
      <Stack spacing={2.5}>

        {/* Visit type */}
        <Stack spacing={0.75}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {t('capture.visitType')}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant={visitType === 'primary' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => onVisitTypeChange('primary')}
              disabled={busy}
            >
              {t('capture.visitPrimary')}
            </Button>
            <Button
              variant={visitType === 'followup' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => onVisitTypeChange('followup')}
              disabled={busy}
            >
              {t('capture.visitFollowup')}
            </Button>
          </Stack>
        </Stack>

        {/* Patient initial */}
        <Stack spacing={0.75}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {t('capture.patientInitial')}
            {patientInitial ? ` — ${patientInitial}` : ''}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {letters.map((letter) => (
              <Chip
                key={letter}
                label={letter}
                size="small"
                clickable
                onClick={() => onPatientInitialChange(letter === patientInitial ? '' : letter)}
                color={patientInitial === letter ? 'primary' : 'default'}
                variant={patientInitial === letter ? 'filled' : 'outlined'}
                disabled={busy}
                sx={{ minWidth: 34, fontWeight: patientInitial === letter ? 700 : 400 }}
              />
            ))}
          </Box>
        </Stack>

        {/* Discussed topics */}
        <Stack spacing={0.75}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {t('capture.discussed')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {topics.map((topic) => (
              <Chip
                key={topic}
                label={topic}
                size="small"
                clickable
                onClick={() => onTopicToggle(topic)}
                color={selectedTopics.includes(topic) ? 'primary' : 'default'}
                variant={selectedTopics.includes(topic) ? 'filled' : 'outlined'}
                disabled={busy}
              />
            ))}
          </Box>
        </Stack>

        {/* Next visit shortcuts */}
        <Stack spacing={0.75}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {t('capture.nextVisit')}
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {dateShortcuts.map((s) => (
              <Chip
                key={s.date}
                label={t(s.labelKey)}
                onClick={() => onDueAtChange(s.date)}
                color={t9DueAt === s.date ? 'primary' : 'default'}
                variant={t9DueAt === s.date ? 'filled' : 'outlined'}
                clickable
                size="small"
                disabled={busy}
              />
            ))}
          </Stack>
          <TextField
            label={t('capture.nextFollowupDue')}
            type="date"
            value={t9DueAt}
            onChange={(e) => onDueAtChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            disabled={busy}
          />
        </Stack>

        <Button
          variant="contained"
          size="large"
          disabled={busy || !visitType || !t9DueAt}
          onClick={onCommit}
        >
          {busy ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : null}
          {t('capture.commitDraft')}
        </Button>
      </Stack>
    </SectionCard>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { ApiError, buildApiUrl, commitVoiceDraft, listCases, getTodayQueues } from '@/src/lib/api';
import { track } from '@/src/lib/track';
import { getPackUi } from '@/src/lib/packs';
import type { CaseCard, VoiceDraft } from '@/src/lib/types';
import { useI18n } from '@/src/lib/use-i18n';
import { useAuthGuard } from '@/src/lib/use-auth';
import { useAppStore } from '@/src/store/app-store';
import { createSilentAudioBlob, useVoiceCapture } from '@/src/lib/use-voice-capture';
import { LoadingState } from './loading-state';
import { SectionCard } from './section-card';
import { WorkspaceShell } from './workspace-shell';

type TFn = ReturnType<typeof useI18n>['t'];
type CaseMode = 'new' | 'existing';
type VisitType = 'primary' | 'followup';


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

function generateT9Summary(visitType: VisitType | null, prevVisitMonth: string, locale: 'en' | 'ru'): string {
  if (locale === 'ru') {
    const parts: string[] = [];
    if (visitType === 'primary') parts.push('Первичный приём.');
    else if (visitType === 'followup') {
      parts.push('Повторный приём.');
      if (prevVisitMonth) parts.push(`Предыдущий визит: ${prevVisitMonth}.`);
    }
    return parts.join(' ');
  }
  const parts: string[] = [];
  if (visitType === 'primary') parts.push('Primary visit.');
  else if (visitType === 'followup') {
    parts.push('Follow-up visit.');
    if (prevVisitMonth) parts.push(`Previous visit: ${prevVisitMonth}.`);
  }
  return parts.join(' ');
}

function MicSvg({ size = 40, color = 'white' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" fill={color} />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" fill={color} />
    </svg>
  );
}

export function CaptureWorkspace() {
  const { physician, loading } = useAuthGuard();
  const { locale, t } = useI18n();
  const activeConditionKey = useAppStore((state) => state.activeConditionKey);
  const router = useRouter();
  const pack = useMemo(() => getPackUi(activeConditionKey, locale), [activeConditionKey, locale]);
  const voiceCapture = useVoiceCapture({ locale, activeConditionKey });

  // Patient / case selection
  const [dueTodayCases, setDueTodayCases] = useState<CaseCard[]>([]);
  const [recentCases, setRecentCases] = useState<CaseCard[]>([]);
  const [caseMode, setCaseMode] = useState<CaseMode>('new');
  const [selectedCaseId, setSelectedCaseId] = useState<number | ''>('');

  // Visit metadata — collected before / during recording
  const [visitType, setVisitType] = useState<VisitType | null>(null);
  const [prevVisitMonth, setPrevVisitMonth] = useState('');
  const [dueAt, setDueAt] = useState('');

  // Review fields — filled after draft arrives
  const [summary, setSummary] = useState('');
  const [conditionPayload, setConditionPayload] = useState<Record<string, string | null>>({});
  const [commitBusy, setCommitBusy] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  const pendingT9Ref = useRef<{ summary: string; dueAt: string } | null>(null);

  const dateShortcuts = useMemo(() => [
    { labelKey: 'capture.in1Week' as const, date: addDays(7) },
    { labelKey: 'capture.in2Weeks' as const, date: addDays(14) },
    { labelKey: 'capture.in1Month' as const, date: addDays(30) },
    { labelKey: 'capture.in3Months' as const, date: addDays(90) },
  ], []);

  useEffect(() => {
    if (!physician) return;
    getTodayQueues(activeConditionKey)
      .then((q) => setDueTodayCases(q.dueToday.slice(0, 10)))
      .catch(() => undefined);
    listCases(activeConditionKey, 20)
      .then(setRecentCases)
      .catch(() => undefined);
  }, [physician, activeConditionKey]);

  // Sync form fields when draft arrives from voice
  useEffect(() => {
    const draft = voiceCapture.draft;
    if (!draft) return;
    setSummary((prev) => prev || draft.summary || '');
    setDueAt((prev) => prev || draft.dueAt || '');
    setConditionPayload((prev) => Object.keys(prev).length > 0 ? prev : draft.conditionPayload || {});
    if (draft.committedCaseId) {
      setCaseMode('existing');
      setSelectedCaseId(draft.committedCaseId);
    }
  }, [voiceCapture.draft]);

  // Load draft from ?draft= query param
  useEffect(() => {
    if (!physician) return;
    const draftParam = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('draft');
    if (!draftParam) return;
    const draftId = Number(draftParam);
    if (!Number.isFinite(draftId)) return;
    import('@/src/lib/api').then(({ getVoiceDraft }) =>
      getVoiceDraft(draftId).then((d) => voiceCapture.hydrateDraft(d)).catch(() => undefined)
    );
  }, [physician]); // eslint-disable-line react-hooks/exhaustive-deps

  // T9 auto-commit: after silent audio upload completes
  useEffect(() => {
    if (!pendingT9Ref.current) return;
    if (voiceCapture.status === 'review' && voiceCapture.draft) {
      const data = pendingT9Ref.current;
      pendingT9Ref.current = null;
      void doCommit(voiceCapture.draft.id, data.summary, data.dueAt);
    } else if (voiceCapture.status === 'error') {
      pendingT9Ref.current = null;
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
      track('visit_committed', { caseId: result.case.case.id, isNewCase: caseMode === 'new', conditionKey: activeConditionKey });
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
    if (voiceCapture.draft) {
      // Voice draft exists — merge T9 topics into summary
      const t9Suffix = generateT9Summary(visitType, prevVisitMonth, locale);
      const finalSummary = t9Suffix ? `${summary}\n${t9Suffix}`.trim() : summary;
      void doCommit(voiceCapture.draft.id, finalSummary, dueAt);
    } else {
      // T9 only — commit via silent audio
      const t9Summary = generateT9Summary(visitType, prevVisitMonth, locale)
        || (locale === 'ru' ? 'Быстрый ввод.' : 'Quick input.');
      pendingT9Ref.current = { summary: t9Summary, dueAt };
      setCommitBusy(true);
      setCommitError(null);
      void voiceCapture.uploadFile(createSilentAudioBlob(), 'audio/wav');
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void voiceCapture.uploadFile(file);
    e.target.value = '';
  }

  function selectCase(id: number | '') {
    setSelectedCaseId(id);
    setCaseMode(id ? 'existing' : 'new');
  }

  const busy = commitBusy || voiceCapture.status === 'uploading' || voiceCapture.status === 'polling';
  const hasVoiceDraft = !!voiceCapture.draft && summary.trim().length > 0 && dueAt.length > 0;
  const hasT9Only = !voiceCapture.draft && !!visitType;
  const canCommit = !busy && (caseMode === 'new' || !!selectedCaseId) && (hasVoiceDraft || hasT9Only);

  const { status, liveTranscript, elapsed, draft, startRecording, stopRecording } = voiceCapture;

  // Merge patient list: due-today first, then recent without duplicates
  const dueTodayIds = new Set(dueTodayCases.map((c) => c.id));
  const pickerCases = [
    ...dueTodayCases,
    ...recentCases.filter((c) => !dueTodayIds.has(c.id)),
  ].slice(0, 15);

  if (loading || !physician) return <LoadingState label={t('capture.loading')} />;

  return (
    <WorkspaceShell title={t('capture.title')} subtitle={t('capture.subtitle')}>
      {voiceCapture.error ? <Alert severity="error">{voiceCapture.error}</Alert> : null}
      {commitError ? <Alert severity="error">{commitError}</Alert> : null}

      {/* ── 1. Patient selection ── */}
      <Stack spacing={1}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {t('today.dueToday')}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          <Chip
            label={t('capture.newCase')}
            onClick={() => selectCase('')}
            color={caseMode === 'new' ? 'primary' : 'default'}
            variant={caseMode === 'new' ? 'filled' : 'outlined'}
            clickable
          />
          {pickerCases.map((c) => (
            <Chip
              key={c.id}
              label={c.caseToken}
              onClick={() => selectCase(c.id)}
              color={selectedCaseId === c.id ? 'primary' : 'default'}
              variant={selectedCaseId === c.id ? 'filled' : 'outlined'}
              clickable
              title={c.summary}
              sx={dueTodayIds.has(c.id) ? { fontWeight: 700 } : {}}
            />
          ))}
        </Box>
      </Stack>

      {/* ── 2. Visit type ── */}
      <Stack spacing={0.75}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {t('capture.visitType')}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant={visitType === 'primary' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setVisitType('primary')}
            disabled={busy}
          >
            {t('capture.visitPrimary')}
          </Button>
          <Button
            variant={visitType === 'followup' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setVisitType('followup')}
            disabled={busy}
          >
            {t('capture.visitFollowup')}
          </Button>
        </Stack>
      </Stack>

      {/* ── 3. Voice button ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 1.5 }}>
        {status === 'recording' ? (
          <>
            <Box
              className="mic-recording"
              onClick={stopRecording}
              sx={{ width: 112, height: 112, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <MicSvg size={36} />
            </Box>
            <Stack alignItems="center" spacing={0.5}>
              <Typography variant="h6" className="serif-display">{formatElapsed(elapsed)}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {t('capture.tapToStop')}
              </Typography>
            </Stack>
            {liveTranscript ? (
              <Paper sx={{ width: '100%', p: 1.5, backgroundColor: 'rgba(255,255,255,0.85)', maxHeight: 120, overflowY: 'auto' }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', lineHeight: 1.7 }}>
                  {liveTranscript}
                </Typography>
              </Paper>
            ) : null}
          </>
        ) : (status === 'uploading' || status === 'polling') && !draft ? (
          <>
            <CircularProgress size={52} thickness={3} />
            <Typography variant="body2" color="text.secondary">{t('capture.processingAudio')}</Typography>
          </>
        ) : (
          <Stack alignItems="center" spacing={1.25}>
            <Box
              className="mic-idle"
              onClick={() => void startRecording()}
              sx={{ width: 112, height: 112, borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', userSelect: 'none' }}
            >
              <MicSvg size={36} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              {draft ? t('capture.recordAgain') : t('capture.tapToRecord')}
            </Typography>
          </Stack>
        )}
      </Box>

      {/* ── 4. Previous visit month (followup only) ── */}
      {visitType === 'followup' && (
        <TextField
          label={locale === 'ru' ? 'Предыдущий визит' : 'Previous visit'}
          type="month"
          value={prevVisitMonth}
          onChange={(e) => setPrevVisitMonth(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
          disabled={busy}
          sx={{ maxWidth: 220 }}
        />
      )}

      {/* ── 4b. Recording feedback — live confidence indicator ── */}
      {status !== 'recording' && !liveTranscript && !draft && (
        <Paper elevation={0} sx={{ p: 1.5, border: '1px dashed rgba(22,32,36,0.14)', borderRadius: 2, backgroundColor: 'rgba(14,107,116,0.03)' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            {locale === 'ru' ? 'Нажмите на микрофон — запись начнётся сразу. Транскрипт появится здесь.' : 'Tap the mic — recording starts immediately. Transcript will appear here.'}
          </Typography>
        </Paper>
      )}

      {/* ── 5. Next visit date ── */}
      <Stack spacing={0.75}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {t('capture.nextVisit')}
        </Typography>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {dateShortcuts.map((s) => (
            <Chip
              key={s.date}
              label={t(s.labelKey)}
              onClick={() => setDueAt(s.date)}
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
          onChange={(e) => setDueAt(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
          disabled={busy}
        />
      </Stack>

      {/* ── 6. Review — appears once voice draft is ready ── */}
      {draft ? (
        <SectionCard title={t('capture.reviewDraft')} eyebrow={pack.label}>
          <Stack spacing={2}>
            {draft.audioUrl ? (
              <audio controls preload="none" src={buildApiUrl(draft.audioUrl)} style={{ width: '100%', borderRadius: 8 }} />
            ) : null}
            {(liveTranscript || draft.transcript) ? (
              <Paper sx={{ p: 1.75, backgroundColor: 'rgba(255,255,255,0.7)' }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', lineHeight: 1.75 }}>
                  {draft.transcript || liveTranscript}
                </Typography>
              </Paper>
            ) : null}
            <TextField
              label={t('capture.summary')}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              multiline
              minRows={3}
              disabled={busy}
            />
            {pack.fields.map((field) =>
              field.type === 'select' ? (
                <FormControl key={field.key} fullWidth size="small">
                  <InputLabel id={`${field.key}-label`}>{field.label}</InputLabel>
                  <Select
                    labelId={`${field.key}-label`}
                    label={field.label}
                    value={conditionPayload[field.key] || ''}
                    onChange={(e) => setConditionPayload((prev) => ({ ...prev, [field.key]: String(e.target.value) || null }))}
                    disabled={busy}
                  >
                    <MenuItem value="">{t('common.notSet')}</MenuItem>
                    {field.options?.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  key={field.key}
                  label={field.label}
                  size="small"
                  value={conditionPayload[field.key] || ''}
                  onChange={(e) => setConditionPayload((prev) => ({ ...prev, [field.key]: e.target.value || null }))}
                  disabled={busy}
                />
              )
            )}
          </Stack>
        </SectionCard>
      ) : null}

      {/* ── 7. Commit ── */}
      <Button variant="contained" size="large" disabled={!canCommit} onClick={handleCommit}>
        {busy ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : null}
        {t('capture.commitDraft')}
      </Button>
    </WorkspaceShell>
  );
}

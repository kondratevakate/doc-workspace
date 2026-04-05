'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Chip, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { ApiError, buildApiUrl, commitVoiceDraft, createVoiceDraft, getVoiceDraft, listCases } from '@/src/lib/api';
import { getPackUi } from '@/src/lib/packs';
import type { CaseCard, VoiceDraft } from '@/src/lib/types';
import { useI18n } from '@/src/lib/use-i18n';
import { useAuthGuard } from '@/src/lib/use-auth';
import { useAppStore } from '@/src/store/app-store';
import { LoadingState } from './loading-state';
import { SectionCard } from './section-card';
import { WorkspaceShell } from './workspace-shell';

type CaptureMode = 'new' | 'existing';

export function CaptureWorkspace() {
  const { physician, loading } = useAuthGuard();
  const { locale, t } = useI18n();
  const activeConditionKey = useAppStore((state) => state.activeConditionKey);
  const router = useRouter();
  const [draft, setDraft] = useState<VoiceDraft | null>(null);
  const [cases, setCases] = useState<CaseCard[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<number | ''>('');
  const [mode, setMode] = useState<CaptureMode>('new');
  const [summary, setSummary] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [conditionPayload, setConditionPayload] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const pollRef = useRef<number | null>(null);
  const pack = useMemo(() => getPackUi(activeConditionKey, locale), [activeConditionKey, locale]);

  const hydrateDraft = useCallback((nextDraft: VoiceDraft) => {
    setDraft(nextDraft);
    setSummary(nextDraft.summary || '');
    setDueAt(nextDraft.dueAt || '');
    setConditionPayload(nextDraft.conditionPayload || {});
    if (nextDraft.committedCaseId) {
      setMode('existing');
      setSelectedCaseId(nextDraft.committedCaseId);
    }
  }, []);

  useEffect(() => {
    if (!physician) return;
    listCases(activeConditionKey, 20).then(setCases).catch(() => undefined);
  }, [physician, activeConditionKey]);

  useEffect(() => {
    if (!physician) return;
    const draftParam = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('draft');
    if (!draftParam) return;
    const draftId = Number(draftParam);
    if (!Number.isFinite(draftId)) return;
    getVoiceDraft(draftId)
      .then((result) => {
        hydrateDraft(result);
      })
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : t('capture.loadDraftError'));
      });
  }, [physician, hydrateDraft, t]);

  useEffect(() => () => {
    if (pollRef.current) window.clearTimeout(pollRef.current);
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError(t('capture.browserRecordingUnavailable'));
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      stream.getTracks().forEach((track) => track.stop());
      setRecording(false);
      await uploadBlob(blob, recorder.mimeType || 'audio/webm');
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  }, [t]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  async function uploadBlob(blob: Blob, contentType: string) {
    setBusy(true);
    setInfo(t('capture.uploadingVoice'));
    setError(null);
    try {
      const audioBase64 = await blobToBase64(blob);
      const created = await createVoiceDraft({
        conditionKey: activeConditionKey,
        audioBase64,
        contentType,
        languageCode: locale === 'ru' ? 'ru' : 'en'
      });
      hydrateDraft(created);
      setInfo(t('capture.voiceReceived'));
      pollDraft(created.id);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t('capture.uploadVoiceError'));
      setBusy(false);
      setInfo(null);
    }
  }

  function pollDraft(draftId: number) {
    if (pollRef.current) window.clearTimeout(pollRef.current);
    const tick = async () => {
      try {
        const current = await getVoiceDraft(draftId);
        hydrateDraft(current);
        const ready = current.status === 'done' || Boolean(current.transcript);
        if (ready) {
          setBusy(false);
          setInfo(current.reviewState === 'ready' ? t('capture.draftReady') : t('capture.draftNeedsReview'));
          return;
        }
      } catch (pollError) {
        setError(pollError instanceof Error ? pollError.message : t('capture.refreshDraftError'));
        setBusy(false);
        return;
      }
      pollRef.current = window.setTimeout(tick, 1500);
    };
    void tick();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadBlob(file, file.type || 'audio/mp4');
    event.target.value = '';
  }

  async function handleCommit() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const result = await commitVoiceDraft(draft.id, {
        conditionKey: activeConditionKey,
        caseId: mode === 'existing' && selectedCaseId ? Number(selectedCaseId) : undefined,
        createNewCase: mode === 'new',
        summary,
        dueAt,
        conditionPayload
      });
      setInfo(t('capture.caseSaved', { caseToken: result.case.case.caseToken }));
      router.push(`/cases/${result.case.case.id}`);
    } catch (commitError) {
      if (commitError instanceof ApiError && typeof commitError.payload === 'object' && commitError.payload && 'draft' in commitError.payload) {
        const nextDraft = (commitError.payload as { draft?: VoiceDraft }).draft;
        if (nextDraft) hydrateDraft(nextDraft);
      }
      setError(commitError instanceof Error ? commitError.message : t('capture.commitDraftError'));
    } finally {
      setBusy(false);
    }
  }

  if (loading || !physician) return <LoadingState label={t('capture.loading')} />;

  return (
    <WorkspaceShell title={t('capture.title')} subtitle={t('capture.subtitle')}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {info ? <Alert severity="info">{info}</Alert> : null}

      <SectionCard title={t('capture.newNote')} eyebrow={t('capture.voiceCapture')}>
        <Stack spacing={1.5}>
          <Typography color="text.secondary">{t('capture.description')}</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="contained" onClick={recording ? stopRecording : startRecording} disabled={busy}>
              {recording ? t('capture.stopRecording') : t('capture.startRecording')}
            </Button>
            <Button variant="outlined" component="label" disabled={busy}>
              {t('capture.uploadAudio')}
              <input hidden accept="audio/*" type="file" onChange={handleFileChange} />
            </Button>
          </Stack>
          {recording ? <Chip color="secondary" label={t('capture.recordingInProgress')} sx={{ alignSelf: 'flex-start' }} /> : null}
        </Stack>
      </SectionCard>

      {draft ? (
        <SectionCard title={t('common.draftNumber', { id: draft.id })} eyebrow={pack.label}>
          <Stack spacing={2}>
            {draft.audioUrl ? <audio controls preload="none" src={buildApiUrl(draft.audioUrl)} /> : null}
            <Typography color="text.secondary">{draft.transcript || t('capture.transcriptProcessing')}</Typography>
            <TextField label={t('capture.summary')} value={summary} onChange={(event) => setSummary(event.target.value)} multiline minRows={3} />
            <TextField
              label={t('capture.nextFollowupDue')}
              type="date"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <Stack direction="row" spacing={1}>
              <Button variant={mode === 'new' ? 'contained' : 'outlined'} onClick={() => setMode('new')}>
                {t('capture.newCase')}
              </Button>
              <Button variant={mode === 'existing' ? 'contained' : 'outlined'} onClick={() => setMode('existing')}>
                {t('capture.existingCase')}
              </Button>
            </Stack>

            {mode === 'existing' ? (
              <FormControl fullWidth>
                <InputLabel id="case-select-label">{t('capture.attachToCase')}</InputLabel>
                <Select
                  labelId="case-select-label"
                  label={t('capture.attachToCase')}
                  value={selectedCaseId}
                  onChange={(event) => setSelectedCaseId(Number(event.target.value))}
                >
                  {cases.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.caseToken} - {item.summary}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : null}

            {pack.fields.map((field) =>
              field.type === 'select' ? (
                <FormControl key={field.key} fullWidth>
                  <InputLabel id={`${field.key}-label`}>{field.label}</InputLabel>
                  <Select
                    labelId={`${field.key}-label`}
                    label={field.label}
                    value={conditionPayload[field.key] || ''}
                    onChange={(event) => setConditionPayload((current) => ({ ...current, [field.key]: String(event.target.value) || null }))}
                  >
                    <MenuItem value="">{t('common.notSet')}</MenuItem>
                    {field.options?.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  key={field.key}
                  label={field.label}
                  value={conditionPayload[field.key] || ''}
                  onChange={(event) => setConditionPayload((current) => ({ ...current, [field.key]: event.target.value || null }))}
                />
              )
            )}

            <Button variant="contained" size="large" disabled={busy || !draft || !summary.trim() || !dueAt || (mode === 'existing' && !selectedCaseId)} onClick={handleCommit}>
              {t('capture.commitDraft')}
            </Button>
          </Stack>
        </SectionCard>
      ) : null}
    </WorkspaceShell>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
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

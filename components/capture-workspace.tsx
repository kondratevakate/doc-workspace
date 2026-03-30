'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Chip, FormControl, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography } from '@mui/material';
import { ApiError, buildApiUrl, commitVoiceDraft, createVoiceDraft, getVoiceDraft, listCases } from '@/src/lib/api';
import { getPackUi } from '@/src/lib/packs';
import type { CaseCard, VoiceDraft } from '@/src/lib/types';
import { useAuthGuard } from '@/src/lib/use-auth';
import { useAppStore } from '@/src/store/app-store';
import { LoadingState } from './loading-state';
import { SectionCard } from './section-card';
import { WorkspaceShell } from './workspace-shell';

type CaptureMode = 'new' | 'existing';

export function CaptureWorkspace() {
  const { physician, loading } = useAuthGuard();
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
  const pack = useMemo(() => getPackUi(activeConditionKey), [activeConditionKey]);

  const hydrateDraft = useCallback((nextDraft: VoiceDraft) => {
    setDraft(nextDraft);
    setSummary(nextDraft.summary || '');
    setDueAt(nextDraft.dueAt || '');
    setConditionPayload(nextDraft.conditionPayload || {});
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
        if (result.committedCaseId) setMode('existing');
      })
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : 'Could not load draft.');
      });
  }, [physician, hydrateDraft]);

  useEffect(() => () => {
    if (pollRef.current) window.clearTimeout(pollRef.current);
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Recording is not available in this browser. Use the upload fallback.');
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
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  async function uploadBlob(blob: Blob, contentType: string) {
    setBusy(true);
    setInfo('Uploading voice note...');
    setError(null);
    try {
      const audioBase64 = await blobToBase64(blob);
      const created = await createVoiceDraft({
        conditionKey: activeConditionKey,
        audioBase64,
        contentType,
        languageCode: 'en'
      });
      hydrateDraft(created);
      setInfo('Voice note received. Building draft...');
      pollDraft(created.id);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Could not upload voice note.');
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
          setInfo(current.reviewState === 'ready' ? 'Draft ready for review.' : 'Draft needs review before commit.');
          return;
        }
      } catch (pollError) {
        setError(pollError instanceof Error ? pollError.message : 'Could not refresh draft status.');
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
      setInfo(`Case ${result.case.case.caseToken} saved.`);
      router.push(`/cases/${result.case.case.id}`);
    } catch (commitError) {
      if (commitError instanceof ApiError && typeof commitError.payload === 'object' && commitError.payload && 'draft' in commitError.payload) {
        const nextDraft = (commitError.payload as { draft?: VoiceDraft }).draft;
        if (nextDraft) hydrateDraft(nextDraft);
      }
      setError(commitError instanceof Error ? commitError.message : 'Could not commit draft.');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !physician) return <LoadingState label="Loading capture workspace..." />;

  return (
    <WorkspaceShell title="Capture" subtitle="Record directly in the workspace. Messenger transport is deliberately out of scope.">
      {error ? <Alert severity="error">{error}</Alert> : null}
      {info ? <Alert severity="info">{info}</Alert> : null}

      <SectionCard title="New note" eyebrow="Voice capture">
        <Stack spacing={1.5}>
          <Typography color="text.secondary">
            Capture one longitudinal update. The canonical case is created or updated only after review and commit.
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="contained" onClick={recording ? stopRecording : startRecording} disabled={busy}>
              {recording ? 'Stop recording' : 'Start recording'}
            </Button>
            <Button variant="outlined" component="label" disabled={busy}>
              Upload audio
              <input hidden accept="audio/*" type="file" onChange={handleFileChange} />
            </Button>
          </Stack>
          {recording ? <Chip color="secondary" label="Recording in progress" sx={{ alignSelf: 'flex-start' }} /> : null}
        </Stack>
      </SectionCard>

      {draft ? (
        <SectionCard title={`Draft #${draft.id}`} eyebrow={pack.label}>
          <Stack spacing={2}>
            {draft.audioUrl ? <audio controls preload="none" src={buildApiUrl(draft.audioUrl)} /> : null}
            <Typography color="text.secondary">{draft.transcript || 'Transcript is still processing.'}</Typography>
            <TextField label="Summary" value={summary} onChange={(event) => setSummary(event.target.value)} multiline minRows={3} />
            <TextField
              label="Next follow-up due"
              type="date"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <Stack direction="row" spacing={1}>
              <Button variant={mode === 'new' ? 'contained' : 'outlined'} onClick={() => setMode('new')}>
                New case
              </Button>
              <Button variant={mode === 'existing' ? 'contained' : 'outlined'} onClick={() => setMode('existing')}>
                Existing case
              </Button>
            </Stack>

            {mode === 'existing' ? (
              <FormControl fullWidth>
                <InputLabel id="case-select-label">Attach to case</InputLabel>
                <Select
                  labelId="case-select-label"
                  label="Attach to case"
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
                    <MenuItem value="">Not set</MenuItem>
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
              Commit draft
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

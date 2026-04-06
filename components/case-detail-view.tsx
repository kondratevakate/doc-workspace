'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { ApiError, buildApiUrl, getCaseDetail } from '@/src/lib/api';
import { formatPriority, formatTaskType } from '@/src/lib/i18n';
import { formatFieldValue, getPackFieldLabel, getPackUi } from '@/src/lib/packs';
import type { CaseDetail, CaseUpdate } from '@/src/lib/types';
import type { AppLocale } from '@/src/lib/preferences';
import { useI18n } from '@/src/lib/use-i18n';
import { useAuthGuard } from '@/src/lib/use-auth';
import { AVATAR_SHAPE } from '@/src/lib/patient-identity';
import { LoadingState } from './loading-state';
import { SectionCard } from './section-card';
import { WorkspaceShell } from './workspace-shell';

// ── Treatment stage colours (same palette as patient-identity) ───────────────
const STAGE_COLORS: Record<string, { bg: string; dot: string; label: Record<AppLocale, string> }> = {
  naive:             { bg: '#e8f6fb', dot: '#7ec8e3', label: { en: 'No treatment', ru: 'Без лечения' } },
  stable:            { bg: '#e6f7f4', dot: '#0e9e8a', label: { en: 'Stable',        ru: 'Стабильный' } },
  partial_responder: { bg: '#fef9ec', dot: '#f59e0b', label: { en: 'Partial',       ru: 'Частичный' } },
  non_responder:     { bg: '#fdf0f0', dot: '#e05252', label: { en: 'Non-responder', ru: 'Нет ответа' } },
  _default:          { bg: '#f0f2f4', dot: '#8b9aa8', label: { en: 'Unknown',       ru: 'Неизвестно' } },
};

function stageFor(responseStatus: string | null | undefined) {
  return STAGE_COLORS[responseStatus ?? ''] ?? STAGE_COLORS._default;
}

// ── Direction arrow between stages ───────────────────────────────────────────
type Direction = 'better' | 'worse' | 'same';

const STATUS_ORDER: Record<string, number> = {
  non_responder: 0, partial_responder: 1, naive: 2, stable: 3,
};

function transitionDirection(from: string | null | undefined, to: string | null | undefined): Direction {
  const a = STATUS_ORDER[from ?? ''] ?? -1;
  const b = STATUS_ORDER[to ?? ''] ?? -1;
  if (a === -1 || b === -1) return 'same';
  if (b > a) return 'better';
  if (b < a) return 'worse';
  return 'same';
}

const ARROW: Record<Direction, { symbol: string; color: string }> = {
  better: { symbol: '↑', color: '#0e9e8a' },
  worse:  { symbol: '↓', color: '#e05252' },
  same:   { symbol: '→', color: '#8b9aa8' },
};

// ── Medication badge (mirrors patient-identity logic) ────────────────────────
const TREATMENT_PATTERNS: Array<{ re: RegExp; badge: string }> = [
  { re: /fremanezumab|erenumab|galcanezumab|eptinezumab|cgrp/i, badge: '💉' },
  { re: /propranolol|metoprolol|atenolol|bisoprolol|beta.?block/i, badge: '🫀' },
  { re: /topiramate|valproate|valproic|divalproex/i, badge: '⚡' },
  { re: /amitriptyline|nortriptyline|tricycl/i, badge: '🌙' },
  { re: /botox|botulinum|onabotulin/i, badge: '🎯' },
  { re: /riboflavin|magnesium|vitamin|lifestyle|sleep|hygiene/i, badge: '🌿' },
];

function medicationBadge(preventive: string | null | undefined): string {
  if (!preventive) return '∅';
  for (const { re, badge } of TREATMENT_PATTERNS) {
    if (re.test(preventive)) return badge;
  }
  return '💊';
}

// ── Format date nicely ────────────────────────────────────────────────────────
function formatDate(iso: string, locale: AppLocale): string {
  try {
    return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

// ── TreatmentTimeline ─────────────────────────────────────────────────────────
/**
 * Horizontal timeline of clinical episodes.
 * Each node = one committed voice update.
 * Color = responseStatus at that update.
 * Badge = medication class.
 * Arrow between nodes = direction of change.
 *
 * Based on: Sankey/alluvial approach adapted to single-patient view.
 * Research: PMC 9232856, PubMed 32570378 (Sankey for clinical trajectories)
 */
function TreatmentTimeline({
  updates,
  currentStatus,
  currentPreventive,
  locale,
}: {
  updates: CaseUpdate[];
  currentStatus: string | null;
  currentPreventive: string | null;
  locale: AppLocale;
}) {
  if (!updates.length) return null;

  // Build episode list from updates (oldest first)
  const episodes = [...updates].reverse().map((u) => {
    const extract = u.extract as Record<string, unknown>;
    const rs = (extract?.responseStatus as string | null) ?? currentStatus;
    const med = (extract?.currentPreventive as string | null) ?? currentPreventive;
    return { update: u, responseStatus: rs, medication: med };
  });

  const eyebrow = locale === 'ru' ? 'ТРАЕКТОРИЯ ЛЕЧЕНИЯ' : 'TREATMENT TRAJECTORY';
  const title   = locale === 'ru' ? 'История эпизодов' : 'Episode history';

  return (
    <SectionCard title={title} eyebrow={eyebrow}>
      <Box sx={{ overflowX: 'auto', pb: 1 }}>
        <Stack direction="row" spacing={0} alignItems="center" sx={{ minWidth: 'max-content' }}>
          {episodes.map((ep, idx) => {
            const stage = stageFor(ep.responseStatus);
            const badge = medicationBadge(ep.medication);
            const nextEp = episodes[idx + 1];
            const dir = nextEp
              ? transitionDirection(ep.responseStatus, nextEp.responseStatus)
              : null;
            const arrow = dir ? ARROW[dir] : null;

            return (
              <Stack key={ep.update.id} direction="row" alignItems="center" spacing={0}>
                {/* Episode node */}
                <Stack alignItems="center" spacing={0.5} sx={{ minWidth: 84 }}>
                  {/* Date */}
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.63rem', whiteSpace: 'nowrap' }}>
                    {formatDate(ep.update.createdAt, locale)}
                  </Typography>

                  {/* Coloured pill with medication badge */}
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: stage.dot,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.15rem',
                        boxShadow: `0 2px 8px ${stage.dot}66`,
                      }}
                    >
                      <span style={{ lineHeight: 1 }}>{badge}</span>
                    </Box>
                  </Box>

                  {/* Stage label */}
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.62rem',
                      textAlign: 'center',
                      color: stage.dot,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {stage.label[locale]}
                  </Typography>
                </Stack>

                {/* Arrow connector */}
                {arrow ? (
                  <Stack alignItems="center" sx={{ px: 0.5 }}>
                    {/* Horizontal line */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                      <Box sx={{ width: 20, height: 1.5, backgroundColor: 'rgba(22,32,36,0.12)' }} />
                      <Typography sx={{ fontSize: '0.9rem', color: arrow.color, lineHeight: 1, fontWeight: 700 }}>
                        {arrow.symbol}
                      </Typography>
                      <Box sx={{ width: 20, height: 1.5, backgroundColor: 'rgba(22,32,36,0.12)' }} />
                    </Box>
                  </Stack>
                ) : null}
              </Stack>
            );
          })}

          {/* "Current" terminal node */}
          {(() => {
            const lastEp = episodes[episodes.length - 1];
            const dir = lastEp
              ? transitionDirection(lastEp.responseStatus, currentStatus)
              : null;
            const arrow = dir && dir !== 'same' ? ARROW[dir] : null;
            const stage = stageFor(currentStatus);
            const badge = medicationBadge(currentPreventive);

            return (
              <Stack direction="row" alignItems="center" spacing={0}>
                {arrow ? (
                  <Stack alignItems="center" sx={{ px: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                      <Box sx={{ width: 20, height: 1.5, backgroundColor: 'rgba(22,32,36,0.12)' }} />
                      <Typography sx={{ fontSize: '0.9rem', color: arrow.color, lineHeight: 1, fontWeight: 700 }}>
                        {arrow.symbol}
                      </Typography>
                      <Box sx={{ width: 20, height: 1.5, backgroundColor: 'rgba(22,32,36,0.12)' }} />
                    </Box>
                  </Stack>
                ) : (
                  <Box sx={{ width: 32, height: 1.5, backgroundColor: 'rgba(22,32,36,0.12)', mx: 0.5 }} />
                )}

                <Stack alignItems="center" spacing={0.5} sx={{ minWidth: 84 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.63rem' }}>
                    {locale === 'ru' ? 'Сейчас' : 'Now'}
                  </Typography>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      backgroundColor: stage.dot,
                      border: `3px solid ${stage.dot}`,
                      outline: `3px solid ${stage.bg}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      boxShadow: `0 4px 16px ${stage.dot}55`,
                    }}
                  >
                    <span style={{ lineHeight: 1 }}>{badge}</span>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ fontSize: '0.62rem', textAlign: 'center', color: stage.dot, fontWeight: 700, whiteSpace: 'nowrap' }}
                  >
                    {stage.label[locale]}
                  </Typography>
                </Stack>
              </Stack>
            );
          })()}
        </Stack>
      </Box>
    </SectionCard>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function CaseDetailView({ caseId }: { caseId: number }) {
  const { physician, loading } = useAuthGuard();
  const { locale, t } = useI18n();
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pack = useMemo(() => (detail ? getPackUi(detail.case.conditionKey, locale) : null), [detail, locale]);

  useEffect(() => {
    if (!physician) return;
    let active = true;
    setError(null);
    getCaseDetail(caseId)
      .then((result) => { if (active) setDetail(result); })
      .catch((fetchError) => {
        if (!active) return;
        setError(fetchError instanceof ApiError ? fetchError.message : t('case.loadError'));
      });
    return () => { active = false; };
  }, [physician, caseId, t]);

  if (loading || !physician) return <LoadingState label={t('case.loading')} />;

  const currentStatus  = detail?.case.conditionPayload?.responseStatus as string | null ?? null;
  const currentMed     = detail?.case.conditionPayload?.currentPreventive as string | null ?? null;
  const sex            = detail?.case.sex ?? '?';
  const sexKey         = sex === 'F' || sex === 'M' ? sex : '?';
  const avatarShape    = AVATAR_SHAPE[sexKey];

  return (
    <WorkspaceShell title={detail?.case.caseToken || t('case.titleFallback')} subtitle={t('case.subtitle')}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {!detail ? (
        <LoadingState label={t('case.preparing')} />
      ) : (
        <>
          {/* ── Case header ── */}
          <SectionCard title={detail.case.summary} eyebrow={pack?.label || detail.case.conditionKey}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              {/* Large avatar */}
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  flexShrink: 0,
                  borderRadius: avatarShape,
                  backgroundColor: stageFor(currentStatus).dot,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                  boxShadow: `0 4px 16px ${stageFor(currentStatus).dot}55`,
                }}
              >
                {medicationBadge(currentMed)}
              </Box>

              <Stack spacing={1} flex={1}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {detail.case.sex ? <Chip label={detail.case.sex} size="small" /> : null}
                  {detail.case.ageBand ? <Chip label={detail.case.ageBand} size="small" /> : null}
                  {detail.case.nextFollowupDueAt ? (
                    <Chip label={t('common.due', { date: detail.case.nextFollowupDueAt })} size="small" color="primary" />
                  ) : null}
                </Stack>

                {Object.entries(detail.case.conditionPayload).map(([key, value]) =>
                  value ? (
                    <Typography key={key} variant="body2" color="text.secondary">
                      {getPackFieldLabel(detail.case.conditionKey, key, locale)}: <strong>{formatFieldValue(value, locale, detail.case.conditionKey)}</strong>
                    </Typography>
                  ) : null
                )}
              </Stack>
            </Stack>
          </SectionCard>

          {/* ── Treatment trajectory timeline ── */}
          <TreatmentTimeline
            updates={detail.updates}
            currentStatus={currentStatus}
            currentPreventive={currentMed}
            locale={locale}
          />

          {/* ── Open tasks ── */}
          <SectionCard title={t('case.openTasks')} eyebrow={t('case.followUp')}>
            <Stack spacing={1}>
              {detail.tasks.length ? (
                detail.tasks.map((task) => (
                  <Typography key={task.id} variant="body2" color="text.secondary">
                    {t('case.taskLine', {
                      taskType: formatTaskType(locale, task.taskType),
                      dueAt: task.dueAt,
                      priority: formatPriority(locale, task.priority),
                    })}
                  </Typography>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">{t('case.noOpenTasks')}</Typography>
              )}
            </Stack>
          </SectionCard>

          {/* ── Voice updates (evidence trail) ── */}
          <SectionCard title={t('case.updates')} eyebrow={t('case.evidenceTrail')}>
            <Stack spacing={1.25}>
              {detail.updates.map((update) => (
                <Accordion
                  key={update.id}
                  disableGutters
                  elevation={0}
                  sx={{ border: '1px solid rgba(22,32,36,0.08)', borderRadius: '16px !important' }}
                >
                  <AccordionSummary>
                    <Stack spacing={0.5}>
                      <Typography sx={{ fontWeight: 700 }}>{update.authoredSummary}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(update.createdAt, locale)}
                      </Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={1.25}>
                      <Typography variant="body2" color="text.secondary">
                        {update.transcript || t('case.transcriptUnavailable')}
                      </Typography>
                      {update.audioUrl ? (
                        <audio controls preload="none" src={buildApiUrl(update.audioUrl)} style={{ width: '100%', borderRadius: 8 }} />
                      ) : null}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </SectionCard>

          <Button component={Link} href="/capture" variant="contained">
            {t('case.addAnotherUpdate')}
          </Button>
        </>
      )}
    </WorkspaceShell>
  );
}

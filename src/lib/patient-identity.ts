import type { CaseCard } from '@/src/lib/types';
import type { AppLocale } from '@/src/lib/preferences';

// ── Animal matrix ─────────────────────────────────────────────────────────────
// Keyed by [sex: F|M|?][ageBand: young|mid|senior]
// Based on Philips Avatar principle: shape = stable identity, never changes with treatment

type AgeTier = 'young' | 'mid' | 'senior';

const ANIMAL_MATRIX: Record<string, Record<AgeTier, string[]>> = {
  F: {
    young:  ['🦊', '🐱'], // 20-29
    mid:    ['🦉', '🦋'], // 30-39
    senior: ['🦅', '🦚'], // 40+
  },
  M: {
    young:  ['🐺', '🐬'], // 20-29
    mid:    ['🐻', '🦁'], // 30-39
    senior: ['🐢', '🦬'], // 40+
  },
  '?': {
    young:  ['🌱', '🌿'],
    mid:    ['🐍', '🦎'],
    senior: ['🦊', '🐦'],
  },
};

const ANIMAL_NAMES: Record<string, Record<AppLocale, string>> = {
  '🦊': { en: 'Fox',      ru: 'Лиса' },
  '🐱': { en: 'Cat',      ru: 'Кошка' },
  '🦉': { en: 'Owl',      ru: 'Сова' },
  '🦋': { en: 'Butterfly', ru: 'Бабочка' },
  '🦅': { en: 'Eagle',    ru: 'Орёл' },
  '🦚': { en: 'Peacock',  ru: 'Павлин' },
  '🐺': { en: 'Wolf',     ru: 'Волк' },
  '🐬': { en: 'Dolphin',  ru: 'Дельфин' },
  '🐻': { en: 'Bear',     ru: 'Медведь' },
  '🦁': { en: 'Lion',     ru: 'Лев' },
  '🐢': { en: 'Tortoise', ru: 'Черепаха' },
  '🦬': { en: 'Bison',    ru: 'Бизон' },
  '🌱': { en: 'Seedling', ru: 'Росток' },
  '🌿': { en: 'Herb',     ru: 'Трава' },
  '🐍': { en: 'Snake',    ru: 'Змея' },
  '🦎': { en: 'Lizard',   ru: 'Ящерица' },
  '🐦': { en: 'Bird',     ru: 'Птица' },
};

// ── Color by responseStatus (max 5 colors per research guidelines) ────────────
// Principle: color = current state (changes with treatment response)

const RESPONSE_COLORS: Record<string, { bg: string; text: string }> = {
  naive:             { bg: '#7ec8e3', text: '#0a3d52' },
  stable:            { bg: '#0e9e8a', text: '#ffffff' },
  partial_responder: { bg: '#f59e0b', text: '#422006' },
  non_responder:     { bg: '#e05252', text: '#ffffff' },
  _default:          { bg: '#8b9aa8', text: '#ffffff' },
};

// ── Treatment badge (changes when medication changes, animal stays) ───────────
// Small badge overlaid on avatar — separate visual channel

const TREATMENT_BADGES: Array<{ pattern: RegExp; badge: string }> = [
  { pattern: /fremanezumab|erenumab|galcanezumab|eptinezumab|cgrp/i, badge: '💉' },
  { pattern: /propranolol|metoprolol|atenolol|bisoprolol|beta.?block/i, badge: '🫀' },
  { pattern: /topiramate|valproate|valproic|divalproex/i,              badge: '⚡' },
  { pattern: /amitriptyline|nortriptyline|tricycl/i,                   badge: '🌙' },
  { pattern: /botox|botulinum|onabotulin/i,                            badge: '🎯' },
  { pattern: /riboflavin|magnesium|vitamin|lifestyle|sleep|hygiene/i,  badge: '🌿' },
];

// ── Border shape by sex (Philips: shape encodes stable identity) ──────────────
export const AVATAR_SHAPE: Record<string, string> = {
  F: '50%',                  // circle
  M: '10px',                 // rounded square
  '?': '4px 20px 4px 20px',  // asymmetric — clearly "unknown"
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAgeTier(ageBand: string | null, age: number | null): AgeTier {
  const raw = ageBand || '';
  const num = age ?? parseInt(raw, 10);
  if (!isNaN(num)) {
    if (num < 30) return 'young';
    if (num < 40) return 'mid';
    return 'senior';
  }
  if (raw.startsWith('2')) return 'young';
  if (raw.startsWith('3')) return 'mid';
  return 'senior';
}

/** Deterministic hash of a string → small integer */
function strHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getAnimal(c: CaseCard): string {
  const sex = c.sex === 'F' || c.sex === 'M' ? c.sex : '?';
  const tier = getAgeTier(c.ageBand, c.age);
  const options = ANIMAL_MATRIX[sex][tier];
  // Use caseToken hash to pick deterministically between options
  const idx = strHash(c.caseToken) % options.length;
  return options[idx];
}

function getTreatmentBadge(preventive: string | null | undefined): string {
  if (!preventive) return '∅';
  for (const { pattern, badge } of TREATMENT_BADGES) {
    if (pattern.test(preventive)) return badge;
  }
  return '💊'; // generic medication fallback
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface PatientIdentity {
  animal: string;          // emoji, e.g. '🦊'
  animalName: string;      // localized, e.g. 'Лиса'
  badge: string;           // treatment emoji, e.g. '💉'
  bgColor: string;         // hex, based on responseStatus
  textColor: string;       // hex, white or dark
  borderRadius: string;    // CSS borderRadius, based on sex
}

export function getPatientIdentity(c: CaseCard, locale: AppLocale = 'en'): PatientIdentity {
  const responseStatus = (c.conditionPayload?.responseStatus as string | null | undefined) ?? null;
  const currentPreventive = (c.conditionPayload?.currentPreventive as string | null | undefined) ?? null;

  const animal = getAnimal(c);
  const animalName = ANIMAL_NAMES[animal]?.[locale] ?? animal;
  const badge = getTreatmentBadge(currentPreventive);
  const { bg: bgColor, text: textColor } = RESPONSE_COLORS[responseStatus ?? ''] ?? RESPONSE_COLORS._default;
  const sex = c.sex === 'F' || c.sex === 'M' ? c.sex : '?';
  const borderRadius = AVATAR_SHAPE[sex];

  return { animal, animalName, badge, bgColor, textColor, borderRadius };
}

/** Localized responseStatus label */
export function getResponseLabel(responseStatus: string | null | undefined, locale: AppLocale): string {
  const labels: Record<string, Record<AppLocale, string>> = {
    naive:             { en: 'No treatment',    ru: 'Без лечения' },
    stable:            { en: 'Stable',          ru: 'Стабильный' },
    partial_responder: { en: 'Partial response', ru: 'Частичный ответ' },
    non_responder:     { en: 'Non-responder',   ru: 'Нет ответа' },
  };
  return labels[responseStatus ?? '']?.[locale] ?? (responseStatus ?? '—');
}

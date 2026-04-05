import { getFallbackFieldValueLabel } from '@/src/lib/i18n';
import type { AppLocale } from '@/src/lib/preferences';

interface LocalizedText {
  en: string;
  ru: string;
}

export interface PackFieldOption {
  value: string;
  label: string;
}

interface PackFieldOptionDefinition {
  value: string;
  label: LocalizedText;
}

export interface PackField {
  key: string;
  label: string;
  type: 'select' | 'text';
  options?: PackFieldOption[];
}

interface PackFieldDefinition {
  key: string;
  label: LocalizedText;
  type: 'select' | 'text';
  options?: PackFieldOptionDefinition[];
}

export interface PackUi {
  conditionKey: string;
  label: string;
  shortLabel: string;
  heroTitle: string;
  heroSubtitle: string;
  cohortDescription: string;
  fields: PackField[];
}

interface PackDefinition {
  conditionKey: string;
  label: LocalizedText;
  shortLabel: LocalizedText;
  heroTitle: LocalizedText;
  heroSubtitle: LocalizedText;
  cohortDescription: LocalizedText;
  fields: PackFieldDefinition[];
}

const migrainePack: PackDefinition = {
  conditionKey: 'migraine',
  label: {
    en: 'Migraine',
    ru: 'Мигрень'
  },
  shortLabel: {
    en: 'Migraine',
    ru: 'Мигрень'
  },
  heroTitle: {
    en: 'Migraine follow-up workspace',
    ru: 'Рабочее место для follow-up по мигрени'
  },
  heroSubtitle: {
    en: 'Capture, review, and organize longitudinal follow-up without exposing full patient identity.',
    ru: 'Записывай, разбирай и организуй продольное наблюдение без раскрытия полной идентичности пациента.'
  },
  cohortDescription: {
    en: 'Track non-responders, overdue follow-ups, and cases with missing next steps.',
    ru: 'Отслеживай кейсы без ответа, просроченные follow-up и случаи без следующего шага.'
  },
  fields: [
    {
      key: 'migraineBucket',
      label: {
        en: 'Migraine bucket',
        ru: 'Категория мигрени'
      },
      type: 'select',
      options: [
        { value: 'episodic_migraine', label: { en: 'Episodic migraine', ru: 'Эпизодическая мигрень' } },
        { value: 'chronic_migraine', label: { en: 'Chronic migraine', ru: 'Хроническая мигрень' } },
        { value: 'unclear_headache', label: { en: 'Unclear headache', ru: 'Неясная головная боль' } }
      ]
    },
    {
      key: 'attackFrequencyBand',
      label: {
        en: 'Attack frequency',
        ru: 'Частота приступов'
      },
      type: 'select',
      options: [
        { value: '1-3_per_month', label: { en: '1-3 per month', ru: '1-3 в месяц' } },
        { value: '4-7_per_month', label: { en: '4-7 per month', ru: '4-7 в месяц' } },
        { value: '8-14_per_month', label: { en: '8-14 per month', ru: '8-14 в месяц' } },
        { value: '15+_per_month', label: { en: '15+ per month', ru: '15+ в месяц' } }
      ]
    },
    {
      key: 'currentPreventive',
      label: {
        en: 'Current preventive',
        ru: 'Текущая профилактика'
      },
      type: 'text'
    },
    {
      key: 'responseStatus',
      label: {
        en: 'Response status',
        ru: 'Статус ответа'
      },
      type: 'select',
      options: [
        { value: 'naive', label: { en: 'Naive', ru: 'Наивный' } },
        { value: 'stable', label: { en: 'Stable', ru: 'Стабильный' } },
        { value: 'partial_responder', label: { en: 'Partial responder', ru: 'Частичный ответ' } },
        { value: 'non_responder', label: { en: 'Non-responder', ru: 'Нет ответа' } }
      ]
    },
    {
      key: 'nextStep',
      label: {
        en: 'Next step',
        ru: 'Следующий шаг'
      },
      type: 'text'
    }
  ]
};

const packs = new Map([[migrainePack.conditionKey, migrainePack]]);

export function getPackUi(conditionKey: string, locale: AppLocale = 'en'): PackUi {
  const pack = packs.get(conditionKey);
  if (!pack) throw new Error(`Unsupported condition pack: ${conditionKey}`);

  return {
    conditionKey: pack.conditionKey,
    label: pack.label[locale],
    shortLabel: pack.shortLabel[locale],
    heroTitle: pack.heroTitle[locale],
    heroSubtitle: pack.heroSubtitle[locale],
    cohortDescription: pack.cohortDescription[locale],
    fields: pack.fields.map((field) => ({
      key: field.key,
      label: field.label[locale],
      type: field.type,
      options: field.options?.map((option) => ({
        value: option.value,
        label: option.label[locale]
      }))
    }))
  };
}

export function enabledPackUis(locale: AppLocale = 'en'): PackUi[] {
  return [...packs.values()].map((pack) => getPackUi(pack.conditionKey, locale));
}

export function getPackFieldLabel(conditionKey: string, fieldKey: string, locale: AppLocale = 'en'): string {
  const pack = packs.get(conditionKey);
  const field = pack?.fields.find((item) => item.key === fieldKey);
  return field ? field.label[locale] : fieldKey;
}

export function formatFieldValue(value: string | number | null | undefined, locale: AppLocale = 'en', conditionKey?: string): string {
  if (value === null || value === undefined || value === '') {
    return getFallbackFieldValueLabel(locale, value);
  }

  const packsToSearch: PackDefinition[] = conditionKey
    ? [packs.get(conditionKey)].filter((pack): pack is PackDefinition => Boolean(pack))
    : [...packs.values()];
  for (const pack of packsToSearch) {
    for (const field of pack.fields) {
      const option = field.options?.find((item) => item.value === value);
      if (option) {
        return option.label[locale];
      }
    }
  }

  return getFallbackFieldValueLabel(locale, value);
}

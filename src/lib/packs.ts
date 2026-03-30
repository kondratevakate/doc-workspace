export interface PackFieldOption {
  value: string;
  label: string;
}

export interface PackField {
  key: string;
  label: string;
  type: 'select' | 'text';
  options?: PackFieldOption[];
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

const migrainePack: PackUi = {
  conditionKey: 'migraine',
  label: 'Migraine',
  shortLabel: 'Migraine',
  heroTitle: 'Migraine follow-up workspace',
  heroSubtitle: 'Capture, review, and organize longitudinal follow-up without exposing full patient identity.',
  cohortDescription: 'Track non-responders, overdue follow-ups, and cases with missing next steps.',
  fields: [
    {
      key: 'migraineBucket',
      label: 'Migraine bucket',
      type: 'select',
      options: [
        { value: 'episodic_migraine', label: 'Episodic migraine' },
        { value: 'chronic_migraine', label: 'Chronic migraine' },
        { value: 'unclear_headache', label: 'Unclear headache' }
      ]
    },
    {
      key: 'attackFrequencyBand',
      label: 'Attack frequency',
      type: 'select',
      options: [
        { value: '1-3_per_month', label: '1-3 per month' },
        { value: '4-7_per_month', label: '4-7 per month' },
        { value: '8-14_per_month', label: '8-14 per month' },
        { value: '15+_per_month', label: '15+ per month' }
      ]
    },
    {
      key: 'currentPreventive',
      label: 'Current preventive',
      type: 'text'
    },
    {
      key: 'responseStatus',
      label: 'Response status',
      type: 'select',
      options: [
        { value: 'naive', label: 'Naive' },
        { value: 'stable', label: 'Stable' },
        { value: 'partial_responder', label: 'Partial responder' },
        { value: 'non_responder', label: 'Non-responder' }
      ]
    },
    {
      key: 'nextStep',
      label: 'Next step',
      type: 'text'
    }
  ]
};

const packs = new Map([[migrainePack.conditionKey, migrainePack]]);

export function getPackUi(conditionKey: string): PackUi {
  const pack = packs.get(conditionKey);
  if (!pack) throw new Error(`Unsupported condition pack: ${conditionKey}`);
  return pack;
}

export function enabledPackUis(): PackUi[] {
  return [...packs.values()];
}

export function formatFieldValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'Not set';
  return String(value).replaceAll('_', ' ');
}

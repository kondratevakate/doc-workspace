export const DEMO_MODE_ENABLED = process.env.NEXT_PUBLIC_DEMO_MODE === '1';

export function isDemoModeEnabled(): boolean {
  return DEMO_MODE_ENABLED;
}

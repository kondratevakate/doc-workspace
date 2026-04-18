import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/src/lib/preferences', () => ({
  isDemoModeEnabled: vi.fn(),
}));

import { isDemoModeEnabled } from '@/src/lib/preferences';
import { track } from '@/src/lib/track';

const mockIsDemoMode = isDemoModeEnabled as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('{}', { status: 202 }))));
});

describe('track()', () => {
  it('drops event silently in demo mode — fetch is never called', () => {
    mockIsDemoMode.mockReturnValue(true);
    track('recording_started');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fires fetch in non-demo mode with correct URL and event type', async () => {
    mockIsDemoMode.mockReturnValue(false);
    track('recording_started', { conditionKey: 'migraine' });
    // fetch is fire-and-forget; give microtask queue a tick
    await Promise.resolve();
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/events');
    expect(JSON.parse(init.body as string)).toMatchObject({ eventType: 'recording_started' });
  });

  it('never throws when fetch rejects (network error)', async () => {
    mockIsDemoMode.mockReturnValue(false);
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));
    expect(() => track('visit_committed')).not.toThrow();
    // let the rejection propagate through microtasks — must not produce unhandled rejection
    await new Promise((r) => setTimeout(r, 10));
  });

  it('never throws when fetch returns 500', async () => {
    mockIsDemoMode.mockReturnValue(false);
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('error', { status: 500 }))));
    expect(() => track('ping_called')).not.toThrow();
    await Promise.resolve();
  });
});

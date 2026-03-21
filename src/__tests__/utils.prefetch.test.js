import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prefetchRoute } from '@/lib/utils';
import { getCachedSlotSnapshot } from '@/lib/slots';

describe('utils: prefetchRoute', () => {
  const originalRIC = window.requestIdleCallback;
  let timeoutSpy;

  beforeEach(() => {
    timeoutSpy = vi.spyOn(global, 'setTimeout');
  });

  afterEach(() => {
    timeoutSpy.mockRestore();
    window.requestIdleCallback = originalRIC;
  });

  it('uses requestIdleCallback when available', () => {
    const cbSpy = vi.fn((cb) => cb());
    // @ts-ignore
    window.requestIdleCallback = cbSpy;
    expect(() => prefetchRoute('/login')).not.toThrow();
    expect(cbSpy).toHaveBeenCalled();
  });

  it('falls back to setTimeout when requestIdleCallback missing', () => {
    // @ts-ignore
    delete window.requestIdleCallback;
    expect(() => prefetchRoute('/leaderboards')).not.toThrow();
    expect(timeoutSpy).toHaveBeenCalled();
  });

  it('is no-op for unknown routes', () => {
    expect(() => prefetchRoute('/not-a-route')).not.toThrow();
  });
});

describe('slots: cached snapshots', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('returns null when snapshot missing or expired', () => {
    expect(getCachedSlotSnapshot('gk')).toBeNull();
    sessionStorage.setItem('qd_slot_snapshot_v1', JSON.stringify({
      gk: {
        ts: Date.now() - 120_000,
        value: { slots: [{ slotId: '1' }], mode: 'slots', auto: true },
      },
    }));
    expect(getCachedSlotSnapshot('gk')).toBeNull();
  });

  it('returns a fresh cached snapshot', () => {
    const snapshot = { slots: [{ slotId: '1' }], mode: 'slots', auto: true };
    sessionStorage.setItem('qd_slot_snapshot_v1', JSON.stringify({
      opinion: {
        ts: Date.now(),
        value: snapshot,
      },
    }));
    expect(getCachedSlotSnapshot('opinion')).toEqual(snapshot);
  });
});

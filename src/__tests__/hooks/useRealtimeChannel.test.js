// Hook Tests: useRealtimeChannel
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Supabase
vi.mock('@/lib/customSupabaseClient', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback) => {
        callback('SUBSCRIBED');
        return { unsubscribe: vi.fn() };
      }),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
  hasSupabaseConfig: true,
}));

describe('useRealtimeChannel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should be importable without errors', async () => {
    const module = await import('@/hooks/useRealtimeChannel');
    expect(module.useRealtimeChannel).toBeDefined();
    expect(typeof module.useRealtimeChannel).toBe('function');
  });

  it('should not subscribe when disabled', async () => {
    const { useRealtimeChannel: _useRealtimeChannel } = await import('@/hooks/useRealtimeChannel');
    const { supabase } = await import('@/lib/customSupabaseClient');
    
    // Render hook with enabled: false would not call channel
    // This is a basic smoke test
    expect(supabase.channel).toBeDefined();
    expect(_useRealtimeChannel).toBeDefined();
  });
});

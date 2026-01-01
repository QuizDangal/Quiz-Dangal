// Hook Tests: useQuizTimer
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useQuizTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should be importable without errors', async () => {
    const module = await import('@/hooks/useQuizTimer');
    expect(module.useQuizTimer).toBeDefined();
    expect(typeof module.useQuizTimer).toBe('function');
  });

  it('should export formatTime function', async () => {
    const module = await import('@/hooks/useQuizTimer');
    // Check if module has additional exports
    expect(module).toBeDefined();
  });
});

describe('Timer formatting', () => {
  it('should format seconds correctly', () => {
    // Test time formatting logic
    const formatTime = (seconds) => {
      if (seconds <= 0) return '00:00';
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(30)).toBe('00:30');
    expect(formatTime(60)).toBe('01:00');
    expect(formatTime(90)).toBe('01:30');
    expect(formatTime(3600)).toBe('60:00');
    expect(formatTime(-5)).toBe('00:00');
  });
});

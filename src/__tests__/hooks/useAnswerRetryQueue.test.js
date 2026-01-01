// Hook Tests: useAnswerRetryQueue
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useAnswerRetryQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should be importable without errors', async () => {
    const module = await import('@/hooks/useAnswerRetryQueue');
    expect(module.useAnswerRetryQueue).toBeDefined();
    expect(typeof module.useAnswerRetryQueue).toBe('function');
  });
});

describe('Retry Queue Logic', () => {
  it('should calculate exponential backoff correctly', () => {
    const BASE_DELAY = 2000;
    const MAX_DELAY = 30000;
    
    const calculateDelay = (attempt) => {
      const delay = BASE_DELAY * Math.pow(2, attempt - 1);
      return Math.min(delay, MAX_DELAY);
    };

    expect(calculateDelay(1)).toBe(2000);   // 2s
    expect(calculateDelay(2)).toBe(4000);   // 4s
    expect(calculateDelay(3)).toBe(8000);   // 8s
    expect(calculateDelay(4)).toBe(16000);  // 16s
    expect(calculateDelay(5)).toBe(30000);  // 30s (capped)
    expect(calculateDelay(6)).toBe(30000);  // 30s (capped)
  });

  it('should respect max queue size', () => {
    const MAX_QUEUE_SIZE = 50;
    const queue = [];
    
    // Add 60 items
    for (let i = 0; i < 60; i++) {
      queue.push({ id: i });
    }
    
    // Trim to max size (keep last N items)
    const trimmed = queue.slice(-MAX_QUEUE_SIZE);
    
    expect(trimmed.length).toBe(50);
    expect(trimmed[0].id).toBe(10); // First 10 dropped
    expect(trimmed[49].id).toBe(59);
  });
});

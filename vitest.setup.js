// Vitest setup file for global test configuration
import { afterEach, vi } from 'vitest';

// Clean up env stubs after each test
afterEach(() => {
  vi.unstubAllEnvs();
});

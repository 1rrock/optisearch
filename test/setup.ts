import { afterEach, vi } from "vitest";

const initialEnv = { ...process.env };

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();

  for (const key of Object.keys(process.env)) {
    if (!(key in initialEnv)) {
      delete process.env[key];
    }
  }

  for (const [key, value] of Object.entries(initialEnv)) {
    process.env[key] = value;
  }
});

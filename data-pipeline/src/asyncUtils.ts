/** Resolves after `ms` milliseconds, for pacing retries against rate-limited APIs. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

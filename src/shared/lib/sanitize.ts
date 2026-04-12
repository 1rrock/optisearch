/**
 * Strips control characters and truncates the input for safe prompt injection.
 */
export function sanitizeForPrompt(input: string, maxLen = 100): string {
  return input.replace(/[\x00-\x1f\x7f]/g, "").slice(0, maxLen);
}

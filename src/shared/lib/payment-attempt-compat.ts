const PAYMENT_ATTEMPTS_PATTERNS = [
  "Could not find the table 'public.payment_attempts' in the schema cache",
  'relation "payment_attempts" does not exist',
  'relation "public.payment_attempts" does not exist',
];

export function isPaymentAttemptsMissingError(
  error: { message?: string } | string | null | undefined
): boolean {
  const message = typeof error === "string" ? error : error?.message;
  if (!message) return false;

  return PAYMENT_ATTEMPTS_PATTERNS.some((pattern) => message.includes(pattern));
}

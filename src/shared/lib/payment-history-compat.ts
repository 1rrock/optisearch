const PAYMENT_HISTORY_COLUMN_PATTERNS = (column: string) => [
  `column payment_history.${column} does not exist`,
  `column \"payment_history\".\"${column}\" does not exist`,
  `column \"${column}\" does not exist`,
  `Could not find the '${column}' column of 'payment_history'`,
  `Could not find the '${column}' column of 'payment_history' in the schema cache`,
];

export function isPaymentHistoryColumnMissingError(
  error: { message?: string } | string | null | undefined,
  columns: string[]
): boolean {
  const message = typeof error === "string" ? error : error?.message;
  if (!message) return false;

  return columns.some((column) =>
    PAYMENT_HISTORY_COLUMN_PATTERNS(column).some((pattern) => message.includes(pattern))
  );
}

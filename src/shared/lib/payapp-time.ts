const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function getKstDateString(base: Date | string | null = null): string {
  const source =
    typeof base === "string" ? new Date(base) : base instanceof Date ? new Date(base.getTime()) : new Date();
  const kst = new Date(source.getTime() + KST_OFFSET_MS);
  return kst.toISOString().slice(0, 10);
}

export function addDaysToKstDate(base: Date | string | null, days: number): string {
  const source =
    typeof base === "string" ? new Date(base) : base instanceof Date ? new Date(base.getTime()) : new Date();
  const kst = new Date(source.getTime() + KST_OFFSET_MS);
  kst.setUTCDate(kst.getUTCDate() + days);
  return kst.toISOString().slice(0, 10);
}

const PAYAPP_DATETIME_RE =
  /^(\d{4})[-./]?(\d{2})[-./]?(\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/;

export function parsePayAppDateTime(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(PAYAPP_DATETIME_RE);
  if (!match) return null;

  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`;
}

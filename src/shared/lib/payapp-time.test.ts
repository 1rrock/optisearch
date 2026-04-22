import { describe, expect, it } from "vitest";
import { addDaysToKstDate, getKstDateString, parsePayAppDateTime } from "@/shared/lib/payapp-time";

describe("payapp-time", () => {
  it("handles KST boundary date handling consistently", () => {
    expect(getKstDateString("2026-04-21T15:30:00.000Z")).toBe("2026-04-22");
    expect(getKstDateString("2026-04-21T14:30:00.000Z")).toBe("2026-04-21");
  });

  it("adds days in KST instead of raw UTC calendar math", () => {
    expect(addDaysToKstDate("2026-04-21T15:30:00+09:00", 30)).toBe("2026-05-21");
  });

  it("parses PayApp datetime strings into explicit KST timestamps", () => {
    expect(parsePayAppDateTime("2026-04-22 09:15:01")).toBe("2026-04-22T09:15:01+09:00");
    expect(parsePayAppDateTime(null)).toBeNull();
  });
});

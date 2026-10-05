import { describe, it, expect } from "vitest";
import { scheduledReminder } from "../worker/schedule";
describe("London reminders", () => {
  it("sends at local 08:00 and 19:00 in summer", () => {
    expect(
      scheduledReminder(
        new Date("2026-10-05T07:00:00Z"),
        "Europe/London",
        "08:00",
        "19:00",
      ),
    ).toEqual({ period: "morning", day: "2026-10-05" });
    expect(
      scheduledReminder(
        new Date("2026-10-05T18:00:00Z"),
        "Europe/London",
        "08:00",
        "19:00",
      )?.period,
    ).toBe("evening");
  });
  it("adjusts after daylight saving ends", () => {
    expect(
      scheduledReminder(
        new Date("2026-10-26T08:00:00Z"),
        "Europe/London",
        "08:00",
        "19:00",
      )?.period,
    ).toBe("morning");
    expect(
      scheduledReminder(
        new Date("2026-10-26T07:00:00Z"),
        "Europe/London",
        "08:00",
        "19:00",
      ),
    ).toBeUndefined();
  });
  it("does not send outside the configured minute", () => {
    expect(
      scheduledReminder(
        new Date("2026-10-05T07:01:00Z"),
        "Europe/London",
        "08:00",
        "19:00",
      ),
    ).toBeUndefined();
  });
});

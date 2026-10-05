import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../worker/index.ts";
vi.mock("@block65/webcrypto-web-push", () => ({
  buildPushPayload: vi.fn(async () => ({
    method: "POST",
    body: new Uint8Array([1]),
    headers: {},
  })),
}));
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const row = {
    token: "device",
    subscription: JSON.stringify({
      endpoint: "https://web.push.apple.com/test",
    }),
    morning: "08:00",
    evening: "19:00",
    timezone: "Europe/London",
    enabled: 1,
    last_morning: null,
    last_evening: null,
  };
  const rows = [row];
  const env = {
    DB: {
      prepare(sql) {
        let args = [];
        return {
          bind(...values) {
            args = values;
            return this;
          },
          async all() {
            return { results: rows.filter((r) => r.enabled) };
          },
          async run() {
            if (sql.startsWith("UPDATE")) {
              const column = sql.includes("last_morning")
                ? "last_morning"
                : "last_evening";
              if (row[column] === args[0]) return { meta: { changes: 0 } };
              row[column] = args[0];
              return { meta: { changes: 1 } };
            }
            if (sql.startsWith("DELETE")) rows.splice(0, rows.length);
            return { meta: { changes: 1 } };
          },
        };
      },
    },
  };
  return { row, rows, env };
}
const event = { scheduledTime: Date.parse("2026-10-05T07:00:00Z") };
describe("scheduled delivery", () => {
  it("attempts once per period even when the scheduler repeats", async () => {
    const { row, env } = fixture();
    const send = vi.fn(async () => new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", send);
    await worker.scheduled(event, env);
    await worker.scheduled(event, env);
    expect(send).toHaveBeenCalledTimes(1);
    expect(row.last_morning).toBe("2026-10-05");
    await worker.scheduled(
      { scheduledTime: Date.parse("2026-10-05T18:00:00Z") },
      env,
    );
    expect(send).toHaveBeenCalledTimes(2);
  });
  it("does not send disabled reminders", async () => {
    const { row, env } = fixture();
    row.enabled = 0;
    const send = vi.fn();
    vi.stubGlobal("fetch", send);
    await worker.scheduled(event, env);
    expect(send).not.toHaveBeenCalled();
  });
  it("removes expired subscriptions", async () => {
    const { rows, env } = fixture();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 410 })),
    );
    await worker.scheduled(event, env);
    expect(rows).toHaveLength(0);
  });
});

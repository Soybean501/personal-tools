import {
  buildPushPayload,
  type PushSubscription,
} from "@block65/webcrypto-web-push";
import { scheduledReminder } from "./schedule";
interface Row {
  token: string;
  subscription: string;
  morning: string;
  evening: string;
  timezone: string;
  enabled: number;
  last_morning: string | null;
  last_evening: string | null;
}
const origin = "https://personal-tools.surge.sh";
const cors = {
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Setup-Key",
  "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
  Vary: "Origin",
};
const json = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: { ...cors, "Cache-Control": "no-store" },
  });
function validSubscription(value: unknown): value is PushSubscription {
  if (!value || typeof value !== "object") return false;
  const s = value as PushSubscription;
  try {
    const u = new URL(s.endpoint);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      [
        "web.push.apple.com",
        "fcm.googleapis.com",
        "updates.push.services.mozilla.com",
      ].some((h) => u.hostname === h || u.hostname.endsWith("." + h)) &&
      typeof s.keys?.auth === "string" &&
      typeof s.keys?.p256dh === "string" &&
      s.keys.auth.length < 200 &&
      s.keys.p256dh.length < 200
    );
  } catch {
    return false;
  }
}
async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8192) {
      await reader.cancel();
      throw new Error("Body too large");
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(body));
}
async function verifySetupKey(provided: string, expected: string) {
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest(
      "SHA-256",
      encoder.encode(provided.replace(/[\s\-–—]/g, "").toLowerCase()),
    ),
    crypto.subtle.digest(
      "SHA-256",
      encoder.encode(expected.replace(/[\s\-–—]/g, "").toLowerCase()),
    ),
  ]);
  return crypto.subtle.timingSafeEqual(left, right);
}
async function send(
  env: Env,
  subscription: string,
  period: string,
  test = false,
) {
  const sub = JSON.parse(subscription) as PushSubscription;
  const request = await buildPushPayload(
    {
      data: {
        title: test
          ? "Test notification"
          : `${period === "morning" ? "Morning" : "Evening"} routines`,
        body: test
          ? "Notifications are working."
          : "Open Personal Tools to check off your routines.",
        url: `${origin}/#home`,
        tag: test ? "test" : `${period}-routine`,
      },
      options: { ttl: 3600, urgency: "normal" },
    },
    sub,
    {
      subject: env.VAPID_SUBJECT,
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY,
    },
  );
  return fetch(sub.endpoint, { ...request, redirect: "error" });
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS")
      return new Response(null, { headers: cors });
    if (request.headers.get("Origin") !== origin)
      return json({ error: "Origin not allowed" }, 403);
    const path = new URL(request.url).pathname;
    if (path === "/config" && request.method === "GET")
      return json({ publicKey: env.VAPID_PUBLIC_KEY });
    if (Number(request.headers.get("Content-Length") ?? 0) > 8192)
      return json({ error: "Request too large" }, 413);
    try {
      if (path === "/subscribe" && request.method === "POST") {
        if (
          !env.SETUP_KEY ||
          !(await verifySetupKey(
            request.headers.get("X-Setup-Key") ?? "",
            env.SETUP_KEY,
          ))
        )
          return json({ error: "Incorrect setup code" }, 403);
        const body = (await readBody(request)) as { subscription: unknown };
        if (!validSubscription(body.subscription))
          return json({ error: "Invalid push subscription" }, 400);
        const token = crypto.randomUUID() + crypto.randomUUID();
        await env.DB.batch([
          env.DB.prepare("DELETE FROM reminders WHERE subscription=?").bind(
            JSON.stringify(body.subscription),
          ),
          env.DB.prepare(
            "INSERT INTO reminders (token,subscription) VALUES (?,?)",
          ).bind(token, JSON.stringify(body.subscription)),
        ]);
        return json({
          token,
          morning: "08:00",
          evening: "19:00",
          timezone: "Europe/London",
          enabled: true,
        });
      }
      const token = request.headers
        .get("Authorization")
        ?.replace(/^Bearer /, "");
      if (!token) return json({ error: "Device not registered" }, 401);
      const row = await env.DB.prepare("SELECT * FROM reminders WHERE token=?")
        .bind(token)
        .first<Row>();
      if (!row) return json({ error: "Device not registered" }, 401);
      if (path === "/reminders" && request.method === "GET")
        return json({
          morning: row.morning,
          evening: row.evening,
          timezone: row.timezone,
          enabled: !!row.enabled,
        });
      if (path === "/reminders" && request.method === "PUT") {
        const b = (await readBody(request)) as {
          morning: string;
          evening: string;
          timezone: string;
          enabled: boolean;
          subscription: unknown;
        };
        if (
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.morning) ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.evening) ||
          b.morning === b.evening ||
          typeof b.enabled !== "boolean" ||
          !validSubscription(b.subscription)
        )
          return json(
            { error: "Use different valid morning and evening times" },
            400,
          );
        try {
          new Intl.DateTimeFormat("en", { timeZone: b.timezone }).format();
        } catch {
          return json({ error: "Invalid timezone" }, 400);
        }
        await env.DB.prepare(
          "UPDATE reminders SET morning=?, evening=?, timezone=?, enabled=?, subscription=? WHERE token=?",
        )
          .bind(
            b.morning,
            b.evening,
            b.timezone,
            b.enabled ? 1 : 0,
            JSON.stringify(b.subscription),
            token,
          )
          .run();
        return json({ ok: true });
      }
      if (path === "/test" && request.method === "POST") {
        const result = await send(env, row.subscription, "morning", true);
        return result.ok
          ? json({ ok: true })
          : json(
              {
                error:
                  "Push service rejected the subscription. Reconnect notifications.",
              },
              502,
            );
      }
      if (path === "/reminders" && request.method === "DELETE") {
        await env.DB.prepare("DELETE FROM reminders WHERE token=?")
          .bind(token)
          .run();
        return json({ ok: true });
      }
      return json({ error: "Not found" }, 404);
    } catch {
      return json({ error: "Could not process request" }, 500);
    }
  },
  async scheduled(event: ScheduledController, env: Env) {
    const { results } = await env.DB.prepare(
      "SELECT * FROM reminders WHERE enabled=1",
    ).all<Row>();
    for (const row of results) {
      const due = scheduledReminder(
        new Date(event.scheduledTime),
        row.timezone,
        row.morning,
        row.evening,
      );
      if (!due) continue;
      const column = due.period === "morning" ? "last_morning" : "last_evening";
      // Claim before sending so retries cannot send a second reminder that day.
      const claim = await env.DB.prepare(
        `UPDATE reminders SET ${column}=? WHERE token=? AND (${column} IS NULL OR ${column}!=?)`,
      )
        .bind(due.day, row.token, due.day)
        .run();
      if (!claim.meta.changes) continue;
      try {
        const result = await send(env, row.subscription, due.period);
        if (result.status === 404 || result.status === 410)
          await env.DB.prepare("DELETE FROM reminders WHERE token=?")
            .bind(row.token)
            .run();
        else if (!result.ok)
          console.error(
            JSON.stringify({
              message: "Push delivery failed",
              status: result.status,
            }),
          );
      } catch {
        console.error(JSON.stringify({ message: "Push delivery failed" }));
      }
    }
  },
} satisfies ExportedHandler<Env>;

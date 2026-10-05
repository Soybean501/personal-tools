// Exercise the real local Worker and D1 without sending any push notifications.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createECDH, randomBytes } from "node:crypto";
const vars = Object.fromEntries(
  readFileSync(".dev.vars", "utf8")
    .trim()
    .split("\n")
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
const url = "http://localhost:8787",
  origin = "https://personal-tools.surge.sh";
const key = createECDH("prime256v1");
key.generateKeys();
const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/local-test-only",
  keys: {
    p256dh: key.getPublicKey().toString("base64url"),
    auth: randomBytes(16).toString("base64url"),
  },
  expirationTime: null,
};
const headers = { Origin: origin, "Content-Type": "application/json" };
async function call(path, method = "GET", body, extra = {}) {
  return fetch(url + path, {
    method,
    headers: { ...headers, ...extra },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
assert.equal((await fetch(url + "/config")).status, 403);
assert.equal((await call("/reminders")).status, 401);
assert.equal(
  (
    await call(
      "/subscribe",
      "POST",
      { subscription },
      { "X-Setup-Key": "wrong" },
    )
  ).status,
  403,
);
assert.equal(
  (
    await call(
      "/subscribe",
      "POST",
      {
        subscription: { ...subscription, endpoint: "https://example.com/evil" },
      },
      { "X-Setup-Key": vars.SETUP_KEY },
    )
  ).status,
  400,
);
const config = await (await call("/config")).json();
assert.equal(config.publicKey, vars.VAPID_PUBLIC_KEY);
const registration = await call(
  "/subscribe",
  "POST",
  { subscription },
  { "X-Setup-Key": vars.SETUP_KEY },
);
assert.equal(registration.status, 200);
const prefs = await registration.json();
const auth = { Authorization: `Bearer ${prefs.token}` };
assert.equal(prefs.morning, "08:00");
assert.equal(prefs.evening, "19:00");
assert.equal(
  (
    await call(
      "/reminders",
      "PUT",
      { ...prefs, morning: "25:00", subscription },
      auth,
    )
  ).status,
  400,
);
assert.equal(
  (
    await call(
      "/reminders",
      "PUT",
      { ...prefs, morning: "09:00", enabled: false, subscription },
      auth,
    )
  ).status,
  200,
);
const changed = await (await call("/reminders", "GET", undefined, auth)).json();
assert.equal(changed.morning, "09:00");
assert.equal(changed.enabled, false);
assert.equal((await call("/reminders", "DELETE", undefined, auth)).status, 200);
assert.equal((await call("/reminders", "GET", undefined, auth)).status, 401);
console.log(
  "Local Worker/D1 checks passed: origin, authorization, enrollment, validation, schedule changes, disable, disconnect.",
);

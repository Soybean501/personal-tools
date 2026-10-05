import { createECDH, randomBytes } from "node:crypto";
import { describe, it, expect, vi, afterEach } from "vitest";
import { buildPushPayload } from "@block65/webcrypto-web-push";
function keys() {
  const key = createECDH("prime256v1");
  key.generateKeys();
  return {
    publicKey: key.getPublicKey().toString("base64url"),
    privateKey: key.getPrivateKey().toString("base64url"),
  };
}
describe("Web Push encryption", () => {
  it("creates an Apple-compatible aes128gcm request without plaintext", async () => {
    const client = keys(),
      server = keys();
    const payload = await buildPushPayload(
      {
        data: { title: "Morning routines", body: "Open Personal Tools" },
        options: { ttl: 3600 },
      },
      {
        endpoint: "https://web.push.apple.com/test",
        expirationTime: null,
        keys: {
          p256dh: client.publicKey,
          auth: randomBytes(16).toString("base64url"),
        },
      },
      { ...server, subject: "https://personal-tools.surge.sh" },
    );
    expect(payload.headers["content-encoding"]).toBe("aes128gcm");
    expect(payload.headers.authorization).toMatch(/^vapid /);
    expect(payload.body.byteLength).toBeGreaterThan(100);
    expect(new TextDecoder().decode(payload.body)).not.toContain(
      "Morning routines",
    );
  });
});

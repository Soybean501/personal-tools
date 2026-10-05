import { createECDH, randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
if (existsSync(".dev.vars")) {
  console.log(".dev.vars already exists; keeping existing notification keys.");
  process.exit(0);
}
const keys = createECDH("prime256v1");
keys.generateKeys();
writeFileSync(
  ".dev.vars",
  `VAPID_PUBLIC_KEY=${keys.getPublicKey().toString("base64url")}\nVAPID_PRIVATE_KEY=${keys.getPrivateKey().toString("base64url")}\nSETUP_KEY=${randomBytes(18).toString("base64url")}\n`,
  { mode: 0o600 },
);
console.log(
  "Notification keys saved to ignored .dev.vars. Keep this file; changing VAPID keys requires reconnecting phones.",
);

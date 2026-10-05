import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
const domain =
  process.argv[2] ||
  process.env.SURGE_DOMAIN ||
  (existsSync("CNAME") ? readFileSync("CNAME", "utf8").trim() : "");
if (!domain) {
  console.error(
    "Supply a domain: npm run deploy -- your-domain.surge.sh (or create CNAME). Surge will ask for login in your terminal.",
  );
  process.exit(1);
}
if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(domain)) {
  console.error("Use a domain without https:// or a path.");
  process.exit(1);
}
const result = spawnSync("npx", ["--no-install", "surge", "dist", domain], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);

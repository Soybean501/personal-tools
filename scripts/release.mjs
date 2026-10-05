import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
function run(command, args) {
  const r = spawnSync(command, args, { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
const message = process.argv[2],
  domain =
    process.argv[3] ||
    process.env.SURGE_DOMAIN ||
    (existsSync("CNAME") ? readFileSync("CNAME", "utf8").trim() : "");
if (!message || !domain) {
  console.error(
    'Usage: npm run release -- "Commit message" your-domain.surge.sh\nRequires an initialized Git repo, configured upstream, Surge login, and Cloudflare login.',
  );
  process.exit(1);
}
run("git", ["rev-parse", "--show-toplevel"]);
run("git", ["rev-parse", "--abbrev-ref", "@{upstream}"]);
run("npm", ["test"]);
run("npm", ["run", "build"]);
run("git", ["add", "--all"]);
const changes = spawnSync("git", ["diff", "--cached", "--quiet"]);
if (changes.status === 1) run("git", ["commit", "-m", message]);
else if (changes.status !== 0) process.exit(changes.status ?? 1);
run("git", ["push"]);
run("npm", ["run", "deploy:worker"]);
run("node", ["scripts/deploy.mjs", domain]);

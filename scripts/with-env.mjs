// Loads .env (so PORT and other vars apply), then runs Next with the right port.
// Avoids `node --env-file` flags, which Next propagates into NODE_OPTIONS where
// they are disallowed. Usage: node scripts/with-env.mjs dev|start
import "dotenv/config";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2); // e.g. ["dev"] or ["start"]
const port = process.env.PORT;
if (port && !args.includes("-p") && !args.includes("--port")) {
  args.push("-p", port);
}

const result = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", ...args], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);

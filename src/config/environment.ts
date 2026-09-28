import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";
// Same path from src/config and dist/config; independent of terminal cwd.
export const workspaceRoot = resolve(__dirname, "../..");
export function loadEnvironment() {
  const path = resolve(workspaceRoot, ".env");
  if (existsSync(path)) loadEnvFile(path);
  if (
    Boolean(process.env.SUPABASE_URL) !==
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  ) {
    throw new Error(
      "Configure both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  const port = Number(process.env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Invalid PORT.");
}

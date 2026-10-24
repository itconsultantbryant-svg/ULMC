import { existsSync } from "node:fs";
import path from "node:path";

export function loadEnv() {
  const root = process.cwd();
  for (const file of [".env.local", ".env"]) {
    const full = path.join(root, file);
    if (existsSync(full)) {
      try {
        process.loadEnvFile(full);
      } catch {
        // ignore malformed env file; the app will surface the missing variable
      }
    }
  }
}

export function log(scope: string, message: string) {
  process.stdout.write(`[${scope}] ${message}\n`);
}

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { loadEnv, log } from "./lib";

loadEnv();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`;
    const applied = new Set(
      (await sql`SELECT name FROM schema_migrations`).map((r) => r.name as string),
    );
    const dir = path.join(process.cwd(), "drizzle");
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    let count = 0;
    for (const file of files) {
      if (applied.has(file)) {
        log("migrate", `skip ${file}`);
        continue;
      }
      const content = readFileSync(path.join(dir, file), "utf8");
      log("migrate", `apply ${file}`);
      await sql.begin(async (tx) => {
        await tx.unsafe(content);
        await tx`INSERT INTO schema_migrations (name) VALUES (${file})`;
      });
      count += 1;
    }
    log("migrate", count === 0 ? "database is up to date" : `applied ${count} migration(s)`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __ulmcSql?: ReturnType<typeof postgres>;
  __ulmcDb?: ReturnType<typeof drizzle<typeof schema>>;
};

function createClient() {
  const client = postgres(env.databaseUrl, {
    max: env.isProd ? 12 : 6,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    onnotice: () => {},
  });
  return client;
}

export const sqlClient = globalForDb.__ulmcSql ?? createClient();
export const db = globalForDb.__ulmcDb ?? drizzle(sqlClient, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__ulmcSql = sqlClient;
  globalForDb.__ulmcDb = db;
}

export type Database = typeof db;
export { schema };

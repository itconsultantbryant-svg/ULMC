import postgres from "postgres";
import { env } from "@/lib/env";

type State = {
  sql: ReturnType<typeof postgres> | null;
  ready: Promise<void> | null;
  subscribers: Set<() => void>;
  pending: ReturnType<typeof setTimeout> | null;
};

const globalForLive = globalThis as unknown as { __ulmcLive?: State };
const state: State =
  globalForLive.__ulmcLive ??
  (globalForLive.__ulmcLive = { sql: null, ready: null, subscribers: new Set(), pending: null });

function emit() {
  if (state.pending) return;
  state.pending = setTimeout(() => {
    state.pending = null;
    for (const subscriber of state.subscribers) {
      try {
        subscriber();
      } catch (error) {
        console.error("Live analytics subscriber failed", error);
      }
    }
  }, 500);
}

async function ensureListener() {
  if (state.ready) return state.ready;
  state.ready = (async () => {
    const sql = postgres(env.databaseUrl, { max: 1, idle_timeout: 0, prepare: false });
    state.sql = sql;
    await sql.listen("ulmc_analytics_events", () => emit());
  })();
  return state.ready;
}

export async function subscribeToAnalytics(onChange: () => void): Promise<() => void> {
  await ensureListener();
  state.subscribers.add(onChange);
  return () => {
    state.subscribers.delete(onChange);
  };
}

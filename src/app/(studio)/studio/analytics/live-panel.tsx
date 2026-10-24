"use client";

import { useEffect, useState } from "react";
import type { LiveSnapshot } from "@/server/analytics/queries";

export function LivePanel({ initial }: { initial: LiveSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource("/api/live/stream");
    source.addEventListener("snapshot", (event) => {
      try {
        setSnapshot(JSON.parse((event as MessageEvent).data) as LiveSnapshot);
        setConnected(true);
      } catch {
        /* ignore malformed events */
      }
    });
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    return () => source.close();
  }, []);

  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">Live now</h2>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-success" : "bg-line-strong"}`} />
          {connected ? "Streaming" : "Reconnecting"}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded border border-line bg-mist px-2 py-3">
          <dt className="text-[11px] uppercase tracking-wide text-muted">Active visitors</dt>
          <dd className="stat-value mt-1 text-xl">{snapshot.activeVisitors}</dd>
        </div>
        <div className="rounded border border-line bg-mist px-2 py-3">
          <dt className="text-[11px] uppercase tracking-wide text-muted">Views / 30 min</dt>
          <dd className="stat-value mt-1 text-xl">{snapshot.viewsLast30}</dd>
        </div>
        <div className="rounded border border-line bg-mist px-2 py-3">
          <dt className="text-[11px] uppercase tracking-wide text-muted">Views today</dt>
          <dd className="stat-value mt-1 text-xl">{snapshot.viewsToday}</dd>
        </div>
      </dl>
      {snapshot.topPaths.length > 0 ? (
        <ul className="mt-4 space-y-1 text-xs">
          {snapshot.topPaths.map((path) => (
            <li key={path.path} className="flex justify-between gap-2">
              <span className="truncate text-muted">{path.path}</span>
              <span className="font-semibold text-ink">{path.views}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-muted">No recent activity.</p>
      )}
    </section>
  );
}

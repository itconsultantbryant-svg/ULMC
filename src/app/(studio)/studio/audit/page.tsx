import type { Metadata } from "next";
import Link from "next/link";
import { relativeTime } from "@/lib/format";
import { requirePagePermission } from "@/server/session";
import { listAuditEntries } from "@/server/studio/queries";

export const metadata: Metadata = {
  title: "Audit log",
  robots: { index: false, follow: false },
};

const ENTITY_TYPES = [
  "all",
  "article",
  "article_revision",
  "review",
  "approval",
  "media",
  "comment",
  "user",
  "invitation",
  "event",
  "announcement",
  "site_page",
  "site_setting",
  "category",
  "tag",
];

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; q?: string; limit?: string }>;
}) {
  await requirePagePermission("audit.view", "/studio/audit");
  const params = await searchParams;
  const entityType = params.entityType ?? "all";
  const limit = Number(params.limit ?? "100");
  const entries = await listAuditEntries({ entityType, q: params.q, limit });

  return (
    <div className="space-y-6">
      <header>
        <p className="kicker">Oversight</p>
        <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Audit log</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Immutable record of editorial decisions, approvals, account changes and settings updates.
          Entries are read-only.
        </p>
      </header>

      <form action="/studio/audit" className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-white p-4">
        <div>
          <label htmlFor="audit-q" className="label">Action</label>
          <input id="audit-q" name="q" type="search" defaultValue={params.q ?? ""} placeholder="e.g. article.published" className="field py-1.5 text-sm" />
        </div>
        <div>
          <label htmlFor="audit-entity" className="label">Entity</label>
          <select id="audit-entity" name="entityType" defaultValue={entityType} className="field py-1.5 text-sm">
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type === "all" ? "All entities" : type.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="audit-limit" className="label">Show</label>
          <select id="audit-limit" name="limit" defaultValue={String([50, 100, 200, 300].includes(limit) ? limit : 100)} className="field py-1.5 text-sm">
            {[50, 100, 200, 300].map((count) => (
              <option key={count} value={count}>{count} entries</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-outline btn-sm">Filter</button>
        <Link href="/studio/audit" className="text-xs text-muted underline underline-offset-4 hover:text-red">Reset</Link>
      </form>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong bg-white px-5 py-10 text-center text-sm text-muted">
          No audit entries match this filter.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="table-clean">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Actor</th>
                <th scope="col">Action</th>
                <th scope="col">Entity</th>
                <th scope="col">Status change</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="whitespace-nowrap text-xs text-muted" title={entry.createdAt.toISOString()}>
                    {relativeTime(entry.createdAt)}
                  </td>
                  <td className="whitespace-nowrap text-xs">{entry.actorName ?? <span className="text-muted">System</span>}</td>
                  <td className="text-xs">
                    <span className="font-mono text-[11px] text-ink">{entry.action}</span>
                    {entry.reason ? <p className="mt-0.5 text-[11px] text-muted">{entry.reason}</p> : null}
                  </td>
                  <td className="text-xs text-muted">
                    <span className="font-mono text-[11px]">{entry.entityType}</span>
                    {entry.entityId ? (
                      <p className="truncate font-mono text-[10px] text-muted" title={entry.entityId}>
                        {entry.entityId.slice(0, 8)}…
                      </p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap text-[11px] text-muted">
                    {entry.fromStatus || entry.toStatus ? (
                      <>
                        {entry.fromStatus ?? "—"} → {entry.toStatus ?? "—"}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

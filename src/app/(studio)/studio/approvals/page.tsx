import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { relativeTime } from "@/lib/format";
import { requirePagePermission } from "@/server/session";
import { listApprovalQueue } from "@/server/studio/queries";

export const metadata: Metadata = {
  title: "Final approvals",
  robots: { index: false, follow: false },
};

export default async function ApprovalQueuePage() {
  await requirePagePermission("admin.viewApprovalQueue", "/studio/approvals");
  const rows = await listApprovalQueue();

  return (
    <div className="space-y-6">
      <header>
        <p className="kicker">Administration</p>
        <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Final approval queue</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Stories that have completed editorial review. Final approval must be given by an
          administrator who neither wrote nor editorially reviewed the story. Approved stories can then
          be published immediately or scheduled.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState title="Nothing is awaiting final approval">
          Editorially approved stories appear here for a final decision.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="table-clean">
            <thead>
              <tr>
                <th scope="col">Story</th>
                <th scope="col">Author</th>
                <th scope="col">Editorial approver</th>
                <th scope="col">Status</th>
                <th scope="col">Approved</th>
                <th scope="col">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="max-w-sm">
                    <Link href={`/studio/articles/${row.id}`} className="font-semibold text-ink hover:text-red">
                      {row.title}
                    </Link>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted">{row.categoryName ?? "Uncategorised"}</p>
                  </td>
                  <td className="whitespace-nowrap text-xs text-muted">{row.authorNames ?? "—"}</td>
                  <td className="whitespace-nowrap text-xs text-muted">{row.editorName ?? "—"}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="whitespace-nowrap text-xs text-muted">
                    {row.editoriallyApprovedAt ? relativeTime(row.editoriallyApprovedAt) : "—"}
                  </td>
                  <td className="text-right">
                    <Link href={`/studio/articles/${row.id}`} className="btn btn-outline btn-sm">
                      Decide
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="rounded border border-line bg-white px-4 py-3 text-xs leading-relaxed text-muted">
        Returning a story invalidates the existing editorial approval and sends it back to the editor.
        Rejecting ends the workflow for this revision; a replacement draft can still be started later.
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { relativeTime } from "@/lib/format";
import { requirePagePermission } from "@/server/session";
import { listReviewQueue } from "@/server/studio/queries";

export const metadata: Metadata = {
  title: "Editorial review",
  robots: { index: false, follow: false },
};

export default async function ReviewQueuePage() {
  await requirePagePermission("editorial.viewQueue", "/studio/review");
  const rows = await listReviewQueue();

  return (
    <div className="space-y-6">
      <header>
        <p className="kicker">Editorial</p>
        <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Editorial review queue</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Stories submitted by staff, oldest first. Claim a story to begin review, then approve against
          the editorial checklist or request specific changes. You cannot approve a story you wrote.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState title="The review queue is clear">
          New submissions will appear here. Staff can continue drafting in the meantime.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="table-clean">
            <thead>
              <tr>
                <th scope="col">Story</th>
                <th scope="col">Author</th>
                <th scope="col">Status</th>
                <th scope="col">Waiting</th>
                <th scope="col">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="max-w-md">
                    <Link href={`/studio/articles/${row.id}`} className="font-semibold text-ink hover:text-red">
                      {row.title}
                    </Link>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                      {row.categoryName ?? "Uncategorised"} · {row.summary}
                    </p>
                  </td>
                  <td className="whitespace-nowrap text-xs text-muted">{row.authorNames ?? "—"}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="whitespace-nowrap text-xs text-muted">{relativeTime(row.updatedAt)}</td>
                  <td className="text-right">
                    <Link href={`/studio/articles/${row.id}`} className="btn btn-outline btn-sm">
                      Review
                    </Link>
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

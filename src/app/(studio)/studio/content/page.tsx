import type { Metadata } from "next";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { requirePagePermission } from "@/server/session";
import { listAllAnnouncements, listAllSitePages } from "@/server/studio/queries";
import { AnnouncementsManager } from "./announcements-manager";

export const metadata: Metadata = {
  title: "Content",
  robots: { index: false, follow: false },
};

export default async function ContentPage() {
  await requirePagePermission("institutional.manage", "/studio/content");
  const [pages, announcements] = await Promise.all([listAllSitePages(), listAllAnnouncements()]);

  return (
    <div className="space-y-8">
      <header>
        <p className="kicker">Institutional content</p>
        <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Content</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Static pages, notices and taxonomy used across the public site. News stories are managed in Articles.
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg">Site pages</h2>
          <div className="flex gap-3 text-sm">
            <Link href="/studio/content/taxonomy" className="text-navy underline underline-offset-4 hover:text-red">
              Categories and tags
            </Link>
            <Link href="/studio/events" className="text-navy underline underline-offset-4 hover:text-red">
              Events
            </Link>
          </div>
        </div>
        {pages.length === 0 ? (
          <p className="rounded border border-dashed border-line-strong bg-white px-4 py-6 text-sm text-muted">
            No site pages yet. Seed data or imports will populate this list.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-white">
            <table className="table-clean">
              <thead>
                <tr>
                  <th scope="col">Title</th>
                  <th scope="col">Section</th>
                  <th scope="col">Status</th>
                  <th scope="col">Updated</th>
                  <th scope="col"><span className="sr-only">Edit</span></th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => (
                  <tr key={page.id}>
                    <td>
                      <Link href={`/studio/content/pages/${page.id}`} className="font-semibold text-ink hover:text-red">
                        {page.title}
                      </Link>
                      <p className="text-xs text-muted">/{page.slug}</p>
                    </td>
                    <td className="text-xs text-muted">{page.section}</td>
                    <td className="text-xs">
                      <span className={page.isPublished ? "font-semibold text-success" : "font-semibold text-warning"}>
                        {page.isPublished ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-xs text-muted">{formatDate(page.updatedAt)}</td>
                    <td className="text-right">
                      <Link href={`/studio/content/pages/${page.id}`} className="text-xs font-semibold text-navy hover:text-red">Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg">Announcements</h2>
        <p className="text-xs text-muted">Short notices shown in the public site header when announcements are enabled.</p>
        <AnnouncementsManager
          initial={announcements.map((row) => ({
            id: row.id,
            message: row.message,
            level: row.level,
            linkLabel: row.linkLabel,
            linkUrl: row.linkUrl,
            isActive: row.isActive,
          }))}
        />
      </section>
    </div>
  );
}

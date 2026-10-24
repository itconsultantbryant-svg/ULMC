import type { Metadata } from "next";
import Link from "next/link";
import { requirePagePermission } from "@/server/session";
import { listAllAcademicPages } from "@/server/studio/queries";

export const metadata: Metadata = { title: "Academics", robots: { index: false, follow: false } };

export default async function AcademicsAdminPage() {
  await requirePagePermission("academics.manage", "/studio/academics");
  const pages = await listAllAcademicPages();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Department</p>
          <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Academic pages</h1>
          <p className="mt-1 text-sm text-muted">Programmes, policies and academic resources.</p>
        </div>
        <Link href="/studio/academics/new" className="btn btn-primary">New page</Link>
      </header>
      {pages.length === 0 ? (
        <p className="rounded border border-dashed border-line-strong bg-white px-5 py-10 text-center text-sm text-muted">No academic pages.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="table-clean">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Kind</th>
                <th scope="col">Order</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="sr-only">Edit</span></th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id}>
                  <td>
                    <Link href={`/studio/academics/${page.id}`} className="font-semibold text-ink hover:text-red">{page.title}</Link>
                    <p className="text-xs text-muted">/{page.slug}</p>
                  </td>
                  <td className="text-xs text-muted">{page.kind}</td>
                  <td className="text-xs text-muted">{page.orderIndex}</td>
                  <td className="text-xs">
                    <span className={page.isPublished ? "font-semibold text-success" : "font-semibold text-warning"}>{page.isPublished ? "Published" : "Draft"}</span>
                  </td>
                  <td className="text-right">
                    <Link href={`/studio/academics/${page.id}`} className="text-xs font-semibold text-navy hover:text-red">Edit</Link>
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

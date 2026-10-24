import type { Metadata } from "next";
import Link from "next/link";
import { requirePagePermission } from "@/server/session";
import { listAllFaculty } from "@/server/studio/queries";

export const metadata: Metadata = {
  title: "Faculty",
  robots: { index: false, follow: false },
};

export default async function FacultyAdminPage() {
  await requirePagePermission("faculty.manage", "/studio/faculty");
  const faculty = await listAllFaculty();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">People</p>
          <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Faculty and staff</h1>
          <p className="mt-1 text-sm text-muted">Profiles shown on the public faculty page.</p>
        </div>
        <Link href="/studio/faculty/new" className="btn btn-primary">New profile</Link>
      </header>
      {faculty.length === 0 ? (
        <p className="rounded border border-dashed border-line-strong bg-white px-5 py-10 text-center text-sm text-muted">
          No profiles yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="table-clean">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Role</th>
                <th scope="col">Order</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="sr-only">Edit</span></th>
              </tr>
            </thead>
            <tbody>
              {faculty.map((person) => (
                <tr key={person.id}>
                  <td>
                    <Link href={`/studio/faculty/${person.id}`} className="font-semibold text-ink hover:text-red">{person.name}</Link>
                    <p className="text-xs text-muted">{person.email ?? ""}</p>
                  </td>
                  <td className="text-xs text-muted">{person.role}</td>
                  <td className="text-xs text-muted">{person.orderIndex}</td>
                  <td className="text-xs">
                    <span className={person.isActive ? "font-semibold text-success" : "font-semibold text-warning"}>{person.isActive ? "Active" : "Hidden"}</span>
                  </td>
                  <td className="text-right">
                    <Link href={`/studio/faculty/${person.id}`} className="text-xs font-semibold text-navy hover:text-red">Edit</Link>
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

import type { Metadata } from "next";
import { formatDate, relativeTime } from "@/lib/format";
import { can, roleLabel } from "@/server/permissions";
import { requirePagePermission } from "@/server/session";
import { listPendingInvitations, listStaffUsers } from "@/server/studio/queries";
import { InviteForm } from "./invite-form";
import { UserActions } from "./user-actions";

export const metadata: Metadata = {
  title: "People",
  robots: { index: false, follow: false },
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { user } = await requirePagePermission("users.view", "/studio/users");
  const { q } = await searchParams;
  const [staff, invitations] = await Promise.all([listStaffUsers(q), listPendingInvitations()]);
  const canManage = can(user, "users.manage");
  const canManageRoles = can(user, "roles.manage");

  return (
    <div className="space-y-6">
      <header>
        <p className="kicker">Administration</p>
        <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">People</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Staff accounts, roles and access. Role changes are restricted to super administrators;
          suspensions end active sessions immediately.
        </p>
      </header>

      {can(user, "users.invite") ? (
        <InviteForm canInviteAdmin={canManageRoles} />
      ) : (
        <p className="rounded border border-line bg-white px-4 py-3 text-sm text-muted">
          You can view accounts but do not have permission to invite or manage staff.
        </p>
      )}

      <section className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-lg">Staff accounts</h2>
          <form action="/studio/users" className="flex gap-2">
            <label htmlFor="user-q" className="sr-only">
              Search staff
            </label>
            <input
              id="user-q"
              name="q"
              type="search"
              defaultValue={q ?? ""}
              placeholder="Search name or email"
              className="field py-1.5 text-sm"
            />
            <button type="submit" className="btn btn-outline btn-sm">
              Search
            </button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="table-clean">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Role</th>
                <th scope="col">2FA</th>
                <th scope="col">Status</th>
                <th scope="col">Added</th>
                <th scope="col" className="text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id}>
                  <td>
                    <p className="font-semibold text-ink">{member.name}</p>
                    <p className="text-xs text-muted">{member.email}</p>
                    {member.title ? <p className="text-[11px] text-muted">{member.title}</p> : null}
                  </td>
                  <td className="whitespace-nowrap text-xs">{roleLabel(member.role)}</td>
                  <td className="whitespace-nowrap text-xs">
                    <span className={member.twoFactorEnabled ? "text-success" : "text-warning"}>
                      {member.twoFactorEnabled ? "Enabled" : "None"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-xs">
                    {member.banned ? (
                      <span className="font-semibold text-red-deep">Suspended</span>
                    ) : (
                      <span className="text-success">Active</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-xs text-muted">{formatDate(member.createdAt)}</td>
                  <td>
                    <UserActions
                      id={member.id}
                      role={member.role}
                      banned={member.banned}
                      isSelf={member.id === user.id}
                      canManageRoles={canManageRoles}
                      canManage={canManage}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg">Pending invitations</h2>
          <p className="text-xs text-muted">Invitations awaiting acceptance. Expired invitations can be reissued.</p>
        </div>
        {invitations.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">No pending invitations.</p>
        ) : (
          <ul className="divide-y divide-line">
            {invitations.map((invite) => (
              <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="font-semibold text-ink">{invite.name ?? invite.email}</p>
                  <p className="text-xs text-muted">
                    {invite.email} · {roleLabel(invite.role)} · invited by {invite.invitedByName ?? "—"}
                  </p>
                </div>
                <p className="text-xs text-muted">
                  Expires {relativeTime(invite.expiresAt)}
                  {invite.expiresAt.getTime() < Date.now() ? " · expired" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

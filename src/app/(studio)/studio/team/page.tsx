import Link from "next/link";
import { requirePagePermission } from "@/server/session";
import { listAllTeamMembers } from "@/server/studio/queries";

export default async function TeamAdminPage() {
  await requirePagePermission("institutional.manage", "/studio/team");
  const members = await listAllTeamMembers();
  return <div className="space-y-6"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="kicker">People</p><h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Leadership and team</h1><p className="mt-1 text-sm text-muted">Update team biographies, order and profile photographs shown on the public team page.</p></div><Link href="/studio/team/new" className="btn btn-primary">New team member</Link></header><div className="overflow-x-auto rounded-lg border border-line bg-white"><table className="table-clean"><thead><tr><th>Name</th><th>Group</th><th>Status</th><th><span className="sr-only">Edit</span></th></tr></thead><tbody>{members.map((member) => <tr key={member.id}><td><Link href={`/studio/team/${member.id}`} className="font-semibold hover:text-red">{member.name}</Link><p className="text-xs text-muted">{member.role}</p></td><td className="text-xs capitalize text-muted">{member.group}</td><td className="text-xs">{member.isActive ? "Visible" : "Hidden"}</td><td className="text-right"><Link href={`/studio/team/${member.id}`} className="text-xs font-semibold text-navy hover:text-red">Edit</Link></td></tr>)}</tbody></table></div></div>;
}

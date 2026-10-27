import { requirePagePermission } from "@/server/session";
import { listMediaAssets } from "@/server/studio/queries";
import { TeamForm } from "../team-form";
export default async function NewTeamMemberPage() { const { user } = await requirePagePermission("institutional.manage", "/studio/team/new"); const media = await listMediaAssets(user); return <div className="mx-auto max-w-3xl space-y-6"><header><p className="kicker">Team</p><h1 className="mt-1 text-2xl">New team member</h1></header><TeamForm mediaOptions={media.map((m) => ({ id: m.id, originalName: m.originalName, alt: m.alt }))} initial={{ name: "", role: "", group: "editorial", bio: "", photoId: null, email: "", phone: "", orderIndex: 0, isActive: true }} /></div>; }

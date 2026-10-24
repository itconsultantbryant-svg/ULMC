import type { Metadata } from "next";
import { requirePagePermission } from "@/server/session";
import { listMediaAssets } from "@/server/studio/queries";
import { FacultyForm } from "../faculty-form";

export const metadata: Metadata = { title: "New faculty profile", robots: { index: false, follow: false } };

export default async function NewFacultyPage() {
  const { user } = await requirePagePermission("faculty.manage", "/studio/faculty/new");
  const media = await listMediaAssets(user);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="kicker">Faculty</p>
        <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Create profile</h1>
      </header>
      <FacultyForm
        mediaOptions={media.map((m) => ({ id: m.id, originalName: m.originalName, alt: m.alt }))}
        initial={{ name: "", slug: "", role: "", photoId: null, bio: "", qualifications: "", teachingInterests: "", researchInterests: "", email: "", phone: "", office: "", orderIndex: 0, isActive: true }}
      />
    </div>
  );
}

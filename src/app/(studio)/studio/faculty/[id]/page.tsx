import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/server/session";
import { getFacultyById, listMediaAssets } from "@/server/studio/queries";
import { FacultyForm } from "../faculty-form";

export const metadata: Metadata = { title: "Edit faculty profile", robots: { index: false, follow: false } };

export default async function EditFacultyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requirePagePermission("faculty.manage", `/studio/faculty/${id}`);
  const [profile, media] = await Promise.all([getFacultyById(id), listMediaAssets(user)]);
  if (!profile) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="kicker">Faculty</p>
        <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Edit profile</h1>
      </header>
      <FacultyForm
        mediaOptions={media.map((m) => ({ id: m.id, originalName: m.originalName, alt: m.alt }))}
        initial={{
          id: profile.id,
          name: profile.name,
          slug: profile.slug,
          role: profile.role,
          photoId: profile.photoId,
          bio: profile.bio,
          qualifications: profile.qualifications ?? "",
          teachingInterests: profile.teachingInterests ?? "",
          researchInterests: profile.researchInterests ?? "",
          email: profile.email ?? "",
          phone: profile.phone ?? "",
          office: profile.office ?? "",
          orderIndex: profile.orderIndex,
          isActive: profile.isActive,
        }}
      />
    </div>
  );
}

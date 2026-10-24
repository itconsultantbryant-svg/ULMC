import type { Metadata } from "next";
import { requirePagePermission } from "@/server/session";
import { listMediaAssets } from "@/server/studio/queries";
import { AcademicForm } from "../academic-form";

export const metadata: Metadata = { title: "New academic page", robots: { index: false, follow: false } };

export default async function NewAcademicPage() {
  const { user } = await requirePagePermission("academics.manage", "/studio/academics/new");
  const media = await listMediaAssets(user);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="kicker">Academics</p>
        <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Create academic page</h1>
      </header>
      <AcademicForm
        mediaOptions={media.filter((m) => m.mimeType === "application/pdf" || m.mimeType.startsWith("image/"))}
        initial={{ title: "", slug: "", kind: "program", summary: "", bodyHtml: "", linkUrl: "", documentId: null, orderIndex: 0, isPublished: false }}
      />
    </div>
  );
}

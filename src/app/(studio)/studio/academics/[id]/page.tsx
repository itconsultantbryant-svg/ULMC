import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/server/session";
import { getAcademicPageById, listMediaAssets } from "@/server/studio/queries";
import { AcademicForm } from "../academic-form";

export const metadata: Metadata = { title: "Edit academic page", robots: { index: false, follow: false } };

export default async function EditAcademicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requirePagePermission("academics.manage", `/studio/academics/${id}`);
  const [page, media] = await Promise.all([getAcademicPageById(id), listMediaAssets(user)]);
  if (!page) notFound();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="kicker">Academics</p>
        <h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Edit academic page</h1>
      </header>
      <AcademicForm
        mediaOptions={media.filter((m) => m.mimeType === "application/pdf" || m.mimeType.startsWith("image/"))}
        initial={{
          id: page.id,
          title: page.title,
          slug: page.slug,
          kind: page.kind,
          summary: page.summary,
          bodyHtml: page.bodyHtml,
          linkUrl: page.linkUrl ?? "",
          documentId: page.documentId,
          orderIndex: page.orderIndex,
          isPublished: page.isPublished,
        }}
      />
    </div>
  );
}

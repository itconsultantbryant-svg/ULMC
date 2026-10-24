import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArticleEditor } from "@/components/studio/article-editor";
import { can } from "@/server/permissions";
import { requirePagePermission } from "@/server/session";
import {
  canEditArticle,
  getStudioArticle,
  listAuthorOptions,
  listCategoryOptions,
  listMediaAssets,
} from "@/server/studio/queries";

export const metadata: Metadata = {
  title: "Edit story",
  robots: { index: false, follow: false },
};

export default async function StudioArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requirePagePermission("article.create", `/studio/articles/${id}`);
  const detail = await getStudioArticle(id);
  if (!detail) notFound();

  const canEdit = canEditArticle(user, detail);
  const canReview = can(user, "editorial.approve");
  const canApprove = can(user, "admin.approve");
  const canViewQueue = can(user, "editorial.viewQueue");
  if (!canEdit && !canReview && !canApprove && !canViewQueue) redirect("/studio/forbidden");

  const [categories, authors, media] = await Promise.all([
    listCategoryOptions(),
    listAuthorOptions(),
    listMediaAssets(user),
  ]);

  return (
    <ArticleEditor
      key={detail.revision?.id ?? detail.article.id}
      detail={detail}
      categories={categories}
      authors={authors.map((author) => ({
        id: author.id,
        name: author.name,
        role: author.role,
        title: author.title,
      }))}
      media={media.map((asset) => ({
        id: asset.id,
        originalName: asset.originalName,
        alt: asset.alt,
        caption: asset.caption,
        credit: asset.credit,
        mimeType: asset.mimeType,
      }))}
      currentUserId={user.id}
      permissions={{
        canEdit,
        canManageByline: can(user, "article.editAny"),
        canSubmit: can(user, "article.submitOwn"),
        canReview,
        canApproveAdmin: canApprove,
        canPublish: can(user, "article.publish"),
        canSchedule: can(user, "article.schedule"),
        canUnpublish: can(user, "article.unpublish"),
        canArchive: can(user, "article.archive"),
        canAssign: canViewQueue,
      }}
    />
  );
}

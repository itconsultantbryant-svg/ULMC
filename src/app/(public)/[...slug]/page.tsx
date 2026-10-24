import { notFound, redirect } from "next/navigation";
import { resolveRedirect } from "@/server/public-queries";

export const dynamic = "force-dynamic";

export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const path = `/${slug.join("/")}`;
  const match = await resolveRedirect(path);
  if (match) {
    redirect(match.toPath);
  }
  notFound();
}

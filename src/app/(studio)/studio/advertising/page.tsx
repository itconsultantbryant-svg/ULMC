import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { AdvertisingManager } from "./advertising-manager";
import { requirePagePermission } from "@/server/session";
import { db } from "@/server/db/client";
import { advertisement, mediaAsset } from "@/server/db/schema";

export const metadata: Metadata = { title: "Advertising", robots: { index: false, follow: false } };
export default async function AdvertisingPage() {
  await requirePagePermission("advertising.manage", "/studio/advertising");
  const [ads, media] = await Promise.all([db.select().from(advertisement).orderBy(advertisement.orderIndex, desc(advertisement.createdAt)), db.select({ id: mediaAsset.id, originalName: mediaAsset.originalName, mimeType: mediaAsset.mimeType }).from(mediaAsset).orderBy(desc(mediaAsset.createdAt)).limit(120)]);
  return <div className="space-y-6"><header><p className="kicker">Revenue</p><h1 className="mt-1 text-2xl leading-tight sm:text-3xl">Advertising</h1><p className="mt-1 max-w-2xl text-sm text-muted">Create ads with an image or video from the media library. Changes appear on the homepage immediately.</p></header><AdvertisingManager ads={ads} media={media} /></div>;
}

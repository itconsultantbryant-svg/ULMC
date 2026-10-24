import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { siteSetting } from "@/server/db/schema";
import { PUBLIC_SETTINGS_TAG, cached, invalidateSettingsCache } from "@/server/cache";

export const siteSettingsSchema = z.object({
  siteName: z.string().min(2).max(160),
  institutionName: z.string().min(2).max(160),
  tagline: z.string().max(240),
  universityUrl: z.string().url().or(z.literal("")),
  admissionsUrl: z.string().url().or(z.literal("")),
  contactEmail: z.string().email().or(z.literal("")),
  contactPhone: z.string().max(60),
  address: z.string().max(300),
  requireMfaForPrivileged: z.boolean(),
  commentsDefaultEnabled: z.boolean(),
  commentsAutoCloseDays: z.number().int().min(0).max(365),
  newsletterEnabled: z.boolean(),
  announcementEnabled: z.boolean(),
  activeWindowMinutes: z.number().int().min(1).max(60),
  analyticsRetentionDays: z.number().int().min(7).max(3650),
  showDemoAnalytics: z.boolean(),
  social: z.object({
    facebook: z.string().url().or(z.literal("")),
    x: z.string().url().or(z.literal("")),
    instagram: z.string().url().or(z.literal("")),
    youtube: z.string().url().or(z.literal("")),
    linkedin: z.string().url().or(z.literal("")),
  }),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "The Varsity Pilot",
  institutionName: "University of Liberia",
  tagline:
    "Illuminating journalism for a brighter future — the student newspaper of the Department of Communication and Media Studies, University of Liberia.",
  universityUrl: "https://ul.edu.lr",
  admissionsUrl: "https://ul.edu.lr",
  contactEmail: "masscommdept@ul.edu.lr",
  contactPhone: "+231 777 463 864",
  address: "MassComm Building, Fendell Campus, Louisiana, Montserrado, Liberia",
  requireMfaForPrivileged: true,
  commentsDefaultEnabled: true,
  commentsAutoCloseDays: 30,
  newsletterEnabled: true,
  announcementEnabled: true,
  activeWindowMinutes: 5,
  analyticsRetentionDays: 180,
  showDemoAnalytics: false,
  social: {
    facebook: "https://www.facebook.com/share/1Dhmv8YzXS/?mibextid=wwXIfr",
    x: "",
    instagram: "",
    youtube: "",
    linkedin: "",
  },
};

export const SETTINGS_KEY = "site";

export async function readSiteSettings(): Promise<SiteSettings> {
  return cached("settings:site", [PUBLIC_SETTINGS_TAG], 60_000, async () => {
    const rows = await db
      .select()
      .from(siteSetting)
      .where(eq(siteSetting.key, SETTINGS_KEY))
      .limit(1);
    const raw = rows[0]?.value;
    const parsed = siteSettingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...(raw ?? {}) });
    if (parsed.success) {
      return { ...parsed.data, social: { ...DEFAULT_SETTINGS.social, ...parsed.data.social } };
    }
    return DEFAULT_SETTINGS;
  });
}

export async function updateSiteSettings(
  actorId: string,
  patch: Partial<SiteSettings>,
): Promise<SiteSettings> {
  const current = await readSiteSettings();
  const merged = siteSettingsSchema.parse({ ...current, ...patch });
  await db
    .insert(siteSetting)
    .values({ key: SETTINGS_KEY, value: merged, updatedBy: actorId })
    .onConflictDoUpdate({
      target: siteSetting.key,
      set: { value: merged, updatedBy: actorId, updatedAt: new Date() },
    });
  await invalidateSettingsCache();
  return merged;
}

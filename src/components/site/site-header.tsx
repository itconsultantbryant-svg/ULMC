import { HeaderClient } from "./header-client";
import { getCategories, getVisibleAnnouncements } from "@/server/public-queries";
import { DEFAULT_SETTINGS, readSiteSettings, type SiteSettings } from "@/server/settings";

export async function SiteHeader() {
  let settings: SiteSettings = DEFAULT_SETTINGS;
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let announcement: Awaited<ReturnType<typeof getVisibleAnnouncements>>[number] | null = null;

  try {
    const [nextSettings, nextCategories, announcements] = await Promise.all([
      readSiteSettings(),
      getCategories(),
      getVisibleAnnouncements(1),
    ]);
    settings = nextSettings;
    categories = nextCategories;
    announcement = announcements[0] ?? null;
  } catch (error) {
    console.error("Failed to load site header data", error);
  }

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Africa/Monrovia",
  }).format(new Date());

  return (
    <HeaderClient
      settings={settings}
      dateLabel={dateLabel}
      categories={categories.map((category) => ({ slug: category.slug, name: category.name }))}
      announcement={
        announcement
          ? {
              id: announcement.id,
              message: announcement.message,
              level: announcement.level,
              linkLabel: announcement.linkLabel,
              linkUrl: announcement.linkUrl,
            }
          : null
      }
    />
  );
}

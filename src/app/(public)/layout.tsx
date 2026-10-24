import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { AnalyticsTracker } from "@/components/site/analytics";
import { readSiteSettings } from "@/server/settings";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await readSiteSettings();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollegeOrUniversity",
    name: settings.institutionName,
    department: {
      "@type": "Organization",
      name: settings.siteName,
      url: env.siteUrl,
      logo: `${env.siteUrl}/brand/department-seal-400.webp`,
      email: settings.contactEmail || undefined,
    },
    url: env.siteUrl,
  };

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <SiteHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter settings={settings} />
      <AnalyticsTracker />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}

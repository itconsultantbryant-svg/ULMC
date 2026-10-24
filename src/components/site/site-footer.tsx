import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import type { SiteSettings } from "@/server/settings";
import { departmentContact } from "@/content/team";

const explore = [
  { href: "/news", label: "Newsroom" },
  { href: "/about", label: "About the department" },
  { href: "/team", label: "Leadership and team" },
  { href: "/academics", label: "Academic programmes" },
  { href: "/faculty", label: "Faculty and staff" },
  { href: "/student-journalism", label: "The Varsity Pilot" },
  { href: "/multimedia", label: "Multimedia" },
];

const resources = [
  { href: "/events", label: "Events calendar" },
  { href: "/resources", label: "Downloads and resources" },
  { href: "/search", label: "Search the site" },
  { href: "/newsletter", label: "Newsletter" },
  { href: "/contact", label: "Contact the department" },
];

const policies = [
  { href: "/policies/editorial", label: "Editorial standards" },
  { href: "/policies/corrections", label: "Corrections policy" },
  { href: "/policies/comments", label: "Comments policy" },
  { href: "/policies/accessibility", label: "Accessibility statement" },
  { href: "/privacy", label: "Privacy notice" },
  { href: "/terms", label: "Terms of use" },
];

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const socials = [
    { key: "facebook", label: "Facebook", href: settings.social.facebook },
    { key: "x", label: "X", href: settings.social.x },
    { key: "instagram", label: "Instagram", href: settings.social.instagram },
    { key: "youtube", label: "YouTube", href: settings.social.youtube },
    { key: "linkedin", label: "LinkedIn", href: settings.social.linkedin },
  ].filter((item) => Boolean(item.href));

  return (
    <footer className="mt-16 bg-navy text-white">
      <div className="container-page grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="mb-4 inline-block rounded bg-white p-2">
            <Logo size="sm" linked={false} />
          </div>
          <p className="font-serif text-xl leading-tight text-white">{settings.siteName}</p>
          <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/55">
            Online Newspaper · {departmentContact.department}
          </p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/70">{settings.tagline}</p>
          {socials.length > 0 ? (
            <ul className="mt-5 flex flex-wrap gap-3">
              {socials.map((item) => (
                <li key={item.key}>
                  <a
                    href={item.href}
                    className="text-xs font-semibold text-white/80 underline decoration-white/30 underline-offset-4 hover:text-white"
                    rel="noopener noreferrer"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <FooterColumn title="Explore" links={explore} />
        <FooterColumn title="Resources" links={resources} />
        <FooterColumn title="Policies" links={policies} />
      </div>

      <div className="border-t border-white/15">
        <div className="container-page flex flex-col gap-4 py-6 text-xs text-white/65 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-2">
            <p>
              © {new Date().getFullYear()} {settings.siteName}, {departmentContact.department},{" "}
              {settings.institutionName}. All rights reserved.
            </p>
            <p>
              The Varsity Pilot is the practicum newspaper of the Department of Communication and
              Media Studies. It does not replace the University of Liberia&apos;s official admissions,
              registration or student information systems.
            </p>
          </div>
          <div className="space-y-1 md:text-right">
            {settings.address ? <p>{settings.address}</p> : <p>Office address to be confirmed.</p>}
            {settings.contactEmail ? (
              <p>
                <a className="hover:text-white hover:underline" href={`mailto:${settings.contactEmail}`}>
                  {settings.contactEmail}
                </a>
              </p>
            ) : null}
            <p>
              <a className="hover:text-white hover:underline" href={`mailto:${departmentContact.chairmanEmail}`}>
                {departmentContact.chairmanEmail}
              </a>
            </p>
            {settings.contactPhone ? <p>{settings.contactPhone}</p> : null}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h2 className="mb-3 font-sans text-[0.7rem] font-bold uppercase tracking-[0.16em] text-white/55">
        {title}
      </h2>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-white/80 hover:text-white hover:underline underline-offset-4"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

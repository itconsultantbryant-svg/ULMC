"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/ui/logo";
import type { SiteSettings } from "@/server/settings";

export type HeaderCategory = { slug: string; name: string };
export type HeaderAnnouncement = {
  id: string;
  message: string;
  level: string;
  linkLabel: string | null;
  linkUrl: string | null;
};

const PRIMARY_LINKS = [
  { href: "/news", label: "News" },
  { href: "/news/category/editorial", label: "Editorials" },
  { href: "/news/category/opinion", label: "Op-Ed" },
  { href: "/multimedia", label: "Multimedia" },
  { href: "/student-journalism", label: "Student Journalism" },
  { href: "/about", label: "About" },
  { href: "/team", label: "Our Team" },
  { href: "/contact", label: "Contact" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SearchForm({ id, onDone }: { id: string; onDone?: () => void }) {
  return (
    <form action="/search" role="search" className="flex w-full items-center gap-2" onSubmit={onDone}>
      <label htmlFor={id} className="sr-only">
        Search news and pages
      </label>
      <input
        id={id}
        type="search"
        name="q"
        placeholder="Search stories, people, pages…"
        className="field h-10 min-h-0 bg-white text-sm"
        autoComplete="off"
      />
      <button type="submit" className="btn btn-primary btn-sm h-10 min-h-0 px-3">
        Search
      </button>
    </form>
  );
}

export function HeaderClient({
  settings,
  categories,
  announcement,
  dateLabel,
}: {
  settings: SiteSettings;
  categories: HeaderCategory[];
  announcement: HeaderAnnouncement | null;
  dateLabel: string;
}) {
  const pathname = usePathname();
  const navItems = [
    PRIMARY_LINKS[0],
    ...categories
      .filter((category) => !["news", "multimedia"].includes(category.slug))
      .slice(0, 7)
      .map((category) => ({ href: `/news/category/${category.slug}`, label: category.name })),
    ...PRIMARY_LINKS.slice(1),
  ];
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a,button,input")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!announcement) return;
    try {
      setDismissed(window.localStorage.getItem(`announcement:${announcement.id}`) === "1");
    } catch {
      setDismissed(false);
    }
  }, [announcement]);

  const dismissAnnouncement = () => {
    if (!announcement) return;
    setDismissed(true);
    try {
      window.localStorage.setItem(`announcement:${announcement.id}`, "1");
    } catch {
      /* storage unavailable */
    }
  };

  const showAnnouncement = announcement && !dismissed && settings.announcementEnabled;

  return (
    <header className="relative z-30 border-b border-line bg-white">
      <div className="bg-navy text-white">
        <div className="container-page flex h-9 items-center justify-between gap-3 text-[0.72rem]">
          <p className="flex min-w-0 items-center gap-2">
            <span className="truncate font-semibold tracking-wide">{dateLabel}</span>
            <span className="hidden text-white/40 sm:inline" aria-hidden="true">
              /
            </span>
            <span className="hidden truncate text-white/75 sm:inline">
              Department of Communication and Media Studies
            </span>
          </p>
          <div className="flex flex-none items-center gap-4">
            {settings.social.facebook ? (
              <a
                href={settings.social.facebook}
                className="hidden text-white/85 hover:text-white hover:underline sm:inline"
                rel="noopener noreferrer"
                target="_blank"
              >
                Facebook
              </a>
            ) : null}
            <Link href="/studio/login" className="font-semibold text-white hover:underline">
              Staff login
            </Link>
          </div>
        </div>
      </div>

      <div className="container-page grid items-center gap-4 py-5 sm:grid-cols-[1fr_auto_1fr] sm:py-6">
        <p className="hidden text-[0.63rem] font-semibold uppercase leading-relaxed tracking-[0.16em] text-muted sm:block">
          Lux In Tenebris
          <span className="mt-1 block font-normal normal-case tracking-normal text-muted/80">
            Illuminating journalism for a brighter future
          </span>
        </p>

        <div className="flex justify-center">
          <Logo size="md" variant="pilot" priority />
        </div>

        <div className="flex items-center justify-center gap-2 sm:justify-end">
          <div className="hidden w-56 flex-none lg:block">
            <SearchForm id="site-search" />
          </div>
          <button
            ref={menuButtonRef}
            type="button"
            className="btn btn-outline btn-sm lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            {open ? (
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
            Menu
          </button>
        </div>
      </div>

      <nav aria-label="Primary" className="hidden border-t border-line lg:block">
        <div className="container-page flex h-11 items-stretch gap-1 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center px-2.5 text-[0.82rem] font-semibold transition-colors hover:text-red ${
                  active ? "text-red" : "text-ink"
                }`}
              >
                {item.label}
                {active ? (
                  <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t bg-red" aria-hidden="true" />
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      {showAnnouncement ? (
        <div className="news-rail border-t border-navy-deep">
          <div className="container-page relative flex items-start gap-3 py-2.5 text-[0.82rem] text-white">
            <span className="relative z-10 hidden min-w-20 text-[0.68rem] font-black uppercase tracking-[0.13em] sm:block">Breaking</span>
            <span className="ticker-dot mt-1.5 bg-white" aria-hidden="true" />
            <p className="flex-1 text-white/90">
              <span className="font-semibold text-white">Campus update: </span>
              {announcement.message}
              {announcement.linkUrl && announcement.linkLabel ? (
                <>
                  {" "}
                  <a
                    href={announcement.linkUrl}
                    className="font-semibold text-white underline decoration-white/50"
                    rel="noopener noreferrer"
                  >
                    {announcement.linkLabel}
                  </a>
                </>
              ) : null}
            </p>
            <button
              type="button"
              onClick={dismissAnnouncement}
              className="rounded p-1 text-white/65 hover:bg-white/10 hover:text-white"
              aria-label="Dismiss announcement"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-navy/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] flex-col overflow-y-auto bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="font-serif text-lg text-navy">Menu</span>
              <button
                type="button"
                className="rounded p-2 text-ink hover:bg-mist"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="border-b border-line px-4 py-3">
              <SearchForm id="mobile-search" onDone={() => setOpen(false)} />
            </div>
            <nav aria-label="Mobile" className="flex-1 px-2 py-3">
              <ul>
                {navItems.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`flex min-h-[44px] items-center rounded px-3 text-[0.95rem] font-semibold ${
                          active ? "bg-navy-tint text-navy" : "text-ink hover:bg-mist"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {categories.length > 0 ? (
                <div className="mt-4 border-t border-line pt-4">
                  <p className="px-3 text-[0.7rem] font-bold uppercase tracking-widest text-muted">
                    Newsroom sections
                  </p>
                  <ul className="mt-1">
                    {categories.slice(0, 8).map((category) => (
                      <li key={category.slug}>
                        <Link
                          href={`/news/category/${category.slug}`}
                          className="flex min-h-[40px] items-center rounded px-3 text-sm text-muted hover:bg-mist hover:text-navy"
                        >
                          {category.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </nav>
            <div className="border-t border-line p-4">
              <Link href="/studio/login" className="btn btn-primary w-full" onClick={() => setOpen(false)}>
                Staff login
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

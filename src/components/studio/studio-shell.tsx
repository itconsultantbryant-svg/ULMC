"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Images,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { authClient } from "@/lib/auth-client";

export type StudioNavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
  exact?: boolean;
  group?: "Create" | "Manage" | "Measure" | "System";
};

const ICONS: Record<string, React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  dashboard: LayoutDashboard,
  articles: FileText,
  review: ClipboardCheck,
  approvals: ShieldCheck,
  comments: MessageSquare,
  media: Images,
  analytics: BarChart3,
  users: Users,
  events: CalendarDays,
  content: LayoutTemplate,
  settings: Settings,
  audit: ScrollText,
};

function isActive(pathname: string, item: StudioNavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function StudioShell({
  user,
  nav,
  unread,
  children,
}: {
  user: { name: string; email: string; roleLabel: string };
  nav: StudioNavItem[];
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const groupedNav = nav.reduce<Record<string, StudioNavItem[]>>((groups, item) => {
    const group = item.group ?? "Manage";
    (groups[group] ??= []).push(item);
    return groups;
  }, {});

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/studio/login");
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-[4.5rem] items-center justify-between border-b border-white/10 px-4">
        <Link href="/studio" className="rounded-lg bg-white p-1.5 shadow-lg shadow-black/10">
          <Logo size="sm" linked={false} />
        </Link>
        <button
          type="button"
          className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="border-b border-white/10 bg-white/[0.035] px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Editorial workspace</p>
        <p className="mt-1 truncate text-sm font-semibold text-white">{user.name}</p>
        <p className="truncate text-xs text-white/50">{user.roleLabel}</p>
      </div>

      <nav aria-label="Studio" className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
        {Object.entries(groupedNav).map(([group, items]) => (
          <div key={group}>
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">{group}</p>
            <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = ICONS[item.icon] ?? FileText;
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={[
                "studio-nav-link",
                active
                  ? "studio-nav-link-active bg-white/15 font-semibold text-white shadow-sm"
                  : "text-white/65 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-red px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-2">
        <Link
          href="/"
          className="flex items-center gap-3 rounded px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          View public site
        </Link>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-mist">
      <a href="#studio-main" className="skip-link">
        Skip to workspace content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 bg-[linear-gradient(160deg,#0a0a38_0%,#10104f_58%,#25256e_100%)] lg:block">{sidebar}</aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-navy/60"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-[linear-gradient(160deg,#0a0a38_0%,#10104f_58%,#25256e_100%)] shadow-xl">{sidebar}</aside>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-line/80 bg-white/85 backdrop-blur-xl">
          <div className="flex h-[4.5rem] items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded border border-line p-2 text-navy hover:bg-mist lg:hidden"
              aria-label="Open navigation"
              aria-expanded={open}
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>

            <form action="/studio/articles" className="hidden max-w-md flex-1 items-center md:flex">
              <label htmlFor="studio-search" className="sr-only">
                Search stories
              </label>
              <div className="relative w-full">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  aria-hidden
                />
                <input
                  id="studio-search"
                  type="search"
                  name="q"
                  placeholder="Search stories, authors, drafts…"
                  className="field py-2 pl-9"
                />
              </div>
            </form>

            <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
              <div className="hidden items-center gap-1.5 rounded-full border border-success/20 bg-success-tint px-2.5 py-1 text-[11px] font-semibold text-success xl:flex">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Workspace live
              </div>
              <Link
                href="/studio/articles/new"
                className="btn btn-primary hidden px-3 py-2 text-xs sm:inline-flex"
              >
                <Plus className="h-4 w-4" aria-hidden />
                New story
              </Link>
              <Link
                href="/studio/notifications"
                className="relative rounded p-2 text-navy hover:bg-mist"
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
              >
                <Bell className="h-5 w-5" aria-hidden />
                {unread > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Link>
              <div className="hidden items-center gap-2 border-l border-line pl-3 sm:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                  {initials || "UL"}
                </span>
                <div className="text-xs leading-tight">
                  <p className="font-semibold text-ink">{user.name}</p>
                  <p className="text-muted">{user.roleLabel}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main id="studio-main" className="page-enter mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

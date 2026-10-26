import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { StudioShell, type StudioNavItem } from "@/components/studio/studio-shell";
import { requirePageUser, requiresMfaSetup } from "@/server/session";
import { getStudioCounts } from "@/server/studio/queries";
import { can, roleLabel } from "@/server/permissions";

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "/studio";
  const { user } = await requirePageUser(pathname);

  if (await requiresMfaSetup(user)) {
    if (!pathname.startsWith("/studio/security")) {
      redirect("/studio/security?required=1");
    }
  }

  const counts = await getStudioCounts(user);

  const nav: StudioNavItem[] = [
    { href: "/studio", label: "Dashboard", icon: "dashboard", exact: true, group: "Create" },
    {
      href: "/studio/articles",
      label: "Stories",
      icon: "articles",
      badge: counts.myDrafts,
      group: "Create",
    },
  ];

  if (can(user, "editorial.viewQueue")) {
    nav.push({
      href: "/studio/review",
      label: "Editorial review",
      icon: "review",
      badge: counts.review,
      group: "Manage",
    });
  }
  if (can(user, "admin.viewApprovalQueue")) {
    nav.push({
      href: "/studio/approvals",
      label: "Approvals",
      icon: "approvals",
      badge: counts.approvals,
      group: "Manage",
    });
  }
  if (can(user, "comments.moderate")) {
    nav.push({
      href: "/studio/comments",
      label: "Comments",
      icon: "comments",
      badge: counts.pendingComments,
      group: "Manage",
    });
  }
  if (can(user, "media.upload")) {
    nav.push({ href: "/studio/media", label: "Media", icon: "media", group: "Create" });
  }
  nav.push({ href: "/studio/analytics", label: "Analytics", icon: "analytics", group: "Measure" });
  if (can(user, "users.view")) {
    nav.push({ href: "/studio/users", label: "People", icon: "users", group: "System" });
  }
  if (can(user, "events.manage")) {
    nav.push({ href: "/studio/events", label: "Events", icon: "events", group: "Manage" });
  }
  if (can(user, "institutional.manage")) {
    nav.push({ href: "/studio/academics", label: "Academics", icon: "content", group: "Manage" });
    nav.push({ href: "/studio/faculty", label: "Faculty", icon: "users", group: "Manage" });
  }
  if (can(user, "homepage.manage") || can(user, "institutional.manage")) {
    nav.push({ href: "/studio/content", label: "Department content", icon: "content", group: "Manage" });
  }
  if (can(user, "advertising.manage")) {
    nav.push({ href: "/studio/advertising", label: "Advertising", icon: "content", group: "Manage" });
  }
  if (can(user, "settings.manage")) {
    nav.push({ href: "/studio/settings", label: "Settings", icon: "settings", group: "System" });
  }
  if (can(user, "audit.view")) {
    nav.push({ href: "/studio/audit", label: "Audit log", icon: "audit", group: "System" });
  }

  return (
    <StudioShell
      user={{ name: user.name, email: user.email, roleLabel: roleLabel(user.role) }}
      nav={nav}
      unread={counts.unread}
    >
      {children}
    </StudioShell>
  );
}

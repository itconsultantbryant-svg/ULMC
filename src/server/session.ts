import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { HttpError } from "@/server/http";
import { can, canAny, isPrivileged, parseRoles, type Permission } from "@/server/permissions";
import { readSiteSettings } from "@/server/settings";

export type StaffUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  roles: ReturnType<typeof parseRoles>;
  title: string | null;
  slug: string | null;
  twoFactorEnabled: boolean;
};

export type AuthContext = {
  user: StaffUser;
  sessionId: string;
  expiresAt: Date;
};

export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return null;
    const raw = session.user as typeof session.user & {
      role?: string | null;
      title?: string | null;
      slug?: string | null;
      twoFactorEnabled?: boolean | null;
      banned?: boolean | null;
    };
    if (raw.banned) return null;
    return {
      user: {
        id: raw.id,
        name: raw.name,
        email: raw.email,
        image: raw.image ?? null,
        role: raw.role ?? "staff",
        roles: parseRoles(raw.role ?? "staff"),
        title: raw.title ?? null,
        slug: raw.slug ?? null,
        twoFactorEnabled: Boolean(raw.twoFactorEnabled),
      },
      sessionId: session.session.id,
      expiresAt: session.session.expiresAt,
    };
  } catch (error) {
    console.error("Failed to read session", error);
    return null;
  }
});

export async function getCurrentUser(): Promise<StaffUser | null> {
  return (await getAuthContext())?.user ?? null;
}

export async function requireApiUser(): Promise<AuthContext> {
  const context = await getAuthContext();
  if (!context) throw new HttpError(401, "Please sign in to continue.");
  return context;
}

export async function requireApiPermission(permission: Permission): Promise<AuthContext> {
  const context = await requireApiUser();
  if (!can(context.user, permission)) {
    throw new HttpError(403, "You do not have permission to perform this action.");
  }
  return context;
}

export async function requireApiAny(permissions: Permission[]): Promise<AuthContext> {
  const context = await requireApiUser();
  if (!canAny(context.user, permissions)) {
    throw new HttpError(403, "You do not have permission to perform this action.");
  }
  return context;
}

export async function requirePageUser(nextPath: string): Promise<AuthContext> {
  const context = await getAuthContext();
  if (!context) {
    redirect(`/studio/login?next=${encodeURIComponent(nextPath)}`);
  }
  return context;
}

export async function requirePagePermission(
  permission: Permission,
  nextPath: string,
): Promise<AuthContext> {
  const context = await requirePageUser(nextPath);
  if (!can(context.user, permission)) {
    redirect("/studio/forbidden");
  }
  return context;
}

export async function requiresMfaSetup(user: StaffUser): Promise<boolean> {
  if (!isPrivileged(user)) return false;
  const settings = await readSiteSettings();
  if (!settings.requireMfaForPrivileged) return false;
  return !user.twoFactorEnabled;
}
export async function assertMfaCompliant(user: StaffUser): Promise<void> {
  if (await requiresMfaSetup(user)) {
    throw new HttpError(403, "Set up two-factor authentication before continuing.", {
      code: "mfa_setup_required",
    });
  }
}

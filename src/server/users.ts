import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { auditLog, invitation, session, twoFactor, user } from "@/server/db/schema";
import { HttpError } from "@/server/http";
import { randomToken, sha256, slugify } from "@/server/ids";
import { can, ROLES, type Role } from "@/server/permissions";
import type { StaffUser } from "@/server/session";
import { inviteEmail, sendMail } from "@/server/email";
import { env } from "@/lib/env";
import { auth } from "@/server/auth";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const INVITABLE: Role[] = ["staff", "editor", "admin"];

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function uniqueUserSlug(name: string): Promise<string> {
  const base = slugify(name) || "staff";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const [taken] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.slug, candidate))
      .limit(1);
    if (!taken) return candidate;
  }
  return `${base}-${randomToken(4).toLowerCase()}`;
}

export async function createInvitation(
  actor: StaffUser,
  input: { email: string; name?: string; role: string },
): Promise<{ invitationId: string; inviteUrl: string; expiresAt: Date }> {
  if (!can(actor, "users.invite")) throw new HttpError(403, "You cannot invite staff.");
  const email = normalizeEmail(input.email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "Enter a valid email address.");
  const role = input.role as Role;
  if (!INVITABLE.includes(role)) throw new HttpError(400, "Choose a valid role.");
  if ((role === "admin" || role === "super_admin") && !can(actor, "roles.manage")) {
    throw new HttpError(403, "Only a super administrator can invite administrators.");
  }

  const [existingUser] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (existingUser) throw new HttpError(409, "An account with that email already exists.");

  const [pending] = await db
    .select({ id: invitation.id })
    .from(invitation)
    .where(
      and(
        sql`lower(${invitation.email}) = ${email}`,
        isNull(invitation.acceptedAt),
        isNull(invitation.revokedAt),
      ),
    )
    .limit(1);
  if (pending) throw new HttpError(409, "There is already a pending invitation for that email.");

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const [row] = await db
    .insert(invitation)
    .values({
      email,
      name: input.name?.trim() || null,
      role,
      tokenHash: sha256(token),
      invitedBy: actor.id,
      expiresAt,
    })
    .returning({ id: invitation.id });
  if (!row) throw new HttpError(500, "Could not create the invitation.");

  const inviteUrl = `${env.siteUrl}/studio/accept-invite?token=${token}`;
  const mail = inviteEmail({ name: input.name, role, url: inviteUrl });
  await sendMail({ to: email, ...mail });

  await db.insert(auditLog).values({
    actorId: actor.id,
    action: "user.invited",
    entityType: "user",
    entityId: row.id,
    metadata: { email, role },
  });

  return { invitationId: row.id, inviteUrl, expiresAt };
}

export type PendingInvitation = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  expiresAt: Date;
};

export async function findInvitationByToken(token: string): Promise<PendingInvitation | null> {
  if (!token || token.length < 20) return null;
  const [row] = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    })
    .from(invitation)
    .where(
      and(
        eq(invitation.tokenHash, sha256(token)),
        isNull(invitation.acceptedAt),
        isNull(invitation.revokedAt),
      ),
    )
    .limit(1);
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

export async function acceptInvitation(input: {
  token: string;
  name: string;
  password: string;
}): Promise<{ email: string }> {
  const pending = await findInvitationByToken(input.token);
  if (!pending) throw new HttpError(400, "This invitation is invalid or has expired.");
  if (input.name.trim().length < 2) throw new HttpError(400, "Enter your full name.");
  if (input.password.length < 12) throw new HttpError(400, "Use a password of at least 12 characters.");

  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, pending.email)).limit(1);
  if (existing) throw new HttpError(409, "An account already exists for this email. Sign in instead.");

  const result = await auth.api.signUpEmail({
    body: { email: pending.email, password: input.password, name: input.name.trim() },
  });
  const created = result?.user as { id?: string } | undefined;
  if (!created?.id) throw new HttpError(500, "Could not create the account.");

  const slug = await uniqueUserSlug(input.name.trim());
  await db
    .update(user)
    .set({ role: pending.role, slug, emailVerified: true })
    .where(eq(user.id, created.id));

  await db
    .update(invitation)
    .set({ acceptedAt: new Date() })
    .where(eq(invitation.id, pending.id));

  await db.insert(auditLog).values({
    actorId: created.id,
    action: "user.invitation_accepted",
    entityType: "user",
    entityId: created.id,
    metadata: { email: pending.email, role: pending.role },
  });

  return { email: pending.email };
}

export async function updateUserByAdmin(
  actor: StaffUser,
  targetId: string,
  input: { role?: string; banned?: boolean; banReason?: string; name?: string; title?: string; bio?: string; slug?: string },
): Promise<void> {
  if (!can(actor, "users.manage")) throw new HttpError(403, "You cannot manage users.");
  const [target] = await db.select().from(user).where(eq(user.id, targetId)).limit(1);
  if (!target) throw new HttpError(404, "User not found.");

  if (input.role !== undefined) {
    if (!can(actor, "roles.manage")) throw new HttpError(403, "Only a super administrator can change roles.");
    if (!ROLES.includes(input.role as Role)) throw new HttpError(400, "Unknown role.");
    if (target.id === actor.id) throw new HttpError(400, "You cannot change your own role.");
    if (target.role.includes("super_admin") && input.role !== "super_admin") {
      const [count] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(user)
        .where(sql`${user.role} LIKE '%super_admin%'`);
      if ((count?.total ?? 0) <= 1) throw new HttpError(400, "The last super administrator cannot be demoted.");
    }
  }

  if (input.banned !== undefined && input.banned && target.id === actor.id) {
    throw new HttpError(400, "You cannot suspend your own account.");
  }

  const patch: Partial<typeof user.$inferInsert> = { updatedAt: new Date() };
  if (input.role !== undefined) patch.role = input.role;
  if (input.banned !== undefined) {
    patch.banned = input.banned;
    patch.banReason = input.banned ? input.banReason?.trim() || "Suspended by administrator" : null;
    patch.banExpires = null;
  }
  if (input.name !== undefined) patch.name = input.name.trim().slice(0, 120);
  if (input.title !== undefined) patch.title = input.title.trim().slice(0, 120) || null;
  if (input.bio !== undefined) patch.bio = input.bio.trim().slice(0, 2000) || null;
  if (input.slug !== undefined) {
    const slug = slugify(input.slug);
    if (!slug) throw new HttpError(400, "Enter a valid public slug.");
    const [taken] = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.slug, slug), sql`${user.id} <> ${targetId}`))
      .limit(1);
    if (taken) throw new HttpError(409, "That public slug is already in use.");
    patch.slug = slug;
  }

  await db.update(user).set(patch).where(eq(user.id, targetId));

  if (input.banned) {
    await db.delete(session).where(eq(session.userId, targetId));
  }

  await db.insert(auditLog).values({
    actorId: actor.id,
    action: input.banned === true ? "user.suspended" : input.banned === false ? "user.reinstated" : "user.updated",
    entityType: "user",
    entityId: targetId,
    metadata: { fields: Object.keys(patch), role: patch.role ?? target.role },
  });
}

export async function resetUserMfa(actor: StaffUser, targetId: string): Promise<void> {
  if (!can(actor, "users.manage")) throw new HttpError(403, "You cannot reset two-factor authentication.");
  const [target] = await db.select({ id: user.id }).from(user).where(eq(user.id, targetId)).limit(1);
  if (!target) throw new HttpError(404, "User not found.");
  await db.delete(twoFactor).where(eq(twoFactor.userId, targetId));
  await db.update(user).set({ twoFactorEnabled: false, updatedAt: new Date() }).where(eq(user.id, targetId));
  await db.insert(auditLog).values({
    actorId: actor.id,
    action: "user.mfa_reset",
    entityType: "user",
    entityId: targetId,
    metadata: {},
  });
}

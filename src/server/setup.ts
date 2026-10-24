import { randomUUID } from "node:crypto";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { env } from "@/lib/env";
import { auth } from "@/server/auth";
import { db } from "@/server/db/client";
import { account, auditLog, user } from "@/server/db/schema";
import { HttpError } from "@/server/http";
import { safeEqual } from "@/server/ids";
import { slugify } from "@/server/ids";

export const setupSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  password: z.string().min(12).max(128),
});

export async function hasAnyUser(): Promise<boolean> {
  const [row] = await db.select({ value: count() }).from(user);
  return Number(row?.value ?? 0) > 0;
}

export async function setupStatus(): Promise<{ needsSetup: boolean; tokenConfigured: boolean }> {
  return { needsSetup: !(await hasAnyUser()), tokenConfigured: Boolean(env.setupToken) };
}

export async function createFirstSuperAdmin(input: {
  token: string;
  name: string;
  email: string;
  password: string;
}): Promise<{ id: string }> {
  if (!env.setupToken) {
    throw new HttpError(503, "Setup is disabled because SETUP_TOKEN is not configured.");
  }
  if (!safeEqual(env.setupToken, input.token)) {
    throw new HttpError(403, "The setup token is invalid.");
  }
  if (await hasAnyUser()) {
    throw new HttpError(409, "Setup has already been completed. Sign in instead.");
  }
  const parsed = setupSchema.safeParse(input);
  if (!parsed.success) {
    throw new HttpError(400, "Enter a name, a valid email and a password of at least 12 characters.");
  }

  const email = parsed.data.email.toLowerCase();
  const passwordHash = await auth.$context.then((context) => context.password.hash(parsed.data.password));
  const id = randomUUID();
  const baseSlug = slugify(parsed.data.name) || "administrator";

  await db.transaction(async (tx) => {
    const [existing] = await tx.select({ value: count() }).from(user);
    if (Number(existing?.value ?? 0) > 0) throw new HttpError(409, "Setup has already been completed.");

    let slug = baseSlug;
    const [slugTaken] = await tx.select({ id: user.id }).from(user).where(eq(user.slug, slug)).limit(1);
    if (slugTaken) slug = `${baseSlug}-${id.slice(0, 6)}`;

    await tx.insert(user).values({
      id,
      name: parsed.data.name,
      email,
      emailVerified: true,
      role: "super_admin",
      slug,
      title: "Editor-in-chief",
    });
    await tx.insert(account).values({
      id: randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: passwordHash,
    });
    await tx.insert(auditLog).values({
      actorId: id,
      action: "setup.completed",
      entityType: "user",
      entityId: id,
      metadata: { email, role: "super_admin" },
    });
  });

  return { id };
}

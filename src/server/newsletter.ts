import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { newsletterSubscriber } from "@/server/db/schema";
import { env } from "@/lib/env";
import { sendMail } from "@/server/email";
import { hmac, randomToken, sha256, safeEqual } from "@/server/ids";

export function unsubscribeSignature(id: string): string {
  return hmac(`unsubscribe:${id}`, env.mediaSigningSecret).slice(0, 40);
}

export function unsubscribeUrl(id: string): string {
  return `${env.siteUrl}/newsletter/unsubscribe?id=${id}&sig=${unsubscribeSignature(id)}`;
}

export async function subscribeToNewsletter(
  email: string,
  ipHash: string | null,
): Promise<{ ok: true }> {
  const normalized = email.trim().toLowerCase();
  const token = randomToken(32);
  const tokenHash = sha256(token);

  await db
    .insert(newsletterSubscriber)
    .values({ email: normalized, status: "pending", confirmTokenHash: tokenHash, ipHash })
    .onConflictDoUpdate({
      target: newsletterSubscriber.email,
      set: {
        status: "pending",
        confirmTokenHash: tokenHash,
        ipHash,
        confirmedAt: null,
        unsubscribedAt: null,
      },
    });

  const confirmUrl = `${env.siteUrl}/newsletter/confirm?token=${encodeURIComponent(token)}`;
  const unsub = `${env.siteUrl}/newsletter`;
  void sendMail({
    to: normalized,
    subject: "Confirm your department newsletter subscription",
    text: [
      "Hello,",
      "",
      "Please confirm that you want to receive occasional email updates from The Varsity Pilot, the student newspaper of the Department of Communication and Media Studies at the University of Liberia.",
      "",
      `Confirm your subscription: ${confirmUrl}`,
      "",
      "If you did not request this, you can ignore this message. You will not be subscribed unless you confirm.",
      "",
      `Privacy notice: ${unsub}`,
    ].join("\n"),
  }).catch((error) => console.error("Newsletter confirmation email failed", error));

  return { ok: true };
}

export async function confirmNewsletterToken(token: string): Promise<boolean> {
  if (!token || token.length < 20) return false;
  const tokenHash = sha256(token);
  const rows = await db
    .select({ id: newsletterSubscriber.id })
    .from(newsletterSubscriber)
    .where(
      and(
        eq(newsletterSubscriber.confirmTokenHash, tokenHash),
        eq(newsletterSubscriber.status, "pending"),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return false;
  await db
    .update(newsletterSubscriber)
    .set({ status: "confirmed", confirmedAt: new Date(), confirmTokenHash: null, unsubscribedAt: null })
    .where(eq(newsletterSubscriber.id, row.id));
  return true;
}

export async function unsubscribeNewsletter(id: string, signature: string): Promise<boolean> {
  const expected = unsubscribeSignature(id);
  if (!safeEqual(expected, signature)) return false;
  const result = await db
    .update(newsletterSubscriber)
    .set({ status: "unsubscribed", unsubscribedAt: new Date() })
    .where(eq(newsletterSubscriber.id, id))
    .returning({ id: newsletterSubscriber.id });
  return result.length > 0;
}

export async function countSubscribers(): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(newsletterSubscriber)
    .where(eq(newsletterSubscriber.status, "confirmed"));
  return Number(rows[0]?.count ?? 0);
}

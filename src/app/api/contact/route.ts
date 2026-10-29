import { z } from "zod";
import { db } from "@/server/db/client";
import { contactMessage } from "@/server/db/schema";
import { errorResponse, HttpError, readJson } from "@/server/http";
import { clientIp, hashIp, isLikelyBot } from "@/server/ids";
import { rateLimit, tooManyRequests } from "@/server/rate-limit";
import { sendMail } from "@/server/email";
import { readSiteSettings } from "@/server/settings";
import { notifyUsers } from "@/server/notifications";
import { user } from "@/server/db/schema";
import { and, eq, inArray, like, or } from "drizzle-orm";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  subject: z.string().trim().min(2).max(120),
  body: z.string().trim().min(10).max(6000),
  website: z.string().max(200).optional().default(""),
});

export async function POST(request: Request) {
  try {
    const ip = clientIp(request.headers);
    const userAgent = request.headers.get("user-agent");
    if (isLikelyBot(userAgent)) {
      return Response.json({ ok: true, message: "Thank you. Your message has been received." });
    }
    const limited = rateLimit(`contact:${ip ?? "unknown"}`, 5, 10 * 60_000);
    if (!limited.ok) return tooManyRequests(limited.retryAfter);

    const payload = await readJson(request);
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new HttpError(400, "Please check the form and try again.", parsed.error.flatten());
    }
    if (parsed.data.website) {
      return Response.json({ ok: true, message: "Thank you. Your message has been received." });
    }

    const settings = await readSiteSettings();
    const [message] = await db.insert(contactMessage).values({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      subject: parsed.data.subject,
      body: parsed.data.body,
      ipHash: hashIp(ip),
      userAgent: userAgent?.slice(0, 300) ?? null,
    }).returning({ id: contactMessage.id });

    const administrators = await db
      .select({ id: user.id })
      .from(user)
      .where(
        and(
          eq(user.banned, false),
          or(
            inArray(user.role, ["admin", "super_admin"]),
            like(user.role, "%admin%"),
          ),
        ),
      );
    await notifyUsers(db, {
      userIds: administrators.map((administrator) => administrator.id),
      type: "contact.new",
      title: "New website enquiry",
      body: `${parsed.data.name} sent a ${parsed.data.subject} enquiry.`,
      link: "/studio/submissions",
      dedupeKey: `contact:${message.id}`,
    }).catch((error) => console.error("Failed to notify administrators", error));

    if (settings.contactEmail) {
      sendMail({
        to: settings.contactEmail,
        subject: `[Website enquiry] ${parsed.data.subject}`,
        text: [
          `From: ${parsed.data.name} <${parsed.data.email}>`,
          `Subject: ${parsed.data.subject}`,
          "",
          parsed.data.body,
          "",
          "Reply directly to the sender using the email address above.",
        ].join("\n"),
      }).catch((error) => console.error("Contact notification email failed", error));
    }

    return Response.json({
      ok: true,
      message:
        "Thank you. Your message has been received. We aim to respond during normal working hours.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { db, schema } from "@/server/db/client";
import { resetPasswordEmail, sendMail, verifyEmail } from "@/server/email";

export const auth = betterAuth({
  appName: "The Varsity Pilot Editorial Workspace",
  baseURL: env.authUrl,
  secret: env.authSecret,
  trustedOrigins: env.authTrustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: false,
    camelCase: false,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    requireEmailVerification: false,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const mail = resetPasswordEmail({ name: user.name, url });
      await sendMail({ to: user.email, ...mail });
    },
  },
  emailVerification: {
    sendOnSignUp: false,
    sendVerificationEmail: async ({ user, url }) => {
      const mail = verifyEmail({ name: user.name, url });
      await sendMail({ to: user.email, ...mail });
    },
  },
  session: {
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 60,
    freshAge: 60 * 15,
    cookieCache: { enabled: false },
  },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "staff", input: false },
      banned: { type: "boolean", required: false, defaultValue: false, input: false },
      banReason: { type: "string", required: false, input: false },
      banExpires: { type: "date", required: false, input: false },
      slug: { type: "string", required: false, input: false },
      title: { type: "string", required: false, input: false },
      bio: { type: "string", required: false, input: false },
      lastLoginAt: { type: "date", required: false, input: false },
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 5 },
      "/forget-password": { window: 300, max: 5 },
      "/two-factor/verify-totp": { window: 60, max: 10 },
    },
  },
  advanced: {
    useSecureCookies: env.isProd,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.isProd,
    },
  },
  plugins: [
    twoFactor({
      issuer: "The Varsity Pilot Editorial",
      allowPasswordless: false,
    }),
    nextCookies(),
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => {
          return {
            data: {
              ...newUser,
              email: newUser.email.toLowerCase(),
            },
          };
        },
      },
    },
    session: {
      create: {
        after: async (newSession) => {
          await db
            .update(schema.user)
            .set({ lastLoginAt: new Date() })
            .where(eq(schema.user.id, newSession.userId));
        },
      },
    },
  },
});

export type AuthSession = typeof auth.$Infer.Session;

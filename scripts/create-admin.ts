import { loadEnv, log } from "./lib";

loadEnv();

async function main() {
  const [{ eq }, { auth }, { db }, { user }, { slugify }] = await Promise.all([
    import("drizzle-orm"),
    import("@/server/auth"),
    import("@/server/db/client"),
    import("@/server/db/schema"),
    import("@/server/ids"),
  ]);
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.ADMIN_NAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !name || !password) {
    throw new Error("Set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD before running this command.");
  }
  if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters.");

  async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1_000 * (attempt + 1)));
      }
    }
    throw lastError;
  }

  const [existing] = await withRetry(() => db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1));
  if (existing) {
    await withRetry(() => db.update(user).set({ name, role: "admin", banned: false, updatedAt: new Date() }).where(eq(user.id, existing.id)));
    log("admin", `updated administrator ${email}`);
    return;
  }

  const result = await withRetry(() => auth.api.signUpEmail({ body: { email, name, password } }));
  const created = result?.user as { id?: string } | undefined;
  if (!created?.id) throw new Error("Administrator account could not be created.");
  const createdId = created.id;
  await withRetry(() => db
    .update(user)
    .set({ role: "admin", slug: slugify(name) || null, emailVerified: true, updatedAt: new Date() })
    .where(eq(user.id, createdId)));
  log("admin", `created administrator ${email}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

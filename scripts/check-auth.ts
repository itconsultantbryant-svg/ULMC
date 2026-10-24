import { loadEnv, log } from "./lib";
loadEnv();
async function main() {
  const { auth } = await import("../src/server/auth");
  const ctx = await auth.$context;
  const hash = await ctx.password.hash("test-password-123");
  const ok = await ctx.password.verify({ hash, password: "test-password-123" });
  log("auth", `context ok, hash verify=${ok}`);
  const s = await auth.api.getSession({ headers: new Headers() });
  log("auth", `getSession without cookies = ${s === null ? "null" : "session"}`);
}
main().catch((e) => { console.error(e); process.exit(1); });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

function bool(name: string, fallback = false): boolean {
  const value = process.env[name];
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function int(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get siteUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  },
  get authSecret() {
    return process.env.BETTER_AUTH_SECRET || "development-only-insecure-secret-change-me";
  },
  get authUrl() {
    return process.env.BETTER_AUTH_URL || this.siteUrl;
  },
  get authTrustedOrigins() {
    return [...new Set([this.siteUrl, this.authUrl, ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS || "").split(",")])]
      .map((origin) => origin.trim().replace(/\/$/, ""))
      .filter((origin) => /^https?:\/\//.test(origin));
  },
  get siteName() {
    return process.env.SITE_NAME || "The Varsity Pilot";
  },
  get mediaSigningSecret() {
    return process.env.MEDIA_SIGNING_SECRET || this.authSecret;
  },
  get emailDriver() {
    return (process.env.EMAIL_DRIVER || "console") as "console" | "smtp";
  },
  get emailFrom() {
    return (
      process.env.EMAIL_FROM ||
      "The Varsity Pilot <masscommdept@ul.edu.lr>"
    );
  },
  get smtp() {
    return {
      host: process.env.SMTP_HOST || "",
      port: int("SMTP_PORT", 587),
      secure: bool("SMTP_SECURE", false),
      user: process.env.SMTP_USER || "",
      password: process.env.SMTP_PASSWORD || "",
    };
  },
  get storageDriver() {
    return (process.env.STORAGE_DRIVER || "local") as "local" | "s3";
  },
  get s3() {
    return {
      endpoint: process.env.S3_ENDPOINT || undefined,
      region: process.env.S3_REGION || "us-east-1",
      bucket: process.env.S3_BUCKET || "",
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
      forcePathStyle: bool("S3_FORCE_PATH_STYLE", true),
      publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || "",
    };
  },
  get workerPollMs() {
    return int("WORKER_POLL_MS", 2000);
  },
  get workerId() {
    return process.env.WORKER_ID || `worker-${process.pid}`;
  },
  get analyticsActiveWindowMinutes() {
    return int("ANALYTICS_ACTIVE_WINDOW_MINUTES", 5);
  },
  get analyticsRetentionDays() {
    return int("ANALYTICS_RETENTION_DAYS", 180);
  },
  get analyticsDemoEnabled() {
    return bool("ENABLE_ANALYTICS_DEMO", false);
  },
  get setupToken() {
    return process.env.SETUP_TOKEN || "";
  },
  get cronSecret() {
    return process.env.CRON_SECRET || "";
  },
  get isProd() {
    return process.env.NODE_ENV === "production";
  },
};

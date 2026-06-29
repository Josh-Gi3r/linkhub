/**
 * Environment configuration.
 * Security-critical values (JWT_SECRET) fail-closed: the server refuses to
 * start instead of silently using an empty key.
 */

export const ENV = {
  appId:        process.env.VITE_APP_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",

  /** SECURITY: getter throws at call-site if unset, so tokens cannot be
   *  signed/verified with an empty key (which would accept any signature). */
  get cookieSecret(): string {
    const s = process.env.JWT_SECRET ?? "";
    if (!s) {
      throw new Error(
        "JWT_SECRET must be set to a long random string. " +
          "Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
      );
    }
    return s;
  },

  databaseUrl:  process.env.DATABASE_URL ?? "",

  // ── Auth ────────────────────────────────────────────────────────────────
  /** Comma-separated list of emails auto-promoted to admin on first login */
  adminEmails:           process.env.ADMIN_EMAILS ?? "",
  /** Only allow magic-link login for this email domain (e.g. "example.com") */
  allowedEmailDomain:    process.env.ALLOWED_EMAIL_DOMAIN ?? "",
  /** 'from' address used for magic-link emails (e.g. "noreply@example.com") */
  mailerFrom:            process.env.MAILER_FROM ?? "",

  // ── Storage (AWS S3 or S3-compatible) ───────────────────────────────────
  s3Bucket:        process.env.S3_BUCKET ?? "",
  s3Region:        process.env.S3_REGION ?? "us-east-1",
  s3AccessKeyId:   process.env.S3_ACCESS_KEY_ID ?? "",
  s3SecretKey:     process.env.S3_SECRET_ACCESS_KEY ?? "",
  /** Leave blank for AWS; set for R2 / MinIO / Backblaze */
  s3Endpoint:      process.env.S3_ENDPOINT ?? "",
  /** CDN prefix (https://cdn.example.com) if bucket objects are publicly accessible */
  s3PublicUrl:     process.env.S3_PUBLIC_URL ?? "",

  // ── LLM — OpenAI-compatible (optional; only needed for AI features) ─────
  llmApiKey:  process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
  llmApiUrl:  process.env.LLM_API_URL ?? "https://api.openai.com",
  llmModel:   process.env.LLM_MODEL   ?? "gpt-4o-mini",

  // ── Webhook notification (optional) ─────────────────────────────────────
  webhookUrl:    process.env.WEBHOOK_NOTIFICATION_URL    ?? "",
  webhookSecret: process.env.WEBHOOK_NOTIFICATION_SECRET ?? "",

  // ── Legacy OAuth paths (not used in magic-link flow) ──────────────
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId:    process.env.OWNER_OPEN_ID    ?? "",
};

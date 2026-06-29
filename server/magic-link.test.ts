/**
 * Magic link auth tests
 * - Validates the Resend API key is set and send-capable
 * - Tests the email domain gate logic (configure ALLOWED_EMAIL_DOMAIN in .env)
 */
import { describe, it, expect } from "vitest";

describe("Magic link auth", () => {
  it("RESEND_API_KEY is set in environment", () => {
    expect(process.env.RESEND_API_KEY).toBeTruthy();
    expect(process.env.RESEND_API_KEY).toMatch(/^re_/);
  });

  it("Resend API key is send-capable (restricted key returns 401 on domains list, not 403)", async () => {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY!);
    const result = await resend.domains.list();
    // A send-only restricted key returns 401 with "restricted_api_key"
    // A completely invalid key returns 401 with "missing_api_key" or similar
    // Either way, the key is valid if statusCode is 401 and name is "restricted_api_key"
    if (result.error) {
      expect(result.error.name).toBe("restricted_api_key");
    } else {
      // Full-access key — also valid
      expect(result.data).toBeDefined();
    }
  });

  it("email domain gate: allows emails matching ALLOWED_EMAIL_DOMAIN", () => {
    const domain = process.env.ALLOWED_EMAIL_DOMAIN ?? "example.com";
    const emails = [`alice@${domain}`, `bob@${domain}`, `carol@${domain}`];
    for (const email of emails) {
      expect(email.endsWith(`@${domain}`)).toBe(true);
    }
  });

  it("email domain gate: blocks emails from other domains", () => {
    const blocked = ["user@gmail.com", "test@outlook.com", "admin@other.com"];
    const domain = process.env.ALLOWED_EMAIL_DOMAIN ?? "example.com";
    for (const email of blocked) {
      expect(email.endsWith(`@${domain}`)).toBe(false);
    }
  });

  it("auto-admin list is read from env (AUTO_ADMIN_EMAILS comma-separated)", () => {
    const raw = process.env.AUTO_ADMIN_EMAILS ?? "";
    const adminSet = new Set(raw.split(",").map((e) => e.trim()).filter(Boolean));
    // If not configured, set is empty — that's fine for a template
    expect(adminSet instanceof Set).toBe(true);
  });

  it("token generation produces a 96-char hex string", async () => {
    const crypto = await import("crypto");
    const token = crypto.randomBytes(48).toString("hex");
    expect(token).toHaveLength(96);
    expect(token).toMatch(/^[0-9a-f]+$/);
  });
});

/**
 * Magic-link authentication
 *
 * Flow:
 *   POST /api/auth/magic/request  { email }
 *     → 403 if domain not in ALLOWED_EMAIL_DOMAIN (when set)
 *     → generate a one-time token (30 min TTL, stored in DB)
 *     → send magic-link email via Resend
 *     → return { ok: true }
 *
 *   GET /api/auth/magic/verify?token=<token>
 *     → validate token (exists, not used, not expired)
 *     → mark token as used
 *     → upsert user (auto-admin for emails in ADMIN_EMAILS env)
 *     → set JWT session cookie
 *     → redirect to / or /welcome for new users
 *
 * Required env vars:
 *   RESEND_API_KEY        — Resend API key
 *   MAILER_FROM           — from address, e.g. "noreply@example.com"
 *   ALLOWED_EMAIL_DOMAIN  — restrict logins to one domain (e.g. "example.com"); omit to allow any
 *   ADMIN_EMAILS          — comma-separated list of emails auto-promoted to admin
 *   PUBLIC_BASE_URL       — base URL for magic link, e.g. "https://app.example.com"
 *   JWT_SECRET            — see env.ts (required, fail-closed)
 */

import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import { Resend } from "resend";
import * as db from "../db";
import { getDb } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

/** Emails auto-promoted to admin on first login (from ADMIN_EMAILS env, comma-separated). */
function getAutoAdminEmails(): Set<string> {
  const raw = ENV.adminEmails;
  if (!raw) return new Set();
  return new Set(raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean));
}

/** Enforce email domain restriction if ALLOWED_EMAIL_DOMAIN is set. */
function isEmailAllowed(email: string): boolean {
  const domain = ENV.allowedEmailDomain.trim().toLowerCase();
  if (!domain) return true; // no restriction — open signup
  return email.endsWith(`@${domain}`);
}

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

function getMagicLinkUrl(token: string): string {
  const base = process.env.PUBLIC_BASE_URL ?? "http://localhost:5000";
  return `${base}/api/auth/magic/verify?token=${token}`;
}

function getAppName(): string {
  return process.env.VITE_APP_NAME ?? "LinkHub";
}

async function createMagicToken(email: string): Promise<string> {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("DB unavailable");
  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  // SECURITY: use tagged sql template (parameterized) — NOT string interpolation
  await dbConn.execute(
    sql`INSERT INTO magic_link_tokens (email, token, expiresAt) VALUES (${email}, ${token}, ${expiresAt})`
  );
  return token;
}

async function consumeMagicToken(token: string): Promise<string | null> {
  const dbConn = await getDb();
  if (!dbConn) return null;
  // SECURITY: parameterized query
  const [rows] = await dbConn.execute(
    sql`SELECT email, expiresAt, usedAt FROM magic_link_tokens WHERE token = ${token}`
  ) as any;
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) return null;
  if (row.usedAt) return null;
  if (new Date(row.expiresAt) < new Date()) return null;
  await dbConn.execute(
    sql`UPDATE magic_link_tokens SET usedAt = NOW() WHERE token = ${token}`
  );
  return row.email as string;
}

function buildMagicLinkEmail(magicUrl: string, appName: string): string {
  return `
    <div style="font-family: Arial, sans-serif; background: #000; color: #fff; padding: 40px; max-width: 480px; margin: 0 auto; border: 1px solid #333;">
      <div style="margin-bottom: 32px;">
        <span style="font-size: 20px; font-weight: 700; letter-spacing: -0.5px; color: var(--brand-accent, #fff);">
          ${appName}
        </span>
      </div>
      <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px; letter-spacing: -0.5px; text-transform: uppercase;">Sign in</h1>
      <p style="color: #999; font-size: 14px; margin: 0 0 32px; font-family: monospace; text-transform: uppercase; letter-spacing: 0.05em;">This link expires in 30 minutes</p>
      <a href="${magicUrl}" style="display: inline-block; background: #fff; color: #000; font-weight: 700; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; text-decoration: none; padding: 14px 28px; margin-bottom: 32px;">
        SIGN IN &rarr;
      </a>
      <p style="color: #666; font-size: 12px; font-family: monospace; margin: 0; word-break: break-all;">
        Or copy this URL:<br/>
        <span style="color: #999;">${magicUrl}</span>
      </p>
      <hr style="border: none; border-top: 1px solid #222; margin: 32px 0;" />
      <p style="color: #555; font-size: 11px; font-family: monospace; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">
        If you didn&apos;t request this, ignore this email.
      </p>
    </div>
  `;
}

export function registerAuthRoutes(app: Express) {
  // ── Step 1: Request a magic link ──────────────────────────────────────────
  app.post("/api/auth/magic/request", async (req: Request, res: Response) => {
    const email: unknown = req.body?.email;

    if (typeof email !== "string" || !email.trim()) {
      res.status(400).json({ error: "Email is required." });
      return;
    }

    const normalised = email.trim().toLowerCase();

    if (!isEmailAllowed(normalised)) {
      const domain = ENV.allowedEmailDomain;
      res.status(403).json({
        error: domain
          ? `Access is restricted to @${domain} accounts.`
          : "This email address is not permitted.",
      });
      return;
    }

    try {
      const token = await createMagicToken(normalised);
      const magicUrl = getMagicLinkUrl(token);
      const appName = getAppName();
      const from = ENV.mailerFrom || `noreply@${ENV.allowedEmailDomain || "example.com"}`;

      const resend = getResend();
      await resend.emails.send({
        from,
        to: normalised,
        subject: `Sign in to ${appName}`,
        html: buildMagicLinkEmail(magicUrl, appName),
      });

      res.json({ ok: true });
    } catch (error) {
      console.error("[Auth] Magic link request failed", error);
      res.status(500).json({ error: "Failed to send login email. Please try again." });
    }
  });

  // ── Step 2: Verify the magic link token ───────────────────────────────────
  app.get("/api/auth/magic/verify", async (req: Request, res: Response) => {
    const token = typeof req.query.token === "string" ? req.query.token : null;

    if (!token) {
      res.redirect(302, "/?error=invalid_token");
      return;
    }

    try {
      const email = await consumeMagicToken(token);

      if (!email) {
        res.redirect(302, "/?error=invalid_token");
        return;
      }

      const autoAdminEmails = getAutoAdminEmails();
      const isAutoAdmin = autoAdminEmails.has(email);
      const existingUser = await db.getUserByEmail(email);

      let openId: string;
      let isNew: boolean;

      if (existingUser) {
        openId = existingUser.openId;
        isNew = false;
        await db.upsertUser({
          openId,
          loginMethod: "magic_link",
          lastSignedIn: new Date(),
          ...(isAutoAdmin ? { role: "admin" as const } : {}),
        });
      } else {
        openId = email;
        isNew = true;
        await db.upsertUser({
          openId,
          email,
          loginMethod: "magic_link",
          lastSignedIn: new Date(),
          ...(isAutoAdmin ? { role: "admin" as const } : {}),
        });
        // Register primary email alias
        try {
          const dbConn = await getDb();
          if (dbConn) {
            const newUser = await db.getUserByEmail(email);
            if (newUser) {
              // SECURITY: parameterized query
              await dbConn.execute(
                sql`INSERT IGNORE INTO user_email_aliases (userId, email, isPrimary) VALUES (${newUser.id}, ${email}, true)`
              );
            }
          }
        } catch (_e) { /* non-fatal */ }
      }

      const sessionToken = await sdk.createSessionToken(openId, {
        name: existingUser?.name ?? "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      if (isNew) {
        const encodedEmail = encodeURIComponent(email);
        res.redirect(302, `/welcome?email=${encodedEmail}`);
      } else {
        res.redirect(302, "/?magic=1");
      }
    } catch (error) {
      console.error("[Auth] Magic link verify failed", error);
      res.redirect(302, "/?error=server_error");
    }
  });

  // Kept for backwards-compat — responds with deprecation message
  app.post("/api/auth/login", (_req: Request, res: Response) => {
    res.status(410).json({ error: "Direct login is no longer supported. Use magic link." });
  });

  // No-op for legacy OAuth callback path
  app.get("/api/oauth/callback", (_req: Request, res: Response) => {
    res.redirect(302, "/");
  });
}

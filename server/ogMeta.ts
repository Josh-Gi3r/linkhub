/**
 * Dynamic Open Graph meta tag injection for public profile pages.
 *
 * When a bot/crawler (iMessage, Telegram, Twitter, WhatsApp, etc.) fetches
 * /u/:slug or /c/:slug, this middleware intercepts the request and returns
 * a minimal HTML page with correct OG meta tags so link previews show the
 * right name, description, and avatar.
 *
 * Regular browsers get the normal SPA index.html (no change to UX).
 */

import type { Express, Request, Response, NextFunction } from "express";
import * as db from "./db";

const APP_NAME = process.env.APP_NAME ?? "LinkHub";
const APP_DESCRIPTION = process.env.APP_DESCRIPTION ?? "Team link profiles.";
const APP_URL = process.env.PUBLIC_BASE_URL ?? "http://localhost:5173";

function isCrawler(userAgent: string): boolean {
  const bots = [
    "facebookexternalhit",
    "twitterbot",
    "telegrambot",
    "whatsapp",
    "linkedinbot",
    "slackbot",
    "discordbot",
    "applebot",
    "googlebot",
    "bingbot",
    "iframely",
    "embedly",
    "curl",
    "wget",
    "python-requests",
    "go-http-client",
    "preview",
    "unfurl",
    "bot",
    "crawler",
    "spider",
  ];
  const ua = userAgent.toLowerCase();
  return bots.some((b) => ua.includes(b));
}

function buildHtml(meta: {
  title: string;
  description: string;
  image?: string | null;
  url: string;
}): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${esc(meta.title)}</title>
  <meta name="description" content="${esc(meta.description)}" />
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${esc(APP_NAME)}" />
  <meta property="og:title" content="${esc(meta.title)}" />
  <meta property="og:description" content="${esc(meta.description)}" />
  <meta property="og:url" content="${esc(meta.url)}" />
  ${meta.image ? `<meta property="og:image" content="${esc(meta.image)}" />` : ""}
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${esc(meta.title)}" />
  <meta name="twitter:description" content="${esc(meta.description)}" />
  ${meta.image ? `<meta name="twitter:image" content="${esc(meta.image)}" />` : ""}
  <!-- Redirect browsers to the SPA -->
  <meta http-equiv="refresh" content="0; url=${esc(meta.url)}" />
</head>
<body>
  <p>Redirecting to <a href="${esc(meta.url)}">${esc(meta.title)}</a>…</p>
</body>
</html>`;
}

export function registerOgMetaRoutes(app: Express) {
  // Company profile: /c/:slug
  app.get("/c/:slug", async (req: Request, res: Response, next: NextFunction) => {
    const ua = req.headers["user-agent"] ?? "";
    if (!isCrawler(ua)) return next();

    try {
      const company = await db.getCompanyBySlug(req.params.slug);
      if (!company) return next();

      const title = company.displayName ?? APP_NAME;
      const description = company.tagline ?? company.bio ?? APP_DESCRIPTION;
      const url = `${APP_URL}/c/${company.slug}`;

      res.status(200).set("Content-Type", "text/html").end(
        buildHtml({ title, description, image: company.avatarUrl, url })
      );
    } catch {
      next();
    }
  });

  // User profile: /u/:slug
  app.get("/u/:slug", async (req: Request, res: Response, next: NextFunction) => {
    const ua = req.headers["user-agent"] ?? "";
    if (!isCrawler(ua)) return next();

    try {
      const profile = await db.getProfileBySlug(req.params.slug);
      if (!profile) return next();

      const title = profile.displayName ?? APP_NAME;
      const description = profile.jobTitle
        ? `${title} — ${profile.jobTitle}`
        : profile.bio ?? APP_DESCRIPTION;
      const url = `${APP_URL}/u/${profile.slug}`;

      res.status(200).set("Content-Type", "text/html").end(
        buildHtml({ title, description, image: profile.avatarUrl, url })
      );
    } catch {
      next();
    }
  });
}

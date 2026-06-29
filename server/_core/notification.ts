/**
 * Notification adapter — generic outbound webhook.
 *
 * Posts a JSON payload to WEBHOOK_NOTIFICATION_URL. If WEBHOOK_NOTIFICATION_SECRET
 * is set, adds an HMAC-SHA256 signature as X-Webhook-Signature header so the
 * receiving end can verify authenticity.
 *
 * Swap adapter: replace this file with Slack, Discord, email, PagerDuty, etc.
 * The exported function signature stays the same.
 *
 * Optional env vars:
 *   WEBHOOK_NOTIFICATION_URL    — POST target; omit to disable (calls become no-ops)
 *   WEBHOOK_NOTIFICATION_SECRET — HMAC secret for request signing
 */

import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

export type NotificationPayload = { title: string; content: string };

const TITLE_MAX   = 1200;
const CONTENT_MAX = 20000;

function validate(input: NotificationPayload): NotificationPayload {
  const title   = (input.title   ?? "").trim();
  const content = (input.content ?? "").trim();
  if (!title)   throw new TRPCError({ code: "BAD_REQUEST", message: "Notification title is required." });
  if (!content) throw new TRPCError({ code: "BAD_REQUEST", message: "Notification content is required." });
  if (title.length   > TITLE_MAX)   throw new TRPCError({ code: "BAD_REQUEST", message: `Title must be at most ${TITLE_MAX} characters.` });
  if (content.length > CONTENT_MAX) throw new TRPCError({ code: "BAD_REQUEST", message: `Content must be at most ${CONTENT_MAX} characters.` });
  return { title, content };
}

function signPayload(body: string, secret: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Send a notification to the configured webhook endpoint.
 * Returns `true` on success; `false` when unconfigured or the upstream call fails.
 * Only throws for payload validation failures (TRPCError).
 */
export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  const { title, content } = validate(payload);
  const url = ENV.webhookUrl;

  if (!url) {
    console.warn("[Notification] WEBHOOK_NOTIFICATION_URL not set; notification skipped.");
    return false;
  }

  const body = JSON.stringify({ title, content, timestamp: new Date().toISOString() });
  const headers: Record<string, string> = { "content-type": "application/json" };

  if (ENV.webhookSecret) {
    headers["x-webhook-signature"] = signPayload(body, ENV.webhookSecret);
  }

  try {
    const res = await fetch(url, { method: "POST", headers, body });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(`[Notification] Webhook returned ${res.status}${detail ? `: ${detail}` : ""}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Webhook call failed:", error);
    return false;
  }
}

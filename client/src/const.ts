export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// The canonical public base URL for this deployment.
// Set VITE_PUBLIC_BASE_URL in your .env to override.
export const PUBLIC_BASE_URL =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_PUBLIC_BASE_URL) ||
  "http://localhost:5173";

// Auth is now handled by the email-domain login form on the home page.
// This stub is kept so any stray import doesn't break; it just returns "/".
export const getLoginUrl = () => "/";

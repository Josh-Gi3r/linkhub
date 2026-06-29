/**
 * Lightweight IP geo-lookup using ip-api.com (free, no API key, 45 req/min).
 * Returns country and city for a given IP address.
 * Falls back gracefully if the lookup fails or IP is private/local.
 */

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^::1$/,
  /^localhost$/,
];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_RANGES.some((r) => r.test(ip));
}

/** Cache geo results for 1 hour to avoid hammering the free API */
const geoCache = new Map<string, { country: string; city: string; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function geoLookup(ip: string): Promise<{ country: string | null; city: string | null }> {
  if (!ip || isPrivateIp(ip)) return { country: null, city: null };

  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return { country: cached.country, city: cached.city };
  }

  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { country: null, city: null };
    const data = (await res.json()) as { status: string; country?: string; city?: string };
    if (data.status !== "success") return { country: null, city: null };
    const result = { country: data.country ?? null, city: data.city ?? null };
    if (result.country) {
      geoCache.set(ip, { country: result.country, city: result.city ?? "", ts: Date.now() });
    }
    return result;
  } catch {
    return { country: null, city: null };
  }
}

/** Extract the real client IP from request headers (handles proxies/CDN) */
export function extractIp(headers: Record<string, string | string[] | undefined>): string | null {
  const forwarded = headers["x-forwarded-for"];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return first.trim();
  }
  const realIp = headers["x-real-ip"];
  if (realIp) return Array.isArray(realIp) ? realIp[0] : realIp;
  return null;
}

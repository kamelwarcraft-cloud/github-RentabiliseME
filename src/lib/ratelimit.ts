type Hit = { count: number; resetAt: number };
const store = new Map<string, Hit>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const h = store.get(key);
  if (!h || now > h.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (h.count >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: h.resetAt - now };
  }
  h.count += 1;
  return { ok: true, remaining: limit - h.count };
}

export function clientIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for") || "";
  const ip = xf.split(",")[0].trim();
  return ip || req.headers.get("x-real-ip") || "unknown";
}
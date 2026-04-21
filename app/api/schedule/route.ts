import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { captureServerError } from "@/lib/posthog-server";
import { createSchedulingLink } from "@/lib/calendly-mcp";

// ---------------------------------------------------------------------------
// Rate limiter — reuse same Redis, stricter window for booking attempts
// ---------------------------------------------------------------------------

let _ratelimit: Ratelimit | null = null;
function getRatelimit(): Ratelimit | null {
  if (_ratelimit) return _ratelimit;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    analytics: true,
    prefix: "guillermo-schedule",
  });
  return _ratelimit;
}

const FALLBACK_URL =
  process.env.CALENDLY_FALLBACK_URL || "https://calendly.com/dimeglio-pablo";

// ---------------------------------------------------------------------------
// POST /api/schedule — create a single-use Calendly scheduling link via MCP
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    const ratelimit = getRatelimit();
    if (ratelimit) {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
      const { success, reset } = await ratelimit.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: "Too many scheduling attempts. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
            },
          }
        );
      }
    }

    const schedulingUrl = await createSchedulingLink();

    if (!schedulingUrl) {
      return NextResponse.json({ fallback: true, url: FALLBACK_URL });
    }

    return NextResponse.json({ success: true, url: schedulingUrl });
  } catch (error) {
    console.error("[Schedule API] Error:", error);
    captureServerError(error, { route: "/api/schedule" });
    return NextResponse.json({ fallback: true, url: FALLBACK_URL });
  }
}

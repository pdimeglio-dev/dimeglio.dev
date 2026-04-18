import { PostHog } from "posthog-node";

// ---------------------------------------------------------------------------
// Server-side PostHog client (singleton)
// ---------------------------------------------------------------------------

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!POSTHOG_KEY) return null;
  if (!client) {
    client = new PostHog(POSTHOG_KEY, {
      host: POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}

/**
 * Report a server-side error to PostHog.
 * Safe to call even when PostHog is not configured (no-ops).
 */
export function captureServerError(
  error: unknown,
  context?: Record<string, unknown>
) {
  const ph = getClient();
  if (!ph) return;
  ph.captureException(error, "server", context);
}

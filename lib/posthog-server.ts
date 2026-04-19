import { PostHog } from "posthog-node";
import * as Sentry from "@sentry/nextjs";

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
 * Report a server-side error to both Sentry and PostHog.
 * - Sentry: deep debugging (stack traces, breadcrumbs, releases)
 * - PostHog: visibility alongside session replays and analytics
 *
 * Safe to call even when either service is not configured (no-ops).
 * Note: the posthog-js sentryIntegration() bridge is browser-only, so for
 * server errors we call both services explicitly.
 */
export function captureServerError(
  error: unknown,
  context?: Record<string, unknown>
) {
  // Sentry: rich debugging context
  Sentry.captureException(error, { extra: context });

  // PostHog: visibility in the same dashboard as frontend errors
  const ph = getClient();
  if (!ph) return;
  ph.captureException(error, "server", context);
}

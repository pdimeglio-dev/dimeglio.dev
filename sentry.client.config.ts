import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

// Sentry may init before PostHog — that's fine. posthog.sentryIntegration()
// checks posthog.__loaded lazily (at error time), so errors captured before
// PostHog is ready still go to Sentry; PostHog enrichment kicks in once loaded.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  integrations: [
    posthog.sentryIntegration({
      organization: process.env.NEXT_PUBLIC_SENTRY_ORG,
      projectId: Number(process.env.NEXT_PUBLIC_SENTRY_PROJECT_ID),
      // Only forward error-level events — not warnings — to PostHog
      severityAllowList: ["error", "fatal"],
    }),
  ],
  // Capture 10% of traces for performance monitoring
  tracesSampleRate: 0.1,
  // PostHog handles session replay — disable Sentry's
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});

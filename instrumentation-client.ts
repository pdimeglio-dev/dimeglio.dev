// Loads Sentry client-side config before React hydration.
// Next.js 16's instrumentation-client.ts is the correct entry point for this —
// @sentry/nextjs's webpack plugin cannot inject it automatically with Turbopack.
import * as Sentry from "@sentry/nextjs";
import "./sentry.client.config";

// Required by @sentry/nextjs to instrument navigation transitions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

import * as Sentry from "@sentry/nextjs";

// No edge runtime on this project — skip sentry.edge.config.ts entirely.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Capture 10% of traces for performance monitoring
  tracesSampleRate: 0.1,
});

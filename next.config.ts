import type { NextConfig } from "next";
import { withPostHogConfig } from "@posthog/nextjs-config";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

const posthogConfig = withPostHogConfig(nextConfig, {
  personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY || "",
  projectId: process.env.POSTHOG_PROJECT_ID,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
  sourcemaps: {
    enabled: !!process.env.POSTHOG_PERSONAL_API_KEY,
    deleteAfterUpload: true,
  },
});

export default withSentryConfig(posthogConfig, {
  org: process.env.NEXT_PUBLIC_SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Suppress Sentry CLI output locally when auth token is not set
  silent: !process.env.SENTRY_AUTH_TOKEN,
  // Disable source map upload here — @posthog/nextjs-config handles it,
  // and Sentry's upload needs SENTRY_AUTH_TOKEN set in CI/Vercel anyway.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  // Turbopack is the default bundler in Next.js 16 — disable Sentry's
  // webpack plugin injection to avoid conflicts during `next dev`.
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },
});

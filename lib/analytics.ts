import posthog from "posthog-js";

// ---------------------------------------------------------------------------
// PostHog initialisation
// ---------------------------------------------------------------------------

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

/**
 * Initialise PostHog (client-side only, called once from PostHogProvider).
 * Uses memory persistence (cookieless) to avoid cookie banners on a portfolio.
 */
export function initPostHog() {
  if (typeof window === "undefined") return;
  if (!POSTHOG_KEY) {
    console.warn("[analytics] NEXT_PUBLIC_POSTHOG_KEY is not set — skipping.");
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // Cookieless mode — no banner needed
    persistence: "memory",
    // Capture page views manually via Next.js route changes
    capture_pageview: false,
    // Capture page leaves for scroll depth / time on page
    capture_pageleave: true,
    // Disable autocapture — we instrument events explicitly for clarity
    autocapture: false,
    // Session replay (opt-in, free tier includes it)
    disable_session_recording: false,
  });
}

// ---------------------------------------------------------------------------
// Typed event helpers
// ---------------------------------------------------------------------------

/**
 * Every custom event in the analytics catalog.
 * When adding a new event, add it here first — this is the source of truth.
 *
 * @see docs/ANALYTICS.md for the full event catalog with descriptions.
 */
export type AnalyticsEvent =
  | { event: "page_viewed"; properties: { path: string; referrer: string } }
  | { event: "logo_clicked"; properties: { logo: string; href: string } }
  | {
      event: "blog_post_viewed";
      properties: { slug: string; title: string; tags: string[] };
    }
  | {
      event: "blog_post_scroll_depth";
      properties: { slug: string; percent: number };
    }
  | {
      event: "project_card_clicked";
      properties: { slug: string; title: string; company: string; category: string };
    }
  | {
      event: "project_detail_viewed";
      properties: { slug: string; title: string; company: string };
    }
  | {
      event: "project_link_clicked";
      properties: { slug: string; label: string; url: string };
    }
  | {
      event: "experience_project_clicked";
      properties: { project_slug: string; project_title: string; from_company: string };
    }
  | {
      event: "nav_link_clicked";
      properties: { href: string; label: string; from_page: string };
    }
  | {
      event: "resume_downloaded";
      properties: Record<string, never>;
    }
  | {
      event: "external_link_clicked";
      properties: { url: string; context: string };
    }
  | {
      event: "category_filter_changed";
      properties: { category: string; page: string };
    }
  | {
      event: "social_link_clicked";
      properties: { platform: string; href: string };
    }
  | {
      event: "guillermo_chat_opened";
      properties: { from_page: string };
    }
  | {
      event: "guillermo_chat_closed";
      properties: { message_count: number };
    }
  | {
      event: "guillermo_message_sent";
      properties: { message_length: number; message_count: number };
    }
  | {
      event: "guillermo_cta_clicked";
      properties: { cta_type: "email" | "linkedin" | "calendly"; from_page: string };
    }
  | {
      event: "guillermo_lead_signal";
      properties: { company?: string; role?: string; message_count: number };
    };

/**
 * Fire a typed analytics event. Safe to call server-side (no-ops).
 *
 * Usage:
 * ```ts
 * trackEvent({ event: "logo_clicked", properties: { logo: "Google", href: "/experience#..." } });
 * ```
 */
export function trackEvent<E extends AnalyticsEvent>(payload: E) {
  if (typeof window === "undefined") return;
  if (!POSTHOG_KEY) return;

  posthog.capture(payload.event, payload.properties);
}

/**
 * Track a page view — called from the PostHog provider on route change.
 */
export function trackPageView(path: string) {
  if (typeof window === "undefined") return;
  if (!POSTHOG_KEY) return;

  posthog.capture("$pageview", {
    $current_url: window.location.href,
    path,
    referrer: document.referrer || "direct",
  });
}

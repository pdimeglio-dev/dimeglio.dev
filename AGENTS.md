<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:analytics-agent-rules -->
## Analytics — PostHog Event Tracking

This project tracks user interactions via **PostHog** (`posthog-js`).
The single source of truth for events is `lib/analytics.ts` (the `AnalyticsEvent` union type).
Full documentation lives in `docs/ANALYTICS.md`.

### When you create or modify components:

1. **New clickable element** (button, link, card, logo) →
   Import `trackEvent` from `@/lib/analytics` and fire an appropriate event `onClick`.
   If no matching event type exists, **add a new variant** to the `AnalyticsEvent` union first.

2. **New page/route** → Page views are automatic (handled by `PostHogProvider`).
   Only add custom events if there's specific engagement to track (e.g., scroll depth).

3. **New blog post** → No action needed. `BlogPostTracker` in `app/blog/[slug]/page.tsx`
   automatically tracks views and scroll depth for all posts.

4. **New project or experience MDX** → No action needed. The grid/timeline components
   already track clicks with slug, title, and company context.

5. **Event naming** → `snake_case`, include contextual properties (slug, title, company, etc.).

6. **Client-only** → `trackEvent()` no-ops on the server. Only use in `'use client'` components.

7. **Never hardcode API keys** — use `NEXT_PUBLIC_POSTHOG_KEY` env var.
<!-- END:analytics-agent-rules -->

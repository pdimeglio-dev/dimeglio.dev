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

<!-- BEGIN:blog-voice-rules -->
## Blog Writing Voice — Anti-AI Detection Rules

When writing blog content for Pablo, the voice must be **conversational, direct, and slightly
self-deprecating** — like a senior engineer talking to peers, not a LinkedIn thought leader.

### Banned patterns (these are immediate AI tells):
- **Buzzwords:** "force multiplier", "game-changer", "paradigm shift", "revolutionize",
  "empower", "leverage" (verb), "delve", "tapestry", "landscape", "harness",
  "cutting-edge", "robust", "seamless", "humbling"
- **Dramatic pauses:** "That's not a typo", "Here's the beautiful part", "Let that sink in",
  "Here's the thing nobody tells you about X"
- **Defensive framing:** "This isn't about AI replacing engineers"
- **Profound conclusions:** "This is what X actually means", mic-drop endings,
  inspirational wrap-ups
- **Self-referential cleverness:** "We're deep in the meta now", explaining why something
  is ironic instead of letting the reader notice

### Required patterns:
1. Open with something personal — a frustration, a confession, a specific moment
2. Show friction — what went wrong, what was annoying, what took too long
3. Use imperfect transitions — "Anyway,", "So,", "The other thing was..."
4. First person, casual — contractions, fragments, parenthetical asides
5. Be specific — "40 minutes fighting the typography plugin" not "some challenges"
6. End honestly — a practical takeaway or open question, never inspirational

### Self-check before finishing any blog draft:
- ✅ Sounds like a dev blog by a real person → ship it
- ❌ Sounds like a Medium article or marketing case study → rewrite it
<!-- END:blog-voice-rules -->

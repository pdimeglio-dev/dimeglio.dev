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

<!-- BEGIN:error-monitoring-agent-rules -->
## Error Monitoring — Sentry + PostHog

This project uses **Sentry** as the error capture engine and **PostHog** as the analytics/visibility layer.
Full documentation lives in `docs/ANALYTICS.md` under "Error Monitoring".

### How it works:

- **Frontend (automatic):** Sentry captures unhandled errors and promise rejections.
  `posthog.sentryIntegration()` in `sentry.client.config.ts` forwards each error to PostHog
  as a `$exception` event with a `$sentry_url` link. Click it in PostHog to jump to Sentry.

- **Frontend (manual):** Use `captureError(error)` from `@/lib/analytics` in catch blocks.
  It calls `Sentry.captureException()`, which forwards to PostHog automatically.

- **Backend (automatic):** `instrumentation.ts` exports both `register()` (loads Sentry server
  config) and `onRequestError` (catches all unhandled server errors and calls `captureServerError`).

- **Backend (manual):** Use `captureServerError(error, context)` from `@/lib/posthog-server`
  in API route catch blocks. It calls **both** Sentry and PostHog (server-side bridge is explicit
  because `posthog.sentryIntegration()` is browser-only).

- **Error boundaries:** `app/error.tsx` and `app/global-error.tsx` catch React render crashes.
  They fire `captureError` (→ Sentry → PostHog) and an `error_boundary_displayed` analytics event.

- **Source maps:** Both `@posthog/nextjs-config` and `@sentry/nextjs` upload source maps during
  `next build`. PostHog needs them for its Error Tracking view; Sentry for its own. Both services
  need their respective env vars set in Vercel.

### When you create or modify components:

1. **New API route** → Add `import { captureServerError } from "@/lib/posthog-server"` and
   call `captureServerError(error, { route: "/api/your-route" })` in your catch block,
   alongside `console.error`.

2. **New client component with try/catch** → Add `captureError(error)` from `@/lib/analytics`
   in the catch block.

3. **Never swallow errors silently** — at minimum call `captureError`/`captureServerError`
   so errors are visible in both Sentry and PostHog.
<!-- END:error-monitoring-agent-rules -->

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
- **Audience-naming / job-search framing:** never name the recruiter or hiring manager
  as the audience inside the post. Banned phrases: "the job-search use case",
  "recruiter or hiring manager", "land an interview", "hire this person",
  "for the job search". Telegraphing the play makes the reader feel marketed-to.
  Just describe what the system does and why it exists.
- **Hyperbolic counting on lightweight artifacts:** counting markdown SKILL.md files,
  slash commands, or config blocks as "agents" or "services" oversells. A SKILL.md
  with frontmatter and a few bash snippets is a *skill*, not an *agent*. Use precise
  terminology: "skills", "subagents", "commands", "configs". "Eight skills wired
  together" reads honest; "eight agents" invites a "well, sort of" reaction.
- **Speed-as-marquee-number:** don't lead with build duration as the headline insight.
  Banned shapes: "N days from nothing to ...", "in just X days", "built in a weekend"
  used as a brag. Duration in service of an engineering point ("the format is
  essentially documentation, which is why a small system like this comes together
  quickly") is fine; duration as the headline is not.

### Required patterns:
1. Open with something personal — a frustration, a confession, a specific moment
2. Show friction — what went wrong, what was annoying, what took too long
3. Use imperfect transitions — "Anyway,", "So,", "The other thing was..."
4. First person, casual — contractions, fragments, parenthetical asides
5. Be specific — "40 minutes fighting the typography plugin" not "some challenges"
6. End honestly — a practical takeaway or open question, never inspirational
7. **Closings must land.** The final section must include a specific insight, a
   non-obvious lesson, a concrete next thing, or a memorable phrase. A throwaway
   sign-off ("look at the code if you want", "the code is on GitHub") as the
   load-bearing closing sentence is forgettable. The post earns the right to
   end on one sharp line — use it.

### Self-check before finishing any blog draft:
- ✅ Sounds like a dev blog by a real person → ship it
- ❌ Sounds like a Medium article or marketing case study → rewrite it
<!-- END:blog-voice-rules -->

<!-- BEGIN:guillermo-chat-widgets -->
## Guillermo Chat — Widget Tools

Guillermo (the AI chat agent in `app/api/chat/route.ts`) communicates data visually via
widget tools. Each tool emits an NDJSON widget chunk that the frontend renders as a React
component. Types live in `lib/chat-widgets.ts`, components in `components/chat/`.

### Available tools:

| Tool | Component | Purpose |
|------|-----------|---------|
| `searchPortfolio` | *(data, no UI)* | Query Pinecone for RAG context. Called before every factual answer. |
| `renderSkillGrid` | `SkillGrid` | Color-coded skill badges with proficiency levels |
| `renderProjectCard` | `ProjectCard` | Single project deep-dive (logo, role, dates, summary, tech stack) |
| `renderProjectList` | `ProjectList` | Multi-project listing with filtering and pagination |
| `renderBlogPostCard` | `BlogPostCard` | Blog post card with cover image hero, date, tags |
| `renderContactCard` | `ContactCard` | Contact form + LinkedIn CTA |

### When you create or modify Guillermo's tools:

1. **New tool** → Define it in `app/api/chat/route.ts`, add its props interface to
   `lib/chat-widgets.ts`, add its component mapping to `TOOL_TO_COMPONENT`, create the
   React component in `components/chat/`, and add the case to `BlockRenderer` in
   `components/chat-interface.tsx`.

2. **Blog posts vs projects** → Blog posts use `renderBlogPostCard` (cover image hero,
   no company/role). Projects use `renderProjectCard` or `renderProjectList` (company logo,
   role, tech stack). Never mix them.

3. **Slug validation** → All widget deep links go through `getValidHref()` in
   `lib/chat-slugs.ts`. Valid slugs: `VALID_PROJECT_SLUGS`, `VALID_EXPERIENCE_SLUGS`,
   `VALID_BLOG_SLUGS`. Blog slugs are auto-generated by `npm run ingest` into
   `lib/generated-blog-slugs.ts`. Project and experience slugs are still manual.

4. **One widget per response** → The server drops duplicate widget calls of the same type.
<!-- END:guillermo-chat-widgets -->

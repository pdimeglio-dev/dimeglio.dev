# Analytics — PostHog Event Catalog

> **Source of truth:** `lib/analytics.ts` (the `AnalyticsEvent` union type)
>
> This document is the human-readable companion. If there's a discrepancy,
> the TypeScript type in `lib/analytics.ts` wins.

## Architecture

```
PostHogProvider (components/posthog-provider.tsx)
  ├── Initialises posthog-js on mount via initPostHog()
  ├── Tracks $pageview on every Next.js route change
  └── Wraps the entire app in app/layout.tsx

trackEvent() (lib/analytics.ts)
  ├── Typed helper — accepts only valid AnalyticsEvent payloads
  ├── No-ops on server (safe to import anywhere)
  └── No-ops when NEXT_PUBLIC_POSTHOG_KEY is empty

captureError() (lib/analytics.ts)
  ├── Client-side wrapper around posthog.captureException()
  ├── Use in catch blocks alongside console.error
  └── No-ops on server

captureServerError() (lib/posthog-server.ts)
  ├── Server-side error reporting via posthog-node
  ├── Use in API route catch blocks
  └── No-ops when NEXT_PUBLIC_POSTHOG_KEY is empty

instrumentation.ts (project root)
  ├── Exports onRequestError — catches all unhandled server errors
  ├── Reports to PostHog via captureServerError()
  └── Covers API routes, Server Components, Server Actions

Error boundaries (app/error.tsx, app/global-error.tsx)
  ├── Catch React render crashes, show fallback UI
  ├── Report via captureError() + error_boundary_displayed event
  └── global-error.tsx catches root layout errors

BlogPostTracker (components/blog-post-tracker.tsx)
  ├── Fires blog_post_viewed on mount
  └── Fires blog_post_scroll_depth at 25/50/75/100% thresholds
```

## Configuration

| Env Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | Yes | — | PostHog project API key (used by both client and server) |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | `https://us.i.posthog.com` | PostHog API host |
| `POSTHOG_PERSONAL_API_KEY` | No | — | Personal API key for source map uploads (Vercel only, `error_tracking:write` scope) |
| `POSTHOG_PROJECT_ID` | No | — | PostHog project ID for source map uploads (Vercel only) |

### Privacy Mode

PostHog is configured in **cookieless mode** (`persistence: "memory"`).
No cookies are set, no localStorage is used. Each page load is a fresh session.
This means no cookie banner is needed for GDPR/CCPA compliance.

Trade-off: returning visitors are not recognized across sessions.

---

## Event Catalog

### Automatic Events

| Event | Trigger | Properties |
|---|---|---|
| `$pageview` | Every Next.js route change | `path`, `referrer`, `$current_url` |
| `$pageleave` | User leaves page (built-in PostHog) | Time on page, scroll depth |
| `$exception` | Unhandled JS error or promise rejection (frontend), or `captureError()`/`captureServerError()` call | Stack trace, error message, `$lib` (`web` or `posthog-node`) |

### Custom Events

#### `logo_clicked`
Fired when a user clicks a company logo on the homepage "Where I've built" section.

| Property | Type | Example |
|---|---|---|
| `logo` | string | `"Google"`, `"Disney"` |
| `href` | string | `"/experience#exp-google-agile-modeling"` |

**Component:** `components/home/logo-ticker.tsx`

---

#### `blog_post_viewed`
Fired when a blog post page loads.

| Property | Type | Example |
|---|---|---|
| `slug` | string | `"building-dimeglio-dev-with-ai"` |
| `title` | string | `"Building dimeglio.dev with AI"` |
| `tags` | string[] | `["ai", "next.js", "portfolio"]` |

**Component:** `components/blog-post-tracker.tsx`

---

#### `blog_post_scroll_depth`
Fired at 25%, 50%, 75%, and 100% scroll depth thresholds. Each threshold fires at most once per page load.

| Property | Type | Example |
|---|---|---|
| `slug` | string | `"building-dimeglio-dev-with-ai"` |
| `percent` | number | `25`, `50`, `75`, `100` |

**Component:** `components/blog-post-tracker.tsx`

---

#### `project_card_clicked`
Fired when a user clicks a project card on the Projects page.

| Property | Type | Example |
|---|---|---|
| `slug` | string | `"proj-google-shopping"` |
| `title` | string | `"Google Shopping Lists"` |
| `company` | string | `"Google"` |
| `category` | string | `"Professional"` |

**Component:** `components/projects-grid.tsx`

---

#### `project_detail_viewed`
Fired when the project detail Sheet opens. *(Reserved for future use — can be wired to Sheet `onOpenChange`.)*

| Property | Type | Example |
|---|---|---|
| `slug` | string | `"proj-google-shopping"` |
| `title` | string | `"Google Shopping Lists"` |
| `company` | string | `"Google"` |

---

#### `project_link_clicked`
Fired when a user clicks an external link (GitHub, website, etc.) inside a project detail Sheet.

| Property | Type | Example |
|---|---|---|
| `slug` | string | `"proj-paddle-games"` |
| `label` | string | `"github"`, `"website"` |
| `url` | string | `"https://github.com/..."` |

**Component:** `components/projects-grid.tsx`

---

#### `experience_project_clicked`
Fired when a user clicks a "Related Project" card inside the experience timeline.

| Property | Type | Example |
|---|---|---|
| `project_slug` | string | `"proj-google-shopping"` |
| `project_title` | string | `"Google Shopping Lists"` |
| `from_company` | string | `"Google"` |

**Component:** `components/experience-timeline.tsx`

---

#### `nav_link_clicked`
Fired when a user clicks a navigation link in the header (desktop or mobile).

| Property | Type | Example |
|---|---|---|
| `href` | string | `"/blog"` |
| `label` | string | `"Blog"`, `"Home (icon)"` |
| `from_page` | string | `"/"`, `"/experience"` |

**Component:** `components/header.tsx`

---

#### `resume_downloaded`
Fired when a user downloads the resume PDF. *(Reserved — wire when a download button is added.)*

| Property | Type | Example |
|---|---|---|
| *(none)* | — | — |

---

#### `external_link_clicked`
Generic event for outbound links not covered by other events.

| Property | Type | Example |
|---|---|---|
| `url` | string | `"https://linkedin.com/in/..."` |
| `context` | string | `"footer"`, `"hero"` |

---

#### `category_filter_changed`
Fired when a user changes the category filter on the Projects page.

| Property | Type | Example |
|---|---|---|
| `category` | string | `"Professional"`, `"Personal"`, `"All"` |
| `page` | string | `"projects"` |

**Component:** `components/projects-grid.tsx`

---

#### `error_boundary_displayed`
Fired when a user sees the error boundary fallback UI after a React render crash.

| Property | Type | Example |
|---|---|---|
| `error_message` | string | `"Cannot read properties of null"` |
| `digest` | string? | `"abc123"` (Next.js error digest, if available) |

**Component:** `app/error.tsx`

---

## Error Monitoring

PostHog handles both analytics and error monitoring for this project. No Sentry.

### Where errors go

| Error type | How it's captured | PostHog filter |
|---|---|---|
| Frontend unhandled error | Automatic (`capture_exceptions` in posthog-js) | `$exception` where `$lib` = `web` |
| Frontend caught error | Manual `captureError(error)` in catch blocks | `$exception` where `$lib` = `web` |
| Server unhandled error | Automatic (`instrumentation.ts` → `onRequestError`) | `$exception` where `$lib` = `posthog-node` |
| Server caught error | Manual `captureServerError(error, ctx)` in API routes | `$exception` where `$lib` = `posthog-node` |
| React render crash | Error boundary + `captureError` | `$exception` + `error_boundary_displayed` |

### Source maps

`@posthog/nextjs-config` uploads source maps to PostHog during `next build` so
production stack traces show real file names. This only runs when
`POSTHOG_PERSONAL_API_KEY` is set (Vercel builds). Local builds skip the upload.

Configuration: `next.config.ts` → `withPostHogConfig()` wrapper.

### Key files

| File | Purpose |
|---|---|
| `lib/analytics.ts` | `captureError()` — client-side error reporting |
| `lib/posthog-server.ts` | `captureServerError()` — server-side error reporting via `posthog-node` |
| `instrumentation.ts` | `onRequestError` — catches unhandled server errors |
| `app/error.tsx` | Route-level error boundary |
| `app/global-error.tsx` | Root layout error boundary |
| `next.config.ts` | `withPostHogConfig()` — source map uploads |

---

## Adding a New Event

1. **Define the event** in `lib/analytics.ts` — add a new variant to the `AnalyticsEvent` union type:
   ```ts
   | { event: "my_new_event"; properties: { foo: string; bar: number } }
   ```

2. **Fire the event** in the relevant client component:
   ```ts
   import { trackEvent } from "@/lib/analytics";
   
   trackEvent({
     event: "my_new_event",
     properties: { foo: "hello", bar: 42 },
   });
   ```

3. **Document the event** in this file (add a new section above).

4. **Verify** in PostHog dashboard → Activity → Live Events.

## PostHog Dashboard Recommendations

Set up these dashboards in PostHog for the insights Pablo wants:

- **Traffic Sources** → Filter `$pageview` by `referrer` property
- **Top Blog Posts** → Count `blog_post_viewed` grouped by `slug`
- **Blog Read Depth** → Funnel: 25% → 50% → 75% → 100% for `blog_post_scroll_depth`
- **Logo Clicks** → Count `logo_clicked` grouped by `logo`
- **Project Engagement** → Count `project_card_clicked` grouped by `title`
- **Experience → Project Funnel** → `experience_project_clicked` grouped by `from_company`
- **Navigation Patterns** → Count `nav_link_clicked` grouped by `href` + `from_page`
- **Visitor Geography** → Use PostHog's built-in geo breakdown on `$pageview`

### Error Monitoring Dashboard (separate from analytics)

- **Frontend Errors (24h)** → Count `$exception` where `$lib` = `web`, breakdown by `$exception_message`
- **Server Errors (24h)** → Count `$exception` where `$lib` = `posthog-node`, breakdown by `$exception_message`
- **Error Boundary Views** → Count `error_boundary_displayed`, breakdown by `error_message`
- **Error Spike Alert** → Alert when `$exception` count > 10 in 1 hour

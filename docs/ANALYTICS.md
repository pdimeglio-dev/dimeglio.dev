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

BlogPostTracker (components/blog-post-tracker.tsx)
  ├── Fires blog_post_viewed on mount
  └── Fires blog_post_scroll_depth at 25/50/75/100% thresholds
```

## Configuration

| Env Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | Yes | — | PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | `https://us.i.posthog.com` | PostHog API host |

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

# Architecture Overview — dimeglio.dev

## Project Purpose
Personal developer portfolio and blog for Pablo Di Meglio (Senior Full Stack Engineer · AI Native).

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.3 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS v4 + shadcn/ui (base-nova) | 4.x |
| Content | MDX (next-mdx-remote/rsc + gray-matter) | 6.x |
| Code Highlighting | rehype-pretty-code + Shiki | github-dark theme |
| Animation | Framer Motion | 12.x |
| Icons | Lucide React | 1.x |
| Theming | next-themes | 0.4.x (forced dark) |
| Testing | Vitest + React Testing Library | 4.x |
| Runtime | Node.js LTS | 22.x |
| Package Manager | npm | 10.x |

## Folder Structure

```
dimeglio.dev/
├── app/                    # Next.js App Router (pages, layouts, routes)
│   ├── layout.tsx          # Root layout (ThemeProvider, fonts, metadata)
│   ├── page.tsx            # Home page (Hero + Bento Box)
│   ├── blog/
│   │   ├── page.tsx        # Blog index
│   │   └── [slug]/
│   │       └── page.tsx    # Individual blog post (MDX rendered)
│   ├── experience/
│   │   └── page.tsx        # Experience timeline
│   └── projects/
│       └── page.tsx        # Projects grid with Sheet detail
├── components/
│   ├── ui/                 # shadcn/ui + Aceternity-adapted components
│   ├── home/               # Homepage-specific components (logo ticker, skills marquee)
│   └── ...                 # Custom components (header, hero, project-card, etc.)
├── content/
│   ├── blog/               # Blog post MDX files
│   ├── experience/         # Experience MDX (exp-*, cert-*, edu-*)
│   ├── projects/           # Project MDX (proj-*)
│   └── rag/                # RAG-only content (bio, skills, FAQ, interests)
├── hooks/
│   └── use-is-mobile.ts    # Viewport detection hook
├── lib/
│   ├── mdx.ts              # MDX reading/parsing/relationships
│   ├── mdx.test.ts         # Vitest tests for content functions
│   └── utils.ts            # Tailwind cn() utility
├── docs/
│   ├── ARCHITECTURE.md     # This file — overview + tech stack
│   ├── CONTENT-SYSTEM.md   # MDX content authoring guide
│   ├── MEDIA-SYSTEM.md     # Screenshots, videos, viewport detection
│   ├── COMPONENTS.md       # Component catalog
│   ├── DATA-FLOW.md        # Data pipeline + relationships
│   ├── SESSION_NOTES.md    # Dev session notes / TODO scratchpad
│   └── decisions/          # Architecture Decision Records
├── public/
│   ├── logos/              # Company SVG logos (white, viewBox-only)
│   └── projects/           # Project screenshots (per-slug directories)
├── scripts/
│   └── validate-data.mjs   # Content validation script
├── .clinerules             # Cline AI context rules
└── AGENTS.md               # Next.js agent rules
```

## Key Design Decisions
- See `docs/decisions/` for ADRs
- Dark mode only (forced, not toggleable)
- True black (#000000) background — "Apple meets Gen AI startup"
- MDX content lives in `/content/` (not in `/app/`) for clean separation
- Server Components by default; `'use client'` only when needed
- `params` and `searchParams` are Promises in Next.js 16 — must be awaited

## Home Page Components

### Logo Strip (`components/home/logo-ticker.tsx`)

Displays company logos linking to their experience timeline entries.

**To add/edit a logo:**
1. Place the SVG in `/public/logos/` (ensure it's pre-cropped — no internal padding, `viewBox` only, no `width`/`height` attributes)
2. Edit the `logos` array in `components/home/logo-ticker.tsx`:
   ```ts
   { src: "/logos/company.svg", alt: "Company", href: "/experience#slug" }
   ```
3. The `href` uses `/experience#<slug>` where `<slug>` matches the MDX filename in `content/experience/` (without `.mdx`)

**Available experience slugs:**
`exp-google-cloud-studio`, `exp-google-agile-modeling`, `exp-google-shopping`, `exp-disney-studios`, `exp-disney-parks`, `exp-wells-fargo`, `exp-mission-lane`, `exp-pccw-global`, `exp-rpotential`

**SVG guidelines:**
- Use `viewBox` only — remove explicit `width`/`height` attributes
- Crop the viewBox tightly around the logo content (no padding)
- Use white (`#FFFFFF`) fills for visibility on dark backgrounds
- Remove colored background shapes (cards, rectangles) — keep only the wordmark/icon

### Skills Marquee (`components/home/skills-marquee.tsx`)

Auto-generated infinite scrolling strip of tech skills. Pulls from all projects' `techStack` arrays via `getAllUniqueSkills()` in `lib/mdx.ts`. No manual maintenance needed — adding skills to any project's frontmatter automatically updates the marquee.

## Content Architecture
- Blog posts, experience entries, and projects are all MDX files
- Frontmatter parsed with `gray-matter`
- Rendered with `next-mdx-remote/rsc` (Server Component compatible)
- Code blocks highlighted with `rehype-pretty-code` using `github-dark` theme

---

## Further Documentation

| Document | What it covers |
|----------|---------------|
| [CONTENT-SYSTEM.md](./CONTENT-SYSTEM.md) | MDX authoring guide, frontmatter types, naming conventions, cross-references |
| [MEDIA-SYSTEM.md](./MEDIA-SYSTEM.md) | Screenshots, mobile images, video embeds, viewport-aware slider logic |
| [COMPONENTS.md](./COMPONENTS.md) | Full component catalog — every component, props, Server vs Client |
| [DATA-FLOW.md](./DATA-FLOW.md) | Data pipeline from MDX → lib → pages → UI, sorting logic, relationship model |
| [decisions/](./decisions/) | Architecture Decision Records (ADRs) |

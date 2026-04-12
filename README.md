# dimeglio.dev

Personal developer portfolio and blog of **Pablo Di Meglio** — Senior Full Stack Engineer · AI Native.

**[dimeglio.dev](https://dimeglio.dev)**

---

## ✨ Features

- **Portfolio** — Experience timeline, project showcase with detail sheets, company logo strip
- **Blog** — MDX-powered posts with syntax highlighting, cover images, and scroll-depth tracking
- **SEO** — Dynamic sitemap, robots.txt, JSON-LD structured data (Person, Article, WebSite, ItemList), RSS feed, canonical URLs
- **Analytics** — Cookieless PostHog tracking with typed event catalog
- **Design** — True black (#000000), forced dark mode, Geist font, "Apple meets Gen AI startup" aesthetic
- **Performance** — Server Components by default, optimized fonts/images, Edge-generated OG images
- **Accessibility** — Skip-to-content link, semantic HTML, ARIA labels, keyboard navigation

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) |
| Content | MDX via [next-mdx-remote](https://github.com/hashicorp/next-mdx-remote) + gray-matter |
| Code Highlighting | rehype-pretty-code + Shiki (`github-dark`) |
| Animation | Framer Motion |
| Icons | Lucide React + Tabler Icons |
| Theming | next-themes (forced dark) |
| Analytics | [PostHog](https://posthog.com) (cookieless) |
| Testing | Vitest + React Testing Library |

## 📁 Project Structure

```
dimeglio.dev/
├── app/                    # Next.js App Router pages and layouts
│   ├── layout.tsx          # Root layout (fonts, metadata, JSON-LD, providers)
│   ├── page.tsx            # Home (Hero, Bento Grid, Logo Ticker, Skills)
│   ├── blog/               # Blog index + [slug] detail pages
│   ├── experience/         # Experience timeline page
│   ├── projects/           # Projects grid page
│   ├── sitemap.ts          # Dynamic XML sitemap
│   ├── robots.ts           # Crawl directives
│   ├── feed.xml/route.ts   # RSS 2.0 feed
│   ├── icon.tsx             # Dynamic </> favicon (512×512)
│   ├── apple-icon.tsx      # Apple touch icon (180×180)
│   ├── opengraph-image.tsx # Dynamic OG image (Edge runtime)
│   ├── manifest.ts         # Web app manifest
│   └── not-found.tsx       # Custom 404 page
├── components/             # React components
│   ├── ui/                 # shadcn/ui + custom UI primitives
│   ├── home/               # Homepage-specific (logo ticker, skills marquee)
│   ├── json-ld.tsx         # JSON-LD structured data helpers
│   ├── footer.tsx          # Site-wide footer
│   ├── header.tsx          # Sticky frosted-glass nav
│   └── ...                 # Hero, bento grid, project card, etc.
├── content/                # MDX content (blog, experience, projects)
│   ├── blog/               # Blog posts
│   ├── experience/         # Work history, certifications, education
│   └── projects/           # Project case studies
├── lib/                    # Utilities and data layer
│   ├── mdx.ts              # MDX reading, parsing, relationships
│   ├── analytics.ts        # PostHog event catalog (typed)
│   └── utils.ts            # Tailwind cn() helper
├── docs/                   # Architecture docs and ADRs
├── public/                 # Static assets (logos, project screenshots)
└── scripts/                # Validation and generation scripts
```

## 🚀 Getting Started

### Prerequisites

- Node.js 22+ (LTS)
- npm 10+

### Setup

```bash
# Clone the repo
git clone https://github.com/pdimeglio-dev/dimeglio.dev.git
cd dimeglio.dev

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your PostHog key (optional — analytics will no-op without it)

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest in watch mode |
| `npm run test:run` | Run tests once |
| `npm run validate-db` | Validate MDX content integrity |

## 📝 Content

All content lives in `/content/` as MDX files with YAML frontmatter.

- **Blog posts** → `content/blog/` — Supports cover images, tags, `published` flag
- **Experience** → `content/experience/` — Prefixed `exp-`, `cert-`, `edu-`
- **Projects** → `content/projects/` — Prefixed `proj-`, links to related experience

See [`docs/CONTENT-SYSTEM.md`](docs/CONTENT-SYSTEM.md) for the full authoring guide.

## 📊 Analytics

PostHog analytics with a typed event catalog. Page views are automatic; interactive components fire custom events.

- Event catalog: [`lib/analytics.ts`](lib/analytics.ts)
- Documentation: [`docs/ANALYTICS.md`](docs/ANALYTICS.md)
- Never hardcode API keys — uses `NEXT_PUBLIC_POSTHOG_KEY` env var

## 📖 Documentation

| Document | Description |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System overview, tech stack, folder structure |
| [`docs/CONTENT-SYSTEM.md`](docs/CONTENT-SYSTEM.md) | MDX authoring guide, frontmatter types, cross-references |
| [`docs/COMPONENTS.md`](docs/COMPONENTS.md) | Full component catalog with props and usage |
| [`docs/DATA-FLOW.md`](docs/DATA-FLOW.md) | Data pipeline from MDX → lib → pages → UI |
| [`docs/MEDIA-SYSTEM.md`](docs/MEDIA-SYSTEM.md) | Screenshots, mobile images, viewport-aware slider |
| [`docs/ANALYTICS.md`](docs/ANALYTICS.md) | PostHog event tracking guide |
| [`docs/decisions/`](docs/decisions/) | Architecture Decision Records (ADRs) |

## 🤖 Built with AI

This entire site — code, content, SEO infrastructure, and this README — was built collaboratively with AI coding assistants. Read the story: [How I Built dimeglio.dev in 3 Days with AI](https://dimeglio.dev/blog/building-dimeglio-dev-with-ai).

## 📄 License

All rights reserved. © Pablo Di Meglio.

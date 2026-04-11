# Component Catalog — dimeglio.dev

> Every component, what it does, where it's used, and whether it's Server or Client.

---

## Page Components (`app/`)

| Component | File | Type | Description |
|-----------|------|------|-------------|
| `RootLayout` | `app/layout.tsx` | Server | Root layout — Geist fonts, ThemeProvider, Header, metadata |
| `Home` | `app/page.tsx` | Server | Homepage — Hero, BentoGrid, LogoTicker, SkillsMarquee |
| Blog Index | `app/blog/page.tsx` | Server | Lists published blog posts |
| Blog Post | `app/blog/[slug]/page.tsx` | Server | Individual MDX blog post |
| Experience | `app/experience/page.tsx` | Server | Experience timeline page |
| Projects | `app/projects/page.tsx` | Server | Projects grid + detail sheet |

---

## Layout & Navigation

### `Header` — `components/header.tsx` — Client
Top navigation bar with logo and nav links. Responsive with mobile sheet menu.

### `ThemeProvider` — `components/theme-provider.tsx` — Client
Wraps `next-themes` provider. Forces dark mode (`attribute="class"`, `forcedTheme="dark"`).

---

## Homepage Components

### `Hero` — `components/hero.tsx` — Client
Full-screen hero section with animated text, role description, and CTA buttons. Uses Framer Motion for entrance animations.

### `BentoGrid` — `components/bento-grid.tsx` — Client
Apple-style grid of cards showcasing key highlights (featured projects, stats, etc.).

### `AIOrb` — `components/ai-orb.tsx` — Client
Animated gradient orb visual element used in the bento grid. Pure CSS/Framer Motion animation.

### `LogoTicker` — `components/home/logo-ticker.tsx` — Client
Infinite scrolling strip of company logos. Each logo links to its experience timeline entry via `/experience#{slug}`.

**To add a logo:** See [ARCHITECTURE.md](./ARCHITECTURE.md#logo-strip) for detailed instructions.

### `SkillsMarquee` — `components/home/skills-marquee.tsx` — Server
Auto-generated infinite scrolling strip of tech skills. Pulls from all projects' `techStack` arrays via `getAllUniqueSkills()`. No manual maintenance — adding skills to any project automatically updates the marquee.

---

## Content Components

### `MDXContent` — `components/mdx-content.tsx` — Server
Renders MDX source string using `next-mdx-remote/rsc` with `rehype-pretty-code` for syntax highlighting. Used in blog posts and can be extended for other MDX rendering.

### `ExperienceTimeline` — `components/experience-timeline.tsx` — Client
Vertical timeline component displaying jobs, certifications, and education. Groups entries by type, formats date ranges, and auto-computes skills from associated projects.

**Props:** `{ jobs: JobData[] }` where `JobData` includes experience frontmatter + computed skills + related projects.

### `ProjectsGrid` — `components/projects-grid.tsx` — Client
Main projects page component. Features:
- **Category filter** — Pill-shaped toggle (All / Professional / Personal) with Framer Motion layout animation
- **Project cards grid** — Responsive 1/2/3-column grid with AnimatePresence transitions
- **Detail sheet** — Full-screen slide-out panel with MDX content, tech tags, links, screenshots, and video
- **URL state sync** — `?projectId=slug&category=...` synced via `useSearchParams`
- **Viewport-aware screenshots** — Uses `useIsMobile()` to swap image sets and slider dimensions

### `ProjectCard` — `components/project-card.tsx` — Client
Individual project card with company eyebrow, title, description, and tech stack preview. Click opens the detail sheet.

**Props:** `{ slug, frontmatter, onClick }`

---

## UI Primitives (`components/ui/`)

These are either from shadcn/ui or custom Aceternity-inspired components:

| Component | File | Source | Description |
|-----------|------|--------|-------------|
| `Button` | `ui/button.tsx` | shadcn/ui | Standard button with variants |
| `Sheet` | `ui/sheet.tsx` | shadcn/ui | Slide-out panel (used for project detail + mobile nav) |
| `Timeline` | `ui/timeline.tsx` | Custom | Vertical timeline with animated dots and connecting lines |
| `ImagesSlider` | `ui/images-slider.tsx` | Aceternity-adapted | Animated image carousel with dots, arrows, autoplay, keyboard nav |
| `InfiniteMovingCards` | `ui/infinite-moving-cards.tsx` | Aceternity-adapted | Infinite scrolling card strip |
| `InfiniteMovingSkills` | `ui/infinite-moving-skills.tsx` | Custom | Variant of InfiniteMovingCards for skill badges |

---

## Hooks (`hooks/`)

### `useIsMobile` — `hooks/use-is-mobile.ts`
Returns `true` when viewport is < 768px. Uses `window.matchMedia`, SSR-safe (defaults to `false`), reactive to resize.

```ts
const isMobile = useIsMobile();
```

---

## Utilities (`lib/`)

### `cn()` — `lib/utils.ts`
Tailwind class merging utility (clsx + tailwind-merge). Used everywhere for conditional className composition.

### `lib/mdx.ts`
Core content system — see [DATA-FLOW.md](./DATA-FLOW.md) for the full function catalog.

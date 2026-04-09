# ADR-001: Project Scaffold & Tech Stack

## Status
Accepted

## Date
2026-04-09

## Context
Building a personal developer portfolio and blog for Pablo Di Meglio. Need a modern, performant, and maintainable tech stack that supports:
- MDX-based content (blog, experience, projects)
- Dark mode aesthetic ("Apple meets Gen AI startup")
- Server-side rendering with React Server Components
- Smooth animations
- Component library for consistent UI

## Decision
- **Next.js 16** (App Router) — latest with RSC support, Turbopack
- **TypeScript** — type safety
- **Tailwind CSS v4** — utility-first, v4 uses `@import 'tailwindcss'` and `@theme inline`
- **shadcn/ui** (base-nova preset) — high-quality, customizable components
- **next-mdx-remote/rsc** — RSC-compatible MDX rendering
- **gray-matter** — YAML frontmatter parsing
- **rehype-pretty-code + Shiki** — syntax highlighting (github-dark)
- **Framer Motion** — animations
- **Lucide React** — icons
- **next-themes** — theme management (forced dark)
- **Vitest + React Testing Library** — testing
- **npm** — package manager (never yarn/pnpm/bun)
- **Node.js 22 LTS** — runtime

## Consequences
- Tailwind v4 breaking changes: `@import` instead of `@tailwind`, `@theme inline` for custom values
- Next.js 16 breaking changes: `params`/`searchParams` are now Promises
- `PageProps<>` and `LayoutProps<>` global type helpers (no import needed)
- shadcn/ui uses `@custom-variant dark (&:is(.dark *))` for dark mode variant

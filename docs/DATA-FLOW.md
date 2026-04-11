# Data Flow — dimeglio.dev

> How content flows from MDX files through the data layer to the UI.

---

## Pipeline Overview

```
MDX files (content/)
  ↓ gray-matter (parse frontmatter + body)
lib/mdx.ts (type-safe reading, sorting, relationships)
  ↓
Server Components (app/ pages)
  ↓ props
Client Components (interactive UI)
  ↓
Browser (rendered HTML + hydrated interactivity)
```

---

## lib/mdx.ts — Function Catalog

### Core Functions

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `getSlugs(path)` | Content directory path | `string[]` | Lists all MDX file slugs in a directory |
| `getContentBySlug<T>(path, slug)` | Dir path + slug | `MDXContent<T> \| null` | Reads + parses a single MDX file |
| `getAllContent<T>(path, sortBy?, order?)` | Dir path + optional sort | `MDXContent<T>[]` | Gets all entries, optionally sorted |

### Convenience Helpers

| Function | Returns | Used by |
|----------|---------|---------|
| `getBlogPosts()` | Published blog posts (sorted by date desc) | Blog index page |
| `getBlogPost(slug)` | Single blog post | Blog [slug] page |
| `getExperiences()` | All experience entries (sorted by order asc) | Experience page |
| `getProjects()` | All projects (custom sort — see below) | Projects page |
| `getProject(slug)` | Single project | (Available for future use) |

### Relationship Functions

| Function | Returns | Used by |
|----------|---------|---------|
| `getSkillsForExperience(expSlug)` | Deduplicated, sorted skill strings | Experience timeline (auto-computed tech tags) |
| `getProjectsForExperience(expSlug)` | `{ slug, title, description }[]` | Experience timeline (project list per job) |
| `getAllUniqueSkills()` | `{ name }[]` from all projects' techStack | Skills marquee on homepage |

---

## Project Sorting Logic

`getProjects()` implements a custom sort:

```
1. Personal projects (no associatedExperience) → FIRST
   └─ Sorted by `order` field (ascending)

2. Professional projects → AFTER personal
   └─ Sorted by associated experience's `startDate` (descending — newest first)
   └─ Within same experience: sorted by `order` (ascending)
```

This means:
- Personal/side projects always appear at the top (they represent current interests)
- Professional projects sort by how recent the job was
- No date field needed on projects — it's derived from the experience relationship

---

## Experience ↔ Project Relationship

```
                    ┌─────────────────┐
                    │   Experience    │
                    │ exp-google-*    │
                    └────────┬────────┘
                             │ getProjectsForExperience()
                             │ getSkillsForExperience()
              ┌──────────────┼──────────────┐
              ↓              ↓              ↓
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │  Project A  │  │  Project B  │  │  Project C  │
     │ associatedExperience: "exp-google-*"          │
     └────────────┘  └────────────┘  └────────────┘
```

- **Forward link:** `project.frontmatter.associatedExperience = "exp-slug"`
- **Reverse lookup:** `getProjectsForExperience(expSlug)` scans all projects
- **Skill aggregation:** `getSkillsForExperience(expSlug)` collects all `techStack` from associated projects

---

## Page Data Flow Examples

### Projects Page (`app/projects/page.tsx`)

```
Server Component:
  1. getProjects() → all projects (sorted)
  2. For each project: render MDX content server-side
  3. Pass projects[] + renderedContent{} to ProjectsGrid

Client Component (ProjectsGrid):
  4. useSearchParams() → read category filter + active project
  5. Filter projects by category
  6. Render ProjectCard grid
  7. On card click → update URL → open Sheet with full detail
  8. useIsMobile() → choose image set + slider dimensions
```

### Experience Page (`app/experience/page.tsx`)

```
Server Component:
  1. getExperiences() → all entries (sorted by order)
  2. For each job: getSkillsForExperience() + getProjectsForExperience()
  3. Pass enriched job data to ExperienceTimeline

Client Component (ExperienceTimeline):
  4. Render vertical timeline with animated entries
  5. Each entry shows: title, company, dates, skills, related projects
```

### Homepage (`app/page.tsx`)

```
Server Component:
  1. getAllUniqueSkills() → skill badges for marquee
  2. Render Hero + BentoGrid + LogoTicker + SkillsMarquee
```

---

## TypeScript Types

All frontmatter types are defined in `lib/mdx.ts`:

```ts
interface MDXContent<T> {
  frontmatter: T;    // Typed frontmatter (BlogFrontmatter, etc.)
  content: string;   // Raw MDX body
  slug: string;      // Filename without .mdx
}
```

Generic `<T>` is used throughout so the same core functions work for all content types with full type safety.

---

## Testing

`lib/mdx.test.ts` tests the core content functions with Vitest:
- Slug discovery
- Frontmatter parsing
- Content sorting
- Relationship functions (skills for experience, projects for experience)

# Content System — dimeglio.dev

> How MDX content is authored, structured, and consumed.

---

## Directory Structure

```
content/
├── blog/               # Blog posts
│   ├── hello-world.mdx
│   └── ai-architecture-patterns.mdx
├── experience/         # Jobs, certifications, education
│   ├── exp-*.mdx       # Job entries
│   ├── cert-*.mdx      # Certifications
│   └── edu-*.mdx       # Education
└── projects/           # Professional + personal projects
    └── proj-*.mdx
```

## Naming Conventions

| Content type | Prefix | Example |
|-------------|--------|---------|
| Job | `exp-` | `exp-google-shopping.mdx` |
| Certification | `cert-` | `cert-gcp.mdx` |
| Education | `edu-` | `edu-info-systems.mdx` |
| Project | `proj-` | `proj-paddle-games.mdx` |
| Blog | none | `hello-world.mdx` |

The **filename (without `.mdx`)** becomes the **slug** used in URLs and cross-references.

---

## Frontmatter Types

### BlogFrontmatter

```yaml
---
title: "Post Title"           # Required
description: "Short summary"  # Required
date: "2026-04-10"            # Required — ISO date, used for sorting
tags: ["AI", "Architecture"]  # Required — displayed as labels
published: true                # Required — false = hidden from blog index
---
```

### ExperienceFrontmatter

```yaml
---
title: "Senior Software Engineer"   # Required — job title or cert/edu name
company: "Google"                    # Required — employer, institution, or issuer
location: "San Francisco, CA"        # Optional — displayed in timeline
startDate: "2021-01"                 # Required — YYYY-MM format
endDate: "2024-03"                   # Required — YYYY-MM or "Present"
order: 5                             # Optional — controls timeline sort (asc)
skills: ["React", "TypeScript"]      # Optional — only for cert-*/edu-* entries
relatedProjects: ["proj-foo"]        # Optional — explicit project links (overrides auto)
---
```

**Notes:**
- Job skills (`exp-*`) are **auto-computed** from associated projects' `techStack` — don't set `skills` on jobs.
- `relatedProjects` is rarely needed; projects link themselves via `associatedExperience`.

### ProjectFrontmatter

```yaml
---
title: "Project Name"                    # Required
description: "One-liner summary"         # Optional — shown in card + sheet
category: "Professional"                 # Required — "Professional" | "Personal"
company: "Google"                        # Optional — shows eyebrow label on card
associatedExperience: "exp-google-shopping"  # Optional — links to experience slug
techStack: ["React", "TypeScript", "GCP"]    # Optional — shown as tags
tags: ["legacy"]                         # Optional — fallback if no techStack
image: "hero.png"                        # Optional — single hero image (unused currently)
images: ["dashboard.png", "profile.png"] # Optional — screenshot gallery (landscape)
mobileImages: ["mobile-dashboard.jpg"]   # Optional — phone screenshots (shown on mobile viewports)
imageOrientation: portrait               # Optional — "portrait" | "landscape" (default: landscape)
video: "https://youtu.be/ZfxECzbmnAs"   # Optional — YouTube embed URL
links:                                   # Optional — keyed by label
  github: "https://github.com/..."
  website: "https://example.com"
  instagram: "https://instagram.com/..."
featured: true                           # Optional — for future homepage feature
order: 1                                 # Optional — sort order within same experience
---
```

---

## How to Add New Content

### New Blog Post

1. Create `content/blog/my-post-slug.mdx`
2. Add frontmatter (see above) with `published: true`
3. Write MDX body — supports full Markdown + JSX
4. Visit `/blog/my-post-slug`

### New Experience Entry

1. Create `content/experience/exp-company-name.mdx` (or `cert-`/`edu-`)
2. Add frontmatter with `startDate`, `endDate`, `order`
3. Write MDX body for the description
4. Skills auto-populate from linked projects

### New Project

1. Create `content/projects/proj-project-name.mdx`
2. Add frontmatter — at minimum: `title`, `category`
3. Set `associatedExperience` to link to an experience entry
4. Write MDX body with project details
5. Optionally add screenshots (see [MEDIA-SYSTEM.md](./MEDIA-SYSTEM.md))

---

## Cross-References

Projects and experiences are linked bidirectionally:

```
Project → Experience:  project.frontmatter.associatedExperience = "exp-google-shopping"
Experience → Projects: auto-computed via getProjectsForExperience(expSlug)
Experience → Skills:   auto-computed via getSkillsForExperience(expSlug)
```

This means **you never manually list projects on an experience entry** — just set `associatedExperience` on each project and the system does the rest.

---

## MDX Rendering

- **Parser:** `gray-matter` extracts frontmatter from `.mdx` files
- **Renderer:** `next-mdx-remote/rsc` (Server Component compatible)
- **Code highlighting:** `rehype-pretty-code` with Shiki `github-dark` theme
- All rendering happens server-side — no client-side MDX parsing

# Blog Pipeline System — Design Document

**dimeglio.dev · May 2026**

> Automate a daily content pipeline that turns active engineering work into polished blog posts and social media content — with the primary goal of landing interviews. One plugin. One config. Fully agentic from raw git history to published MDX file.
>
> **Decisions locked:** local repos via bash · interactive social review loop · DALL-E 3 images with optional logo compositing · publishing = drop MDX + `npm run ingest` · draft queue = `published: false` files per project in `editorial_state.json`

---

## Table of Contents

1. [Goals & Success Criteria](#1-goals--success-criteria)
2. [dimeglio.dev — Publishing Architecture](#2-dimegliodev--publishing-architecture)
3. [Pipeline Architecture](#3-pipeline-architecture)
4. [Configuration Schema](#4-configuration-schema)
5. [Agent Specifications](#5-agent-specifications)
6. [Plugin Repo & Installation](#6-plugin-repo--installation)
7. [Build Order & Phases](#7-build-order--phases)
8. [Open Questions — Status](#8-open-questions--status)
9. [Future Ideas (Post-MVP)](#9-future-ideas-post-mvp)

---

## 1. Goals & Success Criteria

The pipeline exists to serve one outcome: help Pablo land engineering interviews by building a consistent, visible, high-quality public record of his work.

### Primary Goal

- Publish 3–5 blog posts per week to dimeglio.dev, each showcasing real engineering decisions, problem-solving, and technical depth.
- Distribute every post to LinkedIn and X as copy-paste-ready text, adapted for each platform's format and audience.
- Maintain variety across projects — no single project dominates the feed.

### Success Looks Like

- A queue of 2–3 rated drafts waiting each morning, ready for one-click approval.
- Posts that read like genuine engineering reflection, not automated changelogs.
- Social content that consistently signals: "this person ships things and thinks deeply."
- Zero manual work beyond reading drafts and hitting publish.

> **Key Constraint — Every agent must know why this exists**
>
> The Rater scores low on trivial changes. The Writer frames work through the lens of skills demonstrated, not just features shipped. The Social Manager writes for recruiters and senior engineers, not just followers. The goal is interviews, not impressions.

---

## 2. dimeglio.dev — Publishing Architecture

Before building the pipeline, we audited the dimeglio.dev repo to understand exactly how content flows from files to the live site. Everything the pipeline produces must conform to this system.

### Tech Stack

| Layer | Details |
|---|---|
| Framework | Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui |
| Content | MDX files with typed frontmatter — parsed by gray-matter, rendered by next-mdx-remote/rsc |
| Code | rehype-pretty-code + Shiki (github-dark theme) |
| Deployment | Vercel — auto-deploys on git push to main |
| RAG | Pinecone vector store + OpenAI text-embedding-3-small — synced via `npm run ingest` |
| Monitoring | PostHog analytics + Sentry error tracking |

### Publishing a Blog Post — Exact Steps

> **Two steps. That's it.**
>
> 1. Drop an `.mdx` file into `content/blog/<slug>.mdx` with `published: true` in frontmatter
> 2. Run: `npm run ingest`
>
> The ingest script syncs all content to Pinecone (so Guillermo the AI assistant can find the new post) and auto-regenerates `lib/generated-blog-slugs.ts` (so Guillermo can link directly to the post). Then git commit + push triggers Vercel deploy.

### Draft Queue via `published: false`

The pipeline does NOT maintain a separate draft store. It uses the repo itself. Drafts are dropped into `content/blog/<slug>.mdx` with `published: false` — invisible on the site but readable in the editor. When Pablo approves a draft, he flips to `published: true` and runs `npm run ingest`.

### Blog Post Frontmatter Schema

The pipeline must produce all of these fields:

```yaml
---
title:         "Post title"
description:   "Short summary (shown in listing cards and OG meta)"
date:          "2026-05-08"
lastModified:  "2026-05-08"
tags:          ["react", "architecture"]
coverImage:    "/blog/my-slug/cover.jpg"
coverAlt:      "Descriptive alt text for the cover image"
published:     false
---
```

Note: cover images are generated as PNG then converted to JPG via `sips`. The frontmatter always references `cover.jpg`.

### Blog Voice Rules (from `AGENTS.md`)

The `AGENTS.md` in the dimeglio.dev repo has a detailed anti-AI-detection ruleset. **The Writer skill must read this file before generating any draft.**

#### Banned — immediate AI tells

- Buzzwords: "force multiplier", "game-changer", "paradigm shift", "revolutionize", "empower", "leverage" (verb), "delve", "tapestry", "landscape", "harness", "cutting-edge", "robust", "seamless", "humbling"
- Dramatic pauses: "That's not a typo", "Here's the beautiful part", "Let that sink in", "Here's the thing nobody tells you about X"
- Defensive framing: "This isn't about AI replacing engineers"
- Mic-drop endings, inspirational wrap-ups, profound conclusions
- Self-referential cleverness — explaining why something is ironic instead of letting the reader notice
- **Em-dashes (—) anywhere in prose** — zero tolerance, single loudest AI tell

#### Required — what real posts sound like

- Open with something personal — a frustration, a confession, a specific moment
- Show friction — what went wrong, what was annoying, what took too long
- Use imperfect transitions — "Anyway,", "So,", "The other thing was..."
- First person, casual — contractions, fragments, parenthetical asides
- Be specific — "40 minutes fighting the typography plugin" not "some challenges"
- End honestly — a practical takeaway or open question, never inspirational

> **Writer self-check before finalising any draft**
>
> ✓ Sounds like a dev blog by a real person → ship it
> ✗ Sounds like a Medium article or marketing case study → rewrite it

---

## 3. Pipeline Architecture

One Claude Code plugin, installed at the user level. Five agents. One config file. The Publisher is the only stateful component — everything else is stateless and reads from config.

### Daily Flow

| Step | What happens |
|---|---|
| Trigger | Publisher invoked via `/blog-pipeline:run` |
| Step 1 | Publisher reads `editorial_state.json` → scores projects → selects **1–2** for today |
| Step 2 | Reporter runs on each selected project: git log + markdown docs + **Claude Code session transcripts** |
| Step 3 | Writer takes Reporter JSON + project config → writes MDX draft (1200–2000 words) |
| Step 4 | Writer calls DALL-E 3 with post-specific prompt → saves cover.jpg. If project has a `logo_path`, composites logo onto cover via Pillow |
| Step 5 | Rater scores draft (substance, showcase, writing — threshold: 6.5 composite). Also runs deterministic regex checks for voice flags |
| Step 6 | Passing drafts dropped into `content/blog/<slug>.mdx` with `published: false` |
| Step 7 | Pablo reviews drafts → flips `published: true` → runs `npm run ingest` → git push |
| Step 8 | Social Manager generates LinkedIn + X copy via interactive review loop alongside each draft |

### Agent Overview

| Agent | Role | Model |
|---|---|---|
| Publisher | Orchestrator. Reads state, selects projects, spawns all subagents sequentially. | Sonnet |
| Reporter | Subagent. Spawned per project. Runs bash git commands + reads session transcripts. Returns JSON. | Haiku |
| Writer | Subagent. Takes Reporter JSON. Writes MDX + calls DALL-E 3. | Sonnet |
| Rater | Subagent. Takes draft MDX. Returns score + pass/fail. | Haiku |
| Social Manager | Interactive. Reads a post, produces LinkedIn + X drafts, revises until approved. | Sonnet |

---

## 4. Configuration Schema

A single JSON config file inside the plugin repo. The only file Pablo edits manually when adding a project or changing its tone.

### `projects.config.json` — top-level fields

```
dimeglio_dev_path      Absolute path to the dimeglio.dev repo (e.g. "~/Development/dimeglio.dev")
projects               Array of project config objects (see below)
```

### `projects.config.json` — per-project fields

```
id                      Unique slug e.g. "thepaddlegames"
name                    Display name e.g. "The Paddle Games"
path                    Absolute local path to the repo
git_remote              Default "origin"
lookback_days           How far back Reporter scans (default 14)
tone                    Writing personality — freeform text description
skills_showcased        string[] — skills to foreground in posts
min_days_between_posts  Cadence guard (default 5)
max_posts_per_month     Diversity cap (default 6)
priority                1–5, higher = featured more often when tied
image_theme             Object — see image theme schema below
liveUrl                 Optional. Canonical URL of the live product (e.g. "https://www.thepaddlegames.com/")
goToMarketState         Optional. One of: live | private-beta | waitlist-open | coming-soon | internal-only
surface                 Optional. One of: web | mobile-ios | mobile-android | cli | desktop
social                  Optional. Object with keys: instagram, x, linkedin, github (handle strings)
```

**`liveUrl`** — When set, the Writer must link to it the first time the post claims the product is live. The Rater flags its absence as a voice issue.

**`goToMarketState`** — Drives what go-to-market language is permitted in the post body. `live` = never say "waitlist", "early access", or "beta". `waitlist-open` = "join the waitlist" is allowed. Absent/unknown = omit go-to-market claims entirely.

**`surface`** — Validates UX phrasing. `web` = replace "open the app" with "visit the site"/"browse to". `mobile-ios`/`mobile-android` = replace "visit the URL" with "open the app".

**`social`** — For intro and project-launch posts, the Writer includes at least one handle in the closing paragraph.

### `image_theme` — per-project visual identity

Each project gets its own cover image aesthetic. The Writer reads this block and constructs the DALL-E 3 prompt. All projects share a dark background — only accents differ.

```
background         Hex — always dark e.g. "#000000"
accent_primary     Hex — main accent colour
accent_secondary   Hex — optional secondary accent (null if absent)
accent_tertiary    Hex — optional tertiary accent (included in DALL-E prompt if present)
style_keywords     Comma-separated visual motifs for the prompt
mood               Emotional/tonal adjectives for the prompt
logo_path          Optional. Absolute path to project logo PNG for compositing onto cover
```

**Logo compositing**: if `logo_path` is set and the file exists, the Writer composites the logo onto the bottom-right corner of the cover after DALL-E generation using Pillow (Python). Intro posts get a larger logo (15% of cover width); regular posts get a subtle watermark (9%). A soft drop shadow is applied. Compositing failures are non-fatal — the post keeps the DALL-E cover without the logo.

### Project Visual Identities

| Project | Accent Colours | Style & Mood |
|---|---|---|
| dimeglio.dev | `#a855f7` (purple) + `#6366f1` (indigo) | AI neural nets, geometric shapes, flowing data. Intelligent, sophisticated, forward-thinking. |
| The Paddle Games | `#4ade80` (lime) + `#06b6d4` (teal/cyan) | Wave forms, kinetic energy, water dynamics, sports tech. Energetic, competitive, fluid. |
| The Batcave | `#f7dd30` (Batman yellow) | Gothic geometry, dramatic light beams, signal radiating shapes. Dark, dramatic, technical. |
| Default | `#93c5fd` (cool blue-white) | Clean abstract tech. Used for any project until a custom theme is defined. |

### Full Example — The Paddle Games

```json
{
  "dimeglio_dev_path": "~/Development/dimeglio.dev",
  "projects": [
    {
      "id": "thepaddlegames",
      "name": "The Paddle Games",
      "path": "~/projects/thepaddlegames.com",
      "git_remote": "origin",
      "lookback_days": 14,
      "tone": "playful, product-focused, accessible to non-developers",
      "skills_showcased": ["GCP Cloud Functions", "Firestore", "Pub/Sub", "React", "geospatial"],
      "min_days_between_posts": 5,
      "max_posts_per_month": 4,
      "priority": 3,
      "liveUrl": "https://www.thepaddlegames.com/",
      "goToMarketState": "live",
      "surface": "web",
      "social": {
        "instagram": "@the.paddle.games"
      },
      "image_theme": {
        "background": "#000000",
        "accent_primary": "#4ade80",
        "accent_secondary": "#06b6d4",
        "accent_tertiary": null,
        "style_keywords": "wave forms, kinetic energy, water dynamics, sports tech",
        "mood": "energetic, competitive, fluid",
        "logo_path": null
      }
    }
  ]
}
```

---

## 5. Agent Specifications

### 5.1 Reporter

Read-only. Gathers raw evidence of work done from local git history and Claude Code session transcripts. Does not editorialize — that's the Writer's job. Runs via bash on the local repo path.

**Model: Haiku** (no creativity needed — mechanical data extraction)

#### Inputs
- `project_id` string — looks up the entry in `projects.config.json`
- OR a full project config object passed directly

#### Process — bash commands on local repo

- `git -C <path> log --oneline --since="<lookback_days> days ago"` — commit messages, SHAs, timestamps
- `git -C <path> diff --stat "HEAD@{<lookback_days>.days.ago}" HEAD` — files changed, insertions/deletions
- Discover and read **all** markdown files in the repo (excluding `node_modules`, `.git`, `dist`, `build`, `CLAUDE.md`) — service READMEs and architecture docs often reflect real state better than the root README
- Group commits into logical themes (not one bullet per commit). If < 3 themed work units found → set `low_signal: true`

#### Step 5b — Claude Code session context (key addition)

Git commits record *what* changed. Claude Code session transcripts record *why*. The Reporter reads both.

Derive the Claude Code project directory by encoding the project path (replace `/` with `-`):

```bash
ENCODED=$(echo "$EXPANDED_PATH" | sed 's|/|-|g')
CLAUDE_PROJECT_DIR="$HOME/.claude/projects/$ENCODED"
```

Find `.jsonl` session files modified within the lookback window, extract user messages with timestamps inside the window. User messages describe the actual problem, intent, and context — things that never make it into commit messages. Collect up to 25 messages, truncated to 600 chars each. If no session files exist, skip gracefully — session context is optional.

#### Output — structured JSON

```json
{
  "project_id": "thepaddlegames",
  "period": { "from": "2026-04-24", "to": "2026-05-08" },
  "low_signal": false,
  "summary": "One paragraph — factual description of what engineering work happened. No opinions.",
  "recent_features": [{ "title": "...", "description": "...", "commits": ["sha1"] }],
  "bugs_fixed": [{ "title": "...", "impact": "..." }],
  "architecture_changes": [{ "title": "...", "before": "...", "after": "..." }],
  "highlights": ["One concrete sentence naming the most blog-worthy work unit. Max 25 words."],
  "tech_signals": ["outbox pattern", "webhook idempotency", "Strava OAuth"],
  "session_context": ["Verbatim user message from Claude Code session (max 600 chars)", "..."]
}
```

`session_context` is **omitted** (not an empty array) if no sessions were found. The Writer treats it as optional enrichment — when present, it's the primary source for *why* decisions were made.

If `low_signal: true`, only emit `project_id`, `period`, `low_signal`, and `summary`.

---

### 5.2 Writer

Transforms Reporter JSON into a complete MDX file ready to drop into `content/blog/`. Also generates and downloads the cover image via DALL-E 3.

**Model: Sonnet** (writing quality and voice adherence matter)

#### Inputs
- Reporter JSON output (including `session_context` when present — treat as primary source for *why*)
- Project config: `tone`, `skills_showcased`, `image_theme`, `liveUrl`, `goToMarketState`, `surface`, `social`
- Blog voice rules from `dimeglio.dev/AGENTS.md` — **read this file fresh every run**

#### MDX Body

**Length: 1200–2000 words, targeting ~1600.** Under 1000 feels thin; over 2200 loses readers. Existing posts hit length by exploring the problem deeply, walking through architecture decisions, and including a meaningful wrinkle/postmortem section.

**Structure:**
1. Opening paragraphs (no heading) — concrete moment: a bug, a surprise, a decision point. 2–4 paragraphs.
2. 5–8 `##` sections named by concept/topic (not by step or PR number)
3. `###` subsections inside `##` when a concept has 2+ distinct named sub-parts
4. Code snippets — short and trimmed, annotated with file paths
5. Mermaid diagram — required for any post describing architecture, a pipeline, or a flow with 2+ moving parts
6. Markdown tables — for before/after comparisons, approach matrices, or option summaries
7. Internal links to prior published posts (verify target is published before linking)
8. Body image placeholders — 1–3 `{/* ![alt](path) */}` comments at natural visual breakpoints
9. A wrinkle section — what almost broke, what you'd do differently, what's still not solved
10. Closing section — practical and honest, never inspirational
11. Closing footer: `---` + blank line + italic credit/source line ending with a GitHub link

**Single-topic rule**: Pick one main topic from the Reporter JSON and write the entire post about it. Secondary issues that don't contribute to the main story are omitted entirely — including them makes the post feel like a changelog.

**No fabricated specifics**: Only include time estimates and counts that appear explicitly in `session_context` or Reporter JSON. Do not invent them.

#### Intro Mode

When the Publisher prompt says "FIRST post for this project", use intro mode instead of the normal body structure. Intro posts cover:
1. What the project is and who uses it (personal opening, not a product announcement)
2. The architecture (Mermaid diagram required, name all main components)
3. Why these tech choices (at least one honest tradeoff)
4. What's shipped so far (concrete features, not a roadmap)
5. What's being worked on now (bridges to feature posts)
6. Honest closing (what's hard, what's next — practical, not inspirational)

Source material for intro mode: all markdown files in the project repo (read every one found), plus project config `tone` and `skills_showcased`. Reporter JSON is secondary context only.

#### Pre-Write Accuracy Checks

Before writing the file, the Writer runs:

1. **Internal link verification**: for every `/blog/<slug>` in the draft, check that the slug exists in `lib/generated-blog-slugs.ts` AND the target MDX has `published: true`. If either check fails, remove the link and use prose instead ("a follow-up post coming soon").

2. **Live product link**: if `liveUrl` is set and the draft claims the product is live, verify the URL appears as a clickable markdown link. If not, add it near the first such claim.

3. **Social handles**: if the project has a `social` object and this is an intro post or project-launch post, include at least one handle in the closing section.

4. **Go-to-market language**: match body status claims to `goToMarketState`. If `live`: never say "waitlist", "early access", "beta". If `waitlist-open`: "join the waitlist" is allowed. If absent: omit go-to-market claims entirely.

5. **UX surface phrasing**: if `surface` is `web`, replace "open the app" / "in the app" with "visit the site" / "browse to". If `mobile-*`, replace "visit the URL" with "open the app".

6. **No insider roadmap labels**: strip "Phase N", "Sprint N", "Milestone N", "Q[1-4] OKR", "Epic [name]". Replace with the user-visible capability.

#### Cover Image — DALL-E 3

The prompt is built from two sources: post content (title, description, `##` headings extracted from the MDX just written) + project style (`image_theme`). This makes each cover reflect the specific post, not just the project's general aesthetic.

```
Prompt structure:
"A modern, cinematic blog cover image for a tech article titled '{title}'."
"The article is about: {description}"
"Key topics: {headings}"
"Background: true black ({background}). Primary accent: {accent_primary}. Secondary: {accent_secondary}.[Tertiary: {accent_tertiary}.]"
"Style: {style_keywords}. Mood: {mood}."
"No faces, no logos. No text or labels — only exception: if the main topic is a named technical pattern, that single name may appear as a subtle label."
"Aspect ratio: 16:9. Dark, premium, editorial quality."

Model: dall-e-3 · Size: 1792x1024 · Quality: standard
Generated as PNG, converted to JPG via sips, saved to: public/blog/{slug}/cover.jpg
```

If `logo_path` is set and the file exists, composite the project logo onto the bottom-right corner using Pillow. Intro posts: 15% of cover width. Regular posts: 9%. Soft drop shadow applied. Failure is non-fatal — the DALL-E cover without the logo is still usable.

#### Return JSON

```json
{
  "project_id": "...",
  "slug": "YYYY-MM-DD-...",
  "title": "...",
  "mdx_path": "/full/path/to/content/blog/<slug>.mdx",
  "cover_path": "/full/path/to/public/blog/<slug>/cover.jpg",
  "cover_ok": true,
  "errors": []
}
```

---

### 5.3 Rater

Quality gate. Scores each draft and decides whether it enters the queue.

**Model: Haiku** (structured scoring with a rubric — no creativity needed)

#### Deterministic Pre-Checks (regex — any match = auto-fail)

Run against the MDX body with code blocks stripped:

```bash
# Em-dashes — zero tolerance outside code blocks
grep -o '—' | wc -l

# Banned buzzwords (case-insensitive)
grep -iE 'force multiplier|game.changer|paradigm shift|revolutionize|leverage|delve|tapestry|landscape|harness|cutting.edge|robust|seamless|humbling|empower'

# Dramatic pauses
grep -iE "that's not a typo|here's the beautiful part|let that sink in|here's the thing nobody"

# Profound / mic-drop conclusions
grep -iE "this is what .+ actually means|this demonstrates|this showcases"

# Banned title formulas
grep -iE "^How .+ Led to .+$|^How I Built .+$|^Why .+ Matters|^Building .+ with .+$|^What .+ Taught Me"

# Title em-dash or colon-subtitle
grep -E '—|.+:.+'

# Insider roadmap labels — reader has no context
grep -iE 'phase [0-9]+|sprint [0-9]+|milestone [0-9]+|q[1-4] (roadmap|okr)|epic [a-z0-9-]+'

# Unverified go-to-market language
grep -iE 'waitlist|early access|join the beta|sign up for (early|beta)'
```

Also run a non-regex check: for every internal `/blog/<slug>` link in the body, verify the slug appears in `lib/generated-blog-slugs.ts` AND the target MDX has `published: true`. A link to an unpublished post is an auto-fail.

All matches are collected as `voice_flags`. Any non-empty `voice_flags` → `pass: false` regardless of composite score.

#### Scoring Dimensions

| Dimension | Weight | Description |
|---|---|---|
| Substance (1–10) | 40% | Named APIs, errors, patterns. Architecture diagram. Specific metrics. Nothing hand-waved. |
| Showcase (1–10) | 40% | Debugging discipline, architectural decision with tradeoffs, observability, honest retrospective. |
| Writing (1–10) | 20% | Zero AI tells. Imperfect transitions. Honest friction. Reads like a dev blog. |
| Composite | — | Must be ≥ 6.5 to pass. Voice flags override — any flag = fail. |

#### Output

```json
{
  "mdx_path": "/full/path/to/slug.mdx",
  "slug": "YYYY-MM-DD-slug",
  "title": "Post title from frontmatter",
  "pass": true,
  "composite": 8.4,
  "scores": {
    "substance": 8.5,
    "showcase": 9.0,
    "writing": 7.0
  },
  "voice_flags": [],
  "notes": "2–4 sentences: what's strongest, what the author should fix before publishing. Concrete and direct — not encouraging."
}
```

---

### 5.4 Publisher

The only stateful agent. Owns the editorial calendar, the project selection logic, and the daily orchestration.

**Model: Sonnet** (orchestration requires reasoning about state and edge cases)

#### `editorial_state.json`

Lives at `${dimeglio_dev_path}/editorial_state.json`. Committed to git — publishing history survives machine switches.

```json
{
  "last_run": "2026-05-12T07:00:00Z",
  "projects": {
    "thepaddlegames": {
      "last_posted": "2026-05-12",
      "posts_this_month": 3,
      "has_intro_post": true,
      "draft_queue": [
        {
          "slug": "2026-05-12-behind-the-paddle-games",
          "title": "Behind The Paddle Games",
          "mdx_path": "/full/path/to/content/blog/2026-05-12-behind-the-paddle-games.mdx",
          "cover_ok": true,
          "rater_composite": 9.0,
          "rater_pass": true,
          "intro_mode": true,
          "created_at": "2026-05-12",
          "status": "pending_review"
        }
      ],
      "run_history": []
    }
  }
}
```

Key fields per project:
- `has_intro_post` — prevents the pipeline from producing redundant intro posts once the first one ships
- `draft_queue` — per-project (not top-level); entries added after each Rater run
- `status` — `"pending_review"` (passed Rater) or `"rejected"` (failed Rater; MDX kept on disk)

#### Project Selection Logic

Score every project:

```
score = priority (1–5 from config)
      + 2 × floor(days_since_last_post / 7)          # +2 per week without a post
      - (3 if days_since_last_post < min_days_between_posts else 0)  # cooldown
      - (10 if posts_this_month >= max_posts_per_month else 0)       # monthly cap
```

`days_since_last_post` defaults to 30 if `last_posted` is null. Sort descending; select top **1–2**. Before adding a project to the selected list, check if it already has a `draft_queue` entry with `created_at` equal to today — if so, skip (idempotency).

#### Intro Mode Detection

For each selected project, check `projects[id].has_intro_post`. If `false`, run in intro mode — the Publisher embeds the phrase "FIRST post for this project" in the Writer prompt. If the Rater passes an intro post, set `has_intro_post: true` in state.

On first bootstrap: if published posts already exist on the site but `last_posted` is null, log a warning — "Project <id> may already have published content — verify `has_intro_post` manually." Do not auto-set it.

---

### 5.5 Social Media Manager

Runs after a draft passes review. Produces LinkedIn and X copy through an **interactive review loop** — not a one-shot JSON dump. The Social Manager presents drafts, collects feedback, revises, and repeats until Pablo approves. Output is saved as `<slug>.social.json` next to the MDX file.

**Model: Sonnet** (platform-native tone matters)

**Invocation**: manual, after reviewing a post. Pass the MDX path as the argument.

#### LinkedIn Post

- 150–250 words, short paragraphs
- Structure: hook → what I solved / built → what was interesting or hard → CTA with link
- Tone: professional but human
- Ends with a question or thought to drive comments
- Explicitly surfaces one of the project's `skills_showcased`

#### X Post

- **Option A** — single tweet (~240 chars): punchy hook + link
- **Option B** — thread (3–6 tweets): if the topic has 3+ distinct ideas; last tweet has the link
- Tone: direct, technical, confident
- Max 2 hashtags. No "excited to share".

#### Output file — `<slug>.social.json`

```json
{
  "linkedin": {
    "body": "Full LinkedIn post text — ready to paste",
    "char_count": 198
  },
  "x": {
    "format": "thread",
    "tweets": [
      "Tweet 1 — hook",
      "Tweet 2 — key insight",
      "dimeglio.dev/blog/my-slug — full post"
    ]
  }
}
```

---

## 6. Plugin Repo & Installation

The `blog-pipeline-plugin` GitHub repo IS the plugin — no build step, no packaging infrastructure. Everything is markdown and JSON.

### Repo Structure

```
blog-pipeline-plugin/
├── .claude-plugin/
│   └── plugin.json          ← manifest (name, description, version)
├── .env                     ← OPENAI_API_KEY (gitignored)
├── .mcp.json                ← tool connections (empty — local bash only)
├── skills/
│   ├── reporter/
│   │   └── SKILL.md
│   ├── writer/
│   │   └── SKILL.md
│   ├── rater/
│   │   └── SKILL.md
│   ├── publisher/
│   │   └── SKILL.md
│   └── social-manager/
│       └── SKILL.md
├── projects.config.json     ← project list + per-project config
└── README.md
```

### `plugin.json` Manifest

```json
{
  "name": "blog-pipeline",
  "displayName": "Blog Pipeline",
  "description": "Agentic blog content pipeline for dimeglio.dev — reporter, writer, rater, publisher, and social manager.",
  "version": "0.1.0",
  "author": "Pablo Di Meglio"
}
```

### Execution Model — Subagents

Each skill runs as a subagent spawned by the Publisher. This keeps context clean — the Reporter's raw git history never pollutes the Writer's context, and the Writer's MDX never pollutes the Rater's context.

The Social Manager is the exception: it runs interactively, invoked manually by Pablo after he reviews a draft. It is not spawned by the Publisher.

### State & Config Files Outside the Plugin

| File | Location | Notes |
|---|---|---|
| `projects.config.json` | Plugin repo root | Edit here to add/update projects. Committed to git. |
| `editorial_state.json` | `dimeglio.dev/` root | Committed — publishing history survives machine switches. |
| `public/blog/<slug>/` | `dimeglio.dev/public/` | Cover images written here by the Writer. |
| `content/blog/<slug>.mdx` | `dimeglio.dev/content/blog/` | Drafts written with `published: false`. Flipped on approval. |
| `<slug>.social.json` | `dimeglio.dev/content/blog/` | Social copy saved by Social Manager alongside MDX. |

---

## 7. Build Order & Phases

| Phase | Deliverable | Status |
|---|---|---|
| Phase 1 — Reporter | Reads local git history + markdown docs + Claude Code session transcripts. Outputs validated JSON. | ✓ Built |
| Phase 2 — Writer | Writes MDX draft (1200–2000 words) + DALL-E 3 cover image. Follows voice rules. Supports intro mode. | ✓ Built |
| Phase 3 — Rater | Scores drafts, runs deterministic voice-flag checks (including roadmap labels, go-to-market, internal links), outputs pass/fail. | ✓ Built |
| Phase 4 — Publisher | `editorial_state.json` + project selection + intro mode detection + daily orchestration. | ✓ Built |
| Phase 5 — Social Manager | Interactive LinkedIn + X copy review loop. Saves `<slug>.social.json`. | ✓ Built |
| Phase 6 — Review UI | Draft queue dashboard in Claude Code — title, score, project, approve/reject. | Not built |

---

## 8. Open Questions — Status

| Question | Decision | Status |
|---|---|---|
| Publishing mechanism | Drop MDX into `content/blog/` + `npm run ingest` + git push. Vercel autodeploys. | ✓ Resolved |
| Draft queue location | `published: false` files in `content/blog/` — the repo is the queue. Per-project tracking in `editorial_state.json`. | ✓ Resolved |
| Repo access | Local repos only via bash. All project repos are on Pablo's machine. | ✓ Resolved |
| Image generation | DALL-E 3 via `OPENAI_API_KEY` in `.env` at plugin root. PNG→JPG via sips. Logo compositing via Pillow. | ✓ Resolved |
| Social posting | Interactive copy-paste loop via Social Manager. No direct API posting. | ✓ Resolved |
| Project image themes | Per-project `image_theme` block in config. Optional `logo_path` for compositing. | ✓ Resolved |
| Plugin structure | GitHub repo with `.claude-plugin/`, `skills/`. Install via CLI or `enabledPlugins` in settings.json. | ✓ Resolved |
| Review UI | Claude Code artifact for the draft queue. | Pending — Phase 6 |
| State storage | `editorial_state.json` lives in the plugin root alongside `projects.config.json` and `series.config.json`. Per-project draft queues, `has_intro_post` flag. | ✓ Resolved |
| OpenAI key scope | `OPENAI_API_KEY` in `.env` at plugin root covers both embeddings (ingest) and DALL-E 3 images. | ✓ Resolved |
| Session context | Reporter reads Claude Code `.jsonl` session transcripts for the *why* behind commits. | ✓ Resolved |

---

## 9. Future Ideas (Post-MVP)

- **Narrative arc tracking** — Publisher notices if last 5 posts were all frontend, boosts backend/architecture projects.
- **Engagement feedback** — import LinkedIn/X metrics and adjust Rater scoring model based on what actually performs.
- **Draft editing in Claude Code** — let Pablo edit a draft inline before approving, not just approve/reject.
- **Cross-project posts** — a single post connecting work done across two projects (e.g. a shared library).
- **Interview prep mode** — on demand, generate a Greatest Hits summary of the last 3 months as STAR-method interview stories.
- **Recruiter one-pager** — auto-generate a project showcase PDF from the last N published posts.
- **Direct social posting** — LinkedIn + X API integration once the copy-paste flow is validated.
- **GitHub MCP** — extend Reporter to handle remote-only repos without requiring a local clone.
- **Review UI** — Phase 6: draft queue dashboard showing title, composite score, project, and approve/reject controls.

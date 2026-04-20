# RAG Ingestion Pipeline — dimeglio.dev

> How content gets from MDX files into Pinecone for the AI assistant.

---

## Overview

The RAG (Retrieval-Augmented Generation) pipeline reads all content from the portfolio, converts it into vector embeddings, and stores them in Pinecone. When the AI assistant receives a question, it queries Pinecone for the most relevant content chunks, then uses those as context to generate an informed response.

```
content/                          Pinecone
├── experience/*.mdx    ─┐       ┌─────────────────────┐
├── projects/*.mdx       ├──→ ingest.mjs ──→ │  dimeglio-portfolio   │
├── blog/*.mdx           │   (embed + upsert) │  1536d dense vectors  │
└── rag/*.md            ─┘       └─────────────────────┘
```

## Architecture

### Embedding Model

| Setting | Value |
|---------|-------|
| Model | `text-embedding-3-small` (OpenAI) |
| Dimensions | 1536 (dense) |
| Cost | ~$0.02 per 1M tokens |

This model was chosen for its optimal cost/performance ratio. The full corpus (~42 files) costs fractions of a cent to embed.

### Vector Database

| Setting | Value |
|---------|-------|
| Provider | Pinecone |
| Index | `dimeglio-portfolio` |
| Metric | Cosine similarity |
| Dimensions | 1536 |

### Content Sources

| Source | Directory | Count | Format | Description |
|--------|-----------|-------|--------|-------------|
| Experience | `content/experience/*.mdx` | 18 | MDX | Jobs, certifications, education |
| Projects | `content/projects/*.mdx` | 18 | MDX | Professional + personal projects |
| Blog | `content/blog/*.mdx` | 1-2+ | MDX | Published blog posts only |
| RAG Docs | `content/rag/*.md` | 4 | Markdown | Bio, skills, FAQ, interests |

**Note:** Unpublished blog posts (`published: false`) are automatically skipped.

## Chunking Strategy

Long documents are split into **section-based chunks** using `##` (h2) headings before embedding. This improves retrieval precision — a question about kiteboarding matches a focused kiteboarding chunk instead of a diluted 76-line interests blob.

### Rules

| Content Type | Chunking | Reason |
|-------------|----------|--------|
| RAG docs (`content/rag/*.md`) | ✂️ Split by `##` headings | Large, topically diverse (bio sections, FAQ pairs, skill categories, interest areas) |
| Blog posts (`content/blog/*.mdx`) | ✂️ Split by `##` headings | Long-form with distinct sections |
| Experience (`content/experience/*.mdx`) | 📄 Single vector | Already short & focused (~10-20 lines per role) |
| Projects (`content/projects/*.mdx`) | 📄 Single vector | Already short & focused (~15-25 lines per project) |

### How It Works

1. The markdown body is split on `## ` heading lines (h2 only — `###` and deeper stay with their parent section)
2. Content before the first `##` becomes an "Introduction" chunk (if non-empty)
3. Each chunk gets a unique vector ID: `{slug}--{section-slug}` (e.g., `bio--origin-story`, `faq--visa-sponsorship`)
4. Each chunk's knowledge string includes the **document-level context header** (type, title, company, etc.) plus the section content — so every chunk knows what document it belongs to

### Example: `faq.md` → 10 Vectors

| Vector ID | Section |
|-----------|---------|
| `faq--tell-me-about-yourself` | Tell me about yourself. |
| `faq--why-are-you-looking-for-a-new-role` | Why are you looking for a new role? |
| `faq--whats-your-ideal-team-or-company` | What's your ideal team or company? |
| `faq--whats-your-biggest-professional-achievement` | What's your biggest professional achievement? |
| `faq--do-you-want-to-manage-people` | Do you want to manage people? |
| `faq--do-you-need-visa-sponsorship` | Do you need visa sponsorship? |
| `faq--are-you-open-to-relocation` | Are you open to relocation? |
| `faq--whats-your-availability` | What's your availability? |
| `faq--whats-your-salary-expectations` | What's your salary expectations? |
| `faq--what-languages-do-you-speak` | What languages do you speak? |

### Vector ID Format

- **Whole-file vectors:** `{slug}` (e.g., `exp-google-shopping`, `proj-batcave`)
- **Chunked vectors:** `{slug}--{section-slug}` (e.g., `bio--us-journey`, `interests--kiteboarding`)

## Knowledge String Construction

Each chunk (or whole file) is converted into a "knowledge string" — a rich text representation optimized for embedding. The format varies by content type:

### Experience
```
Type: Experience
Title: Senior Full Stack Software Engineer
Company: Google Agile Modeling Studio (via Globant)
Dates: 2023-01 to 2025-03

Details:
[markdown body]
```

### Project
```
Type: Project
Title: Generative UI Engine
Company: rPotential
Category: Professional
Description: An AI-first platform where LLMs dynamically compose...
Tech Stack: React, TypeScript, GenUI, Node.js, Fastify, LLMs, Claude, Gemini

Details:
[markdown body]
```

### Blog Post
```
Pablo Di Meglio wrote a blog post titled "How I Built dimeglio.dev in 3 Days with AI".
Type: Blog Post
Slug: building-dimeglio-dev-with-ai
Title: How I Built dimeglio.dev in 3 Days with AI
Date: 2026-04-12
Description: A behind-the-scenes look at building...
Tags: ai, nextjs, react, portfolio
Cover Image: /blog/building-dimeglio-dev-with-ai/cover.jpg
Portfolio URL: https://dimeglio.dev/blog/building-dimeglio-dev-with-ai

Section: Two AIs, Two Jobs
[section markdown body]
```

### RAG Document
```
Type: Personal & Professional Biography

[full markdown body — already structured for RAG]
```

## Metadata Schema

Each Pinecone record includes filterable metadata:

| Field | Type | Present On | Description |
|-------|------|-----------|-------------|
| `type` | string | All | `experience`, `project`, `blog`, `rag` |
| `slug` | string | All | Filename without extension |
| `title` | string | Experience, Project, Blog | Display title |
| `company` | string | Experience, Project | Employer or client |
| `category` | string | Project | `Professional` or `Personal` |
| `start_date` | string | Experience | `YYYY-MM` format |
| `end_date` | string | Experience | `YYYY-MM` or `Present` |
| `date` | string | Blog | ISO date |
| `cover_image` | string | Blog | Cover image path (e.g., `/blog/slug/cover.jpg`) |
| `tech_stack` | string | Project | Comma-separated skills |
| `tags` | string | Blog | Comma-separated tags |
| `knowledge_string` | string | All | Full text for LLM context retrieval |
| `section_title` | string | Chunked vectors | Human-readable section heading (e.g., "Kiteboarding / Kitesurfing") |
| `chunk_index` | number | Chunked vectors | 0-based position within parent document |
| `total_chunks` | number | Chunked vectors | Total chunks from parent document |
| `parent_slug` | string | Chunked vectors | Slug of the source file (same as `slug`) |

## Running the Pipeline

### Prerequisites

1. `.env.local` with required API keys:
   ```
   PINECONE_API_KEY=pcsk_your_key
   PINECONE_INDEX_NAME=dimeglio-portfolio
   OPENAI_API_KEY=sk-your_key
   ```

2. Dependencies installed:
   ```bash
   npm install
   ```

### Execute

```bash
npm run ingest
```

Or directly:
```bash
node scripts/ingest.mjs
```

### What Happens

1. **Discovery** — Finds all `.mdx` and `.md` files across the 4 content directories
2. **Parsing** — Uses `gray-matter` to extract frontmatter and markdown body
3. **Chunking** — RAG docs and blog posts are split by `##` headings; experience/projects stay whole
4. **Knowledge Strings** — Constructs type-specific text representations (each chunk gets the document's context header)
5. **Clear Index** — Deletes all existing vectors to prevent orphans from old ID schemes
6. **Embedding** — Sends each knowledge string to `text-embedding-3-small` (1536d)
7. **Upserting** — Batches vectors (10 at a time) and upserts to Pinecone
8. **Blog Slug Sync** — Auto-generates `lib/generated-blog-slugs.ts` with the slugs of all published blog posts that were ingested. This file is imported by `lib/chat-slugs.ts` so that Guillermo's chat widgets can validate blog deep links without manual slug list maintenance.

### Re-running

The script is **idempotent** — it clears the entire index and re-inserts everything from scratch. You can safely re-run anytime:

- After adding a new blog post
- After updating an experience or project MDX
- After modifying RAG docs (bio, skills, FAQ, interests)
- After any content change

At ~42 files, the full run takes seconds and costs fractions of a cent.

## Adding New Content

### New Blog Post
1. Create `content/blog/my-post.mdx` with `published: true`
2. Run `npm run ingest`
3. The post is now searchable by the AI assistant

### New Experience or Project
1. Create the MDX file in the appropriate directory
2. Run `npm run ingest`

### Updating RAG Docs
1. Edit the file in `content/rag/`
2. Run `npm run ingest`

### Content Not Indexed
- Unpublished blog posts (`published: false`)
- Static assets (images, PDFs)
- Component code, configuration files
- Documentation in `docs/`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PINECONE_API_KEY` | ✅ | Pinecone API key from [app.pinecone.io](https://app.pinecone.io) |
| `PINECONE_INDEX_NAME` | ✅ | Name of the Pinecone index (`dimeglio-portfolio`) |
| `OPENAI_API_KEY` | ✅ | OpenAI API key for `text-embedding-3-small` |

All keys are stored in `.env.local` (gitignored).

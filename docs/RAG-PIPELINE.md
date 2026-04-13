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

## Knowledge String Construction

Each file is converted into a "knowledge string" — a rich text representation optimized for embedding. The format varies by content type:

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
Type: Blog Post
Title: How I Built dimeglio.dev in 3 Days with AI
Date: 2026-04-12
Description: A behind-the-scenes look at building...
Tags: ai, nextjs, react, portfolio

Details:
[markdown body]
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
| `tech_stack` | string | Project | Comma-separated skills |
| `tags` | string | Blog | Comma-separated tags |
| `knowledge_string` | string | All | Full text for LLM context retrieval |

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
3. **Knowledge Strings** — Constructs type-specific text representations
4. **Embedding** — Sends each knowledge string to `text-embedding-3-small` (1536d)
5. **Upserting** — Batches vectors (10 at a time) and upserts to Pinecone

### Re-running

The script is **idempotent**. Pinecone upserts overwrite existing records with the same `id` (slug). You can safely re-run the full pipeline anytime:

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

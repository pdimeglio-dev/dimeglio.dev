#!/usr/bin/env node

/**
 * RAG Ingestion Pipeline — dimeglio.dev
 *
 * Reads all content (experience, projects, blog, RAG docs), constructs
 * knowledge strings, splits long documents into section-based chunks,
 * generates embeddings via text-embedding-3-small, and upserts to Pinecone.
 *
 * Chunking strategy:
 *   - RAG docs & blog posts → split by ## headings (each section = 1 vector)
 *   - Experience & project MDX → kept as single vectors (already short & focused)
 *
 * Run this script whenever you publish, unpublish, or edit a blog post
 * (or any other content in /content/). It re-syncs Pinecone AND auto-generates
 * lib/generated-blog-slugs.ts so Guillermo's deep links stay valid.
 *
 * Usage:
 *   node scripts/ingest.mjs
 *
 * Requires .env.local with:
 *   PINECONE_API_KEY, PINECONE_INDEX_NAME, OPENAI_API_KEY
 */

import { config } from "dotenv";
import { glob } from "glob";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import matter from "gray-matter";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

config({ path: ".env.local" });

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMS = 1536;
const BATCH_SIZE = 10;

const requiredEnvVars = ["PINECONE_API_KEY", "PINECONE_INDEX_NAME", "OPENAI_API_KEY"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing environment variable: ${envVar}`);
    console.error(`   Make sure .env.local exists with ${requiredEnvVars.join(", ")}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

console.log("\n🧠 Initializing Pablo's Brain...\n");

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

console.log(`   📌 Pinecone index: ${process.env.PINECONE_INDEX_NAME}`);
console.log(`   🤖 Embedding model: ${EMBEDDING_MODEL} (${EMBEDDING_DIMS}d)`);

// ---------------------------------------------------------------------------
// Content Discovery
// ---------------------------------------------------------------------------

/**
 * Determine content type from file path.
 */
function getContentType(filePath) {
  if (filePath.includes("/experience/")) return "experience";
  if (filePath.includes("/projects/")) return "project";
  if (filePath.includes("/blog/")) return "blog";
  if (filePath.includes("/rag/")) return "rag";
  return "unknown";
}

/**
 * Derive a human-readable RAG document type from filename.
 */
function getRagDocType(slug) {
  const map = {
    bio: "Personal & Professional Biography",
    "skills-inventory": "Technical Skills Inventory",
    faq: "Frequently Asked Questions",
    interests: "Personal Interests & Athletics",
  };
  return map[slug] || "RAG Document";
}

/**
 * Convert a heading string to a URL-friendly slug.
 *   "The US Journey" → "the-us-journey"
 *   "Do you need visa sponsorship?" → "do-you-need-visa-sponsorship"
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------

/**
 * Split markdown body into section-based chunks using ## headings.
 *
 * Returns an array of { sectionTitle, sectionSlug, body } objects.
 * Content before the first ## heading becomes a chunk with sectionTitle "Introduction".
 *
 * Only splits on ## (h2) — not ###, ####, etc. Sub-headings stay with their parent section.
 */
function splitBySections(markdownBody) {
  const lines = markdownBody.split("\n");
  const chunks = [];
  let currentTitle = "Introduction";
  let currentSlug = "introduction";
  let currentLines = [];

  for (const line of lines) {
    // Match ## headings (but not ### or deeper)
    const h2Match = line.match(/^## (.+)$/);

    if (h2Match) {
      // Save the previous chunk if it has content
      const body = currentLines.join("\n").trim();
      if (body.length > 0) {
        chunks.push({
          sectionTitle: currentTitle,
          sectionSlug: currentSlug,
          body,
        });
      }

      // Start a new chunk
      currentTitle = h2Match[1].trim();
      currentSlug = slugify(currentTitle);
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Don't forget the last chunk
  const body = currentLines.join("\n").trim();
  if (body.length > 0) {
    chunks.push({
      sectionTitle: currentTitle,
      sectionSlug: currentSlug,
      body,
    });
  }

  return chunks;
}

/**
 * Decide whether a content type should be chunked by sections.
 * Experience and project MDX files are already short and focused — no need to split.
 */
function shouldChunk(type) {
  return type === "rag" || type === "blog";
}

// ---------------------------------------------------------------------------
// Knowledge Strings
// ---------------------------------------------------------------------------

/**
 * Build a context header for a document (used as prefix for every chunk).
 * This ensures each chunk retains the parent document's identity.
 *
 * The first line is a plain-English semantic anchor sentence so that
 * company/employer queries rank project and experience chunks correctly.
 */
function buildContextHeader(type, frontmatter, slug) {
  const parts = [];

  switch (type) {
    case "experience": {
      // Semantic anchor — makes "worked at Google" queries match this chunk
      const dateRange = frontmatter.startDate && frontmatter.endDate
        ? ` from ${frontmatter.startDate} to ${frontmatter.endDate}`
        : frontmatter.startDate ? ` since ${frontmatter.startDate}` : "";
      parts.push(
        `Pablo Di Meglio worked as ${frontmatter.title || "Engineer"} at ${frontmatter.company || "Unknown"}${dateRange}.`
      );
      parts.push(`Type: Experience`);
      parts.push(`Slug: ${slug}`);
      parts.push(`Title: ${frontmatter.title || "Unknown"}`);
      parts.push(`Company: ${frontmatter.company || "Unknown"}`);
      if (frontmatter.location) parts.push(`Location: ${frontmatter.location}`);
      parts.push(`Dates: ${frontmatter.startDate || "?"} to ${frontmatter.endDate || "?"}`);
      if (frontmatter.skills?.length) {
        parts.push(`Skills: ${frontmatter.skills.join(", ")}`);
      }
      break;
    }

    case "project": {
      // Semantic anchor — makes "projects at Google / using Kotlin" queries match
      const atCompany = frontmatter.company ? ` at ${frontmatter.company}` : "";
      parts.push(
        `Pablo Di Meglio worked on the project "${frontmatter.title || "Unknown"}"${atCompany}.`
      );
      if (frontmatter.description) {
        parts.push(`Summary: ${frontmatter.description}`);
      }
      parts.push(`Type: Project`);
      parts.push(`Slug: ${slug}`);
      parts.push(`Title: ${frontmatter.title || "Unknown"}`);
      if (frontmatter.company) parts.push(`Company: ${frontmatter.company}`);
      parts.push(`Category: ${frontmatter.category || "Unknown"}`);
      if (frontmatter.logoFile) parts.push(`Logo File: ${frontmatter.logoFile}`);
      if (frontmatter.startDate) parts.push(`Start Date: ${frontmatter.startDate}`);
      if (frontmatter.endDate) parts.push(`End Date: ${frontmatter.endDate}`);
      if (frontmatter.techStack?.length) {
        parts.push(`Tech Stack: ${frontmatter.techStack.join(", ")}`);
      }
      if (frontmatter.associatedExperience) {
        parts.push(`Associated Experience: ${frontmatter.associatedExperience}`);
      }
      // External links — lets the AI cite real URLs when users ask "do you have a link?"
      if (frontmatter.links && Object.keys(frontmatter.links).length) {
        const linkPairs = Object.entries(frontmatter.links)
          .map(([label, url]) => `${label}: ${url}`)
          .join(", ");
        parts.push(`Links: ${linkPairs}`);
      }
      if (frontmatter.video) {
        parts.push(`Video: ${frontmatter.video}`);
      }
      // Portfolio deep link — always tell the AI where to find this project on the site
      parts.push(`Portfolio URL: https://dimeglio.dev/projects?projectId=${slug}`);
      break;
    }

    case "blog": {
      // Semantic anchor — makes "Pablo wrote about RAG" queries match this chunk
      parts.push(
        `Pablo Di Meglio wrote a blog post titled "${frontmatter.title || "Unknown"}".`
      );
      parts.push(`Type: Blog Post`);
      parts.push(`Slug: ${slug}`);
      parts.push(`Title: ${frontmatter.title || "Unknown"}`);
      if (frontmatter.date) parts.push(`Date: ${frontmatter.date}`);
      if (frontmatter.description) parts.push(`Description: ${frontmatter.description}`);
      if (frontmatter.tags?.length) {
        parts.push(`Tags: ${frontmatter.tags.join(", ")}`);
      }
      if (frontmatter.coverImage) parts.push(`Cover Image: ${frontmatter.coverImage}`);
      parts.push(`Portfolio URL: https://dimeglio.dev/blog/${slug}`);
      break;
    }

    case "rag": {
      const docType = getRagDocType(slug);
      parts.push(`Type: ${docType}`);
      break;
    }

    default: {
      parts.push(`Type: Unknown`);
      parts.push(`Slug: ${slug}`);
    }
  }

  return parts.join("\n");
}

/**
 * Build a rich knowledge string for a single chunk (or whole document).
 */
function buildKnowledgeString(contextHeader, sectionTitle, body) {
  const parts = [contextHeader];

  if (sectionTitle && sectionTitle !== "Introduction") {
    parts.push(`Section: ${sectionTitle}`);
  }

  parts.push(`\n${body.trim()}`);

  return parts.join("\n");
}

/**
 * Build metadata object for Pinecone (filterable fields).
 */
function buildMetadata(type, frontmatter, knowledgeString, slug, chunkInfo) {
  const meta = {
    type,
    slug,
    knowledge_string: knowledgeString,
  };

  if (frontmatter.title) meta.title = frontmatter.title;
  if (frontmatter.company) meta.company = frontmatter.company;
  if (frontmatter.category) meta.category = frontmatter.category;
  if (frontmatter.logoFile) meta.logo_file = frontmatter.logoFile;
  if (frontmatter.startDate) meta.start_date = frontmatter.startDate;
  if (frontmatter.endDate) meta.end_date = frontmatter.endDate;
  if (frontmatter.date) meta.date = frontmatter.date;
  if (frontmatter.coverImage) meta.cover_image = frontmatter.coverImage;

  if (frontmatter.techStack?.length) {
    meta.tech_stack = frontmatter.techStack.join(", ");
  }
  if (frontmatter.tags?.length) {
    meta.tags = frontmatter.tags.join(", ");
  }

  // Chunk-specific metadata
  if (chunkInfo) {
    meta.section_title = chunkInfo.sectionTitle;
    meta.chunk_index = chunkInfo.chunkIndex;
    meta.total_chunks = chunkInfo.totalChunks;
    meta.parent_slug = slug;
  }

  return meta;
}

// ---------------------------------------------------------------------------
// Embedding
// ---------------------------------------------------------------------------

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

// ---------------------------------------------------------------------------
// Main Pipeline
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n📂 Discovering content files...\n");

  // Find all content files
  const mdxFiles = await glob("content/{experience,projects,blog}/**/*.mdx");
  const ragFiles = await glob("content/rag/**/*.md");
  const allFiles = [...mdxFiles, ...ragFiles].sort();

  console.log(`   Found ${mdxFiles.length} MDX files + ${ragFiles.length} RAG docs = ${allFiles.length} total\n`);

  // Parse all files and build records (with chunking)
  const records = [];

  for (const filePath of allFiles) {
    const slug = path.basename(filePath).replace(/\.(mdx|md)$/, "");
    const type = getContentType(filePath);
    const raw = readFileSync(filePath, "utf-8");
    const { data: frontmatter, content: body } = matter(raw);

    // Skip unpublished blog posts
    if (type === "blog" && frontmatter.published === false) {
      console.log(`   ⏭️  Skipping unpublished: ${slug}`);
      continue;
    }

    const contextHeader = buildContextHeader(type, frontmatter, slug);

    if (shouldChunk(type)) {
      // Split into section-based chunks
      const chunks = splitBySections(body);

      if (chunks.length <= 1) {
        // Document has no ## sections or is very short — keep as single vector
        const knowledgeString = buildKnowledgeString(contextHeader, null, body);
        const metadata = buildMetadata(type, frontmatter, knowledgeString, slug, null);
        records.push({ id: slug, type, knowledgeString, metadata });
        console.log(`   📄 ${slug} → 1 vector (no sections to split)`);
      } else {
        // Create one vector per section
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const chunkId = `${slug}--${chunk.sectionSlug}`;
          const knowledgeString = buildKnowledgeString(contextHeader, chunk.sectionTitle, chunk.body);
          const chunkInfo = {
            sectionTitle: chunk.sectionTitle,
            chunkIndex: i,
            totalChunks: chunks.length,
          };
          const metadata = buildMetadata(type, frontmatter, knowledgeString, slug, chunkInfo);
          records.push({ id: chunkId, type, knowledgeString, metadata });
        }
        console.log(`   ✂️  ${slug} → ${chunks.length} chunks: [${chunks.map((c) => c.sectionSlug).join(", ")}]`);
      }
    } else {
      // Experience & project files — single vector, no chunking
      const knowledgeString = buildKnowledgeString(contextHeader, null, body);
      const metadata = buildMetadata(type, frontmatter, knowledgeString, slug, null);
      records.push({ id: slug, type, knowledgeString, metadata });
    }
  }

  // ---------------------------------------------------------------------------
  // Delete existing vectors (prevent orphans from old ID scheme)
  // ---------------------------------------------------------------------------

  console.log("\n🗑️  Clearing existing vectors from index...\n");

  try {
    await index.deleteAll();
    console.log("   ✅ Index cleared successfully");
  } catch (err) {
    // deleteAll might not be supported on all Pinecone tiers/configs
    // Fall back to namespace-based delete
    console.log(`   ⚠️  deleteAll failed (${err.message}), trying namespace delete...`);
    try {
      await index.namespace("").deleteAll();
      console.log("   ✅ Default namespace cleared");
    } catch (err2) {
      console.error(`   ❌ Could not clear index: ${err2.message}`);
      console.error("      You may need to manually delete old vectors from the Pinecone console.");
    }
  }

  // ---------------------------------------------------------------------------
  // Generate embeddings
  // ---------------------------------------------------------------------------

  console.log(`\n🔢 Generating embeddings for ${records.length} records...\n`);

  const vectors = [];
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const typeEmoji = {
      experience: "💼",
      project: "🚀",
      blog: "📝",
      rag: "🧩",
    }[record.type] || "📄";

    process.stdout.write(`   ${typeEmoji} [${i + 1}/${records.length}] Embedding: ${record.id}...`);

    const embedding = await generateEmbedding(record.knowledgeString);

    vectors.push({
      id: record.id,
      values: embedding,
      metadata: record.metadata,
    });

    console.log(" ✅");
  }

  // ---------------------------------------------------------------------------
  // Upsert in batches
  // ---------------------------------------------------------------------------

  console.log(`\n📌 Upserting ${vectors.length} vectors to Pinecone (batch size: ${BATCH_SIZE})...\n`);

  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    const batch = vectors.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(vectors.length / BATCH_SIZE);

    process.stdout.write(`   📦 Batch ${batchNum}/${totalBatches} (${batch.length} vectors)...`);

    await index.upsert({ records: batch });

    console.log(" ✅");
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  const chunkedCount = vectors.filter((v) => v.metadata.section_title).length;
  const wholeCount = vectors.length - chunkedCount;

  console.log("\n" + "═".repeat(60));
  console.log("🧠 Pablo's Brain — Ingestion Complete!");
  console.log("═".repeat(60));
  console.log(`\n   📊 Summary:`);
  console.log(`   ├─ Total vectors:   ${vectors.length}`);
  console.log(`   ├─ Whole-file:      ${wholeCount} (experience + projects)`);
  console.log(`   ├─ Chunked:         ${chunkedCount} (RAG docs + blog sections)`);
  console.log(`   ├─ Experience:      ${vectors.filter((v) => v.metadata.type === "experience").length}`);
  console.log(`   ├─ Projects:        ${vectors.filter((v) => v.metadata.type === "project").length}`);
  console.log(`   ├─ Blog chunks:     ${vectors.filter((v) => v.metadata.type === "blog").length}`);
  console.log(`   ├─ RAG chunks:      ${vectors.filter((v) => v.metadata.type === "rag").length}`);
  console.log(`   ├─ Model:           ${EMBEDDING_MODEL}`);
  console.log(`   ├─ Dimensions:      ${EMBEDDING_DIMS}`);
  console.log(`   └─ Index:           ${process.env.PINECONE_INDEX_NAME}`);
  console.log(`\n   🎯 Ready for retrieval!\n`);

  // ---------------------------------------------------------------------------
  // Sync blog slugs → lib/generated-blog-slugs.ts
  // ---------------------------------------------------------------------------
  // chat-slugs.ts imports this file so that VALID_BLOG_SLUGS stays in sync
  // with whatever was actually ingested. No manual slug list maintenance needed.

  // Deduplicate (chunked posts produce multiple records with the same parent slug)
  const uniqueBlogSlugs = [
    ...new Set(
      records
        .filter((r) => r.type === "blog")
        .map((r) => r.metadata.parent_slug ?? r.id)
    ),
  ].sort();

  const generated = [
    "// Auto-generated by scripts/ingest.mjs — do not edit manually.",
    "// Re-run `npm run ingest` after publishing or unpublishing a blog post.",
    "",
    `export const BLOG_SLUGS = ${JSON.stringify(uniqueBlogSlugs, null, 2)} as const;`,
    "",
  ].join("\n");

  const outPath = path.resolve("lib/generated-blog-slugs.ts");
  writeFileSync(outPath, generated, "utf-8");
  console.log(`   📝 Wrote ${uniqueBlogSlugs.length} blog slug(s) to lib/generated-blog-slugs.ts`);
}

main().catch((err) => {
  console.error("\n💥 Ingestion failed:", err.message);
  console.error(err);
  process.exit(1);
});

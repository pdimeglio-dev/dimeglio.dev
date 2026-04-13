#!/usr/bin/env node

/**
 * RAG Ingestion Pipeline — dimeglio.dev
 *
 * Reads all content (experience, projects, blog, RAG docs), constructs
 * knowledge strings, generates embeddings via text-embedding-3-small,
 * and upserts to Pinecone.
 *
 * Usage:
 *   node scripts/ingest.mjs
 *
 * Requires .env.local with:
 *   PINECONE_API_KEY, PINECONE_INDEX_NAME, OPENAI_API_KEY
 */

import { config } from "dotenv";
import { glob } from "glob";
import { readFileSync } from "fs";
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
 * Build a rich knowledge string optimized for embedding + retrieval.
 */
function buildKnowledgeString(type, frontmatter, body, slug) {
  const parts = [];

  switch (type) {
    case "experience": {
      parts.push(`Type: Experience`);
      parts.push(`Title: ${frontmatter.title || "Unknown"}`);
      parts.push(`Company: ${frontmatter.company || "Unknown"}`);
      if (frontmatter.location) parts.push(`Location: ${frontmatter.location}`);
      parts.push(`Dates: ${frontmatter.startDate || "?"} to ${frontmatter.endDate || "?"}`);
      if (frontmatter.skills?.length) {
        parts.push(`Skills: ${frontmatter.skills.join(", ")}`);
      }
      parts.push(`\nDetails:\n${body.trim()}`);
      break;
    }

    case "project": {
      parts.push(`Type: Project`);
      parts.push(`Title: ${frontmatter.title || "Unknown"}`);
      if (frontmatter.company) parts.push(`Company: ${frontmatter.company}`);
      parts.push(`Category: ${frontmatter.category || "Unknown"}`);
      if (frontmatter.description) parts.push(`Description: ${frontmatter.description}`);
      if (frontmatter.techStack?.length) {
        parts.push(`Tech Stack: ${frontmatter.techStack.join(", ")}`);
      }
      if (frontmatter.associatedExperience) {
        parts.push(`Associated Experience: ${frontmatter.associatedExperience}`);
      }
      parts.push(`\nDetails:\n${body.trim()}`);
      break;
    }

    case "blog": {
      parts.push(`Type: Blog Post`);
      parts.push(`Title: ${frontmatter.title || "Unknown"}`);
      if (frontmatter.date) parts.push(`Date: ${frontmatter.date}`);
      if (frontmatter.description) parts.push(`Description: ${frontmatter.description}`);
      if (frontmatter.tags?.length) {
        parts.push(`Tags: ${frontmatter.tags.join(", ")}`);
      }
      parts.push(`\nDetails:\n${body.trim()}`);
      break;
    }

    case "rag": {
      const docType = getRagDocType(slug);
      parts.push(`Type: ${docType}`);
      parts.push(`\n${body.trim()}`);
      break;
    }

    default: {
      parts.push(`Type: Unknown`);
      parts.push(`Slug: ${slug}`);
      parts.push(`\n${body.trim()}`);
    }
  }

  return parts.join("\n");
}

/**
 * Build metadata object for Pinecone (filterable fields).
 */
function buildMetadata(type, frontmatter, knowledgeString, slug) {
  const meta = {
    type,
    slug,
    knowledge_string: knowledgeString,
  };

  if (frontmatter.title) meta.title = frontmatter.title;
  if (frontmatter.company) meta.company = frontmatter.company;
  if (frontmatter.category) meta.category = frontmatter.category;
  if (frontmatter.startDate) meta.start_date = frontmatter.startDate;
  if (frontmatter.endDate) meta.end_date = frontmatter.endDate;
  if (frontmatter.date) meta.date = frontmatter.date;

  if (frontmatter.techStack?.length) {
    meta.tech_stack = frontmatter.techStack.join(", ");
  }
  if (frontmatter.tags?.length) {
    meta.tags = frontmatter.tags.join(", ");
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

  // Parse all files
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

    const knowledgeString = buildKnowledgeString(type, frontmatter, body, slug);
    const metadata = buildMetadata(type, frontmatter, knowledgeString, slug);

    records.push({ slug, type, knowledgeString, metadata });
  }

  console.log(`\n🔢 Generating embeddings for ${records.length} records...\n`);

  // Generate embeddings
  const vectors = [];
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const typeEmoji = {
      experience: "💼",
      project: "🚀",
      blog: "📝",
      rag: "🧩",
    }[record.type] || "📄";

    process.stdout.write(`   ${typeEmoji} [${i + 1}/${records.length}] Embedding: ${record.slug}...`);

    const embedding = await generateEmbedding(record.knowledgeString);

    vectors.push({
      id: record.slug,
      values: embedding,
      metadata: record.metadata,
    });

    console.log(" ✅");
  }

  // Upsert in batches
  console.log(`\n📌 Upserting ${vectors.length} vectors to Pinecone (batch size: ${BATCH_SIZE})...\n`);

  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    const batch = vectors.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(vectors.length / BATCH_SIZE);

    process.stdout.write(`   📦 Batch ${batchNum}/${totalBatches} (${batch.length} vectors)...`);

    await index.upsert({ records: batch });

    console.log(" ✅");
  }

  // Summary
  console.log("\n" + "═".repeat(60));
  console.log("🧠 Pablo's Brain — Ingestion Complete!");
  console.log("═".repeat(60));
  console.log(`\n   📊 Summary:`);
  console.log(`   ├─ Total records: ${vectors.length}`);
  console.log(`   ├─ Experience:    ${vectors.filter((v) => v.metadata.type === "experience").length}`);
  console.log(`   ├─ Projects:      ${vectors.filter((v) => v.metadata.type === "project").length}`);
  console.log(`   ├─ Blog posts:    ${vectors.filter((v) => v.metadata.type === "blog").length}`);
  console.log(`   ├─ RAG docs:      ${vectors.filter((v) => v.metadata.type === "rag").length}`);
  console.log(`   ├─ Model:         ${EMBEDDING_MODEL}`);
  console.log(`   ├─ Dimensions:    ${EMBEDDING_DIMS}`);
  console.log(`   └─ Index:         ${process.env.PINECONE_INDEX_NAME}`);
  console.log(`\n   🎯 Ready for retrieval!\n`);
}

main().catch((err) => {
  console.error("\n💥 Ingestion failed:", err.message);
  console.error(err);
  process.exit(1);
});

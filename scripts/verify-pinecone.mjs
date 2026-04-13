#!/usr/bin/env node

/**
 * Pinecone Verification Script — dimeglio.dev
 *
 * Checks index stats and runs test semantic queries to verify
 * the vector database was populated correctly.
 *
 * Usage:
 *   node scripts/verify-pinecone.mjs
 */

import { config } from "dotenv";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

config({ path: ".env.local" });

const EMBEDDING_MODEL = "text-embedding-3-small";

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function embed(text) {
  const res = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: text });
  return res.data[0].embedding;
}

async function main() {
  console.log("\n🔍 Verifying Pinecone index: " + process.env.PINECONE_INDEX_NAME);
  console.log("═".repeat(60));

  // 1. Index stats
  const stats = await index.describeIndexStats();
  console.log("\n📊 Index Stats:");
  console.log(`   Total vectors: ${stats.totalRecordCount}`);
  console.log(`   Dimensions:    ${stats.dimension}`);
  if (stats.namespaces) {
    for (const [ns, info] of Object.entries(stats.namespaces)) {
      console.log(`   Namespace "${ns || "(default)"}": ${info.recordCount} records`);
    }
  }

  // 2. Test queries
  const testQueries = [
    { q: "What projects did Pablo work on at Google?", expect: "Google-related results" },
    { q: "Tell me about Pablo's hobbies and interests", expect: "interests/bio RAG docs" },
    { q: "Does Pablo have experience with React and TypeScript?", expect: "skills + React projects" },
    { q: "What AI experience does Pablo have?", expect: "rPotential, Batcave, certs" },
  ];

  console.log("\n🧪 Running test queries (top 3 results each):\n");

  for (const { q, expect } of testQueries) {
    console.log(`   ❓ "${q}"`);
    console.log(`      Expected: ${expect}`);

    const embedding = await embed(q);
    const results = await index.query({
      vector: embedding,
      topK: 3,
      includeMetadata: true,
    });

    for (const match of results.matches) {
      const type = match.metadata?.type || "?";
      const title = match.metadata?.title || match.metadata?.slug || match.id;
      const section = match.metadata?.section_title ? ` § ${match.metadata.section_title}` : "";
      const score = match.score?.toFixed(4);
      console.log(`      → [${score}] ${type}: ${title}${section} (${match.id})`);
    }
    console.log();
  }

  console.log("═".repeat(60));
  console.log("✅ Verification complete!\n");
}

main().catch((err) => {
  console.error("💥 Verification failed:", err.message);
  process.exit(1);
});

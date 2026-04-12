#!/usr/bin/env node

/**
 * generate-cover-prompt.mjs
 *
 * Reads a blog post MDX file and generates an optimized image generation prompt
 * for creating a cover image using Google's Imagen (Nano Banana) or similar tools.
 *
 * Usage:
 *   node scripts/generate-cover-prompt.mjs <slug>
 *   node scripts/generate-cover-prompt.mjs building-dimeglio-dev-with-ai
 *
 * Output:
 *   A detailed image generation prompt optimized for:
 *   - 1200x630 aspect ratio (blog/OG image standard)
 *   - Dark theme matching dimeglio.dev aesthetic
 *   - Content-aware imagery based on the post's title, description, and tags
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

const slug = process.argv[2];

if (!slug) {
  console.error("\x1b[31m✗ Usage: node scripts/generate-cover-prompt.mjs <slug>\x1b[0m");
  console.error("  Example: node scripts/generate-cover-prompt.mjs building-dimeglio-dev-with-ai");
  process.exit(1);
}

const filePath = path.join(process.cwd(), "content", "blog", `${slug}.mdx`);

if (!fs.existsSync(filePath)) {
  console.error(`\x1b[31m✗ Blog post not found: ${filePath}\x1b[0m`);
  console.error("  Available posts:");
  const posts = fs.readdirSync(path.join(process.cwd(), "content", "blog"))
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(".mdx", ""));
  posts.forEach((p) => console.error(`    - ${p}`));
  process.exit(1);
}

const fileContent = fs.readFileSync(filePath, "utf-8");
const { data: frontmatter, content } = matter(fileContent);

// Extract key themes from the content
const headings = content
  .split("\n")
  .filter((line) => line.startsWith("## "))
  .map((line) => line.replace(/^##\s+/, "").trim())
  .slice(0, 5);

// Build the prompt
const tagKeywords = (frontmatter.tags || []).join(", ");
const title = frontmatter.title || slug;
const description = frontmatter.description || "";

const prompt = `A modern, cinematic blog cover image for a tech article titled "${title}".

Theme: Dark, minimal, premium — true black background (#000000) with deep slate blues and subtle purple/indigo accent glows. Think "Apple meets AI startup" aesthetic.

Content context: ${description}

Key topics: ${headings.join(", ")}
Keywords: ${tagKeywords}

Style requirements:
- Aspect ratio: 16:9 (1200x630px equivalent)
- Dark background with subtle depth and texture
- Abstract tech/AI visualization — no faces, no text, no logos
- Glowing geometric shapes, neural network patterns, or flowing data streams
- Color palette: black, dark slate (#0f172a), indigo (#6366f1), purple (#a855f7), with white accent highlights
- Modern, clean, editorial quality — suitable for a professional developer portfolio blog
- Subtle gradient overlays and light effects
- No words, no text, no watermarks

Mood: Intelligent, sophisticated, forward-thinking. Like a premium tech magazine cover.`;

console.log("\x1b[36m╭─────────────────────────────────────────╮\x1b[0m");
console.log("\x1b[36m│\x1b[0m  🎨 Cover Image Prompt for: \x1b[1m" + slug + "\x1b[0m");
console.log("\x1b[36m╰─────────────────────────────────────────╯\x1b[0m\n");
console.log(prompt);
console.log("\n\x1b[36m─────────────────────────────────────────\x1b[0m");
console.log(`\x1b[33m📁 Save the generated image to:\x1b[0m`);
console.log(`   public/blog/${slug}/cover.png`);
console.log(`\n\x1b[33m📝 Then uncomment in frontmatter:\x1b[0m`);
console.log(`   coverImage: "/blog/${slug}/cover.png"`);
console.log("\x1b[36m─────────────────────────────────────────\x1b[0m");

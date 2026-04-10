#!/usr/bin/env node

/**
 * validate-data.mjs — MDX content database integrity checker.
 *
 * Reads all files in /content/experience/ and /content/projects/,
 * parses frontmatter with gray-matter, and performs the following checks:
 *
 * 1. Project Association Check (Orphans)
 * 2. Experience Project Check (Empty Roles)
 * 3. Gap Analysis (employment timeline gaps > 2 months)
 * 4. Skill Checks (every experience must have skills[])
 *
 * Usage:  npm run validate-db
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

// ---------------------------------------------------------------------------
// Terminal colors
// ---------------------------------------------------------------------------

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

const error = (msg) => console.log(`  ${RED}✗ ERROR${RESET}  ${msg}`);
const warn = (msg) => console.log(`  ${YELLOW}⚠ WARN${RESET}   ${msg}`);
const pass = (msg) => console.log(`  ${GREEN}✓ PASS${RESET}   ${msg}`);
const header = (msg) =>
  console.log(`\n${BOLD}${CYAN}── ${msg} ──${RESET}`);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONTENT_DIR = path.resolve(process.cwd(), "content");
const EXP_DIR = path.join(CONTENT_DIR, "experience");
const PROJ_DIR = path.join(CONTENT_DIR, "projects");

function readMDXFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((filename) => {
      const slug = filename.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(dir, filename), "utf-8");
      const { data } = matter(raw);
      return { filename, slug, frontmatter: data };
    });
}

/** Parse "YYYY-MM" or "Present" into a Date. */
function parseDate(str) {
  if (!str) return null;
  const s = String(str).trim();
  if (s.toLowerCase() === "present") return new Date();
  const [year, month] = s.split("-").map(Number);
  if (!year || !month) return null;
  return new Date(year, month - 1); // month is 0-indexed
}

/** Difference in months between two dates. */
function monthsBetween(a, b) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

// ---------------------------------------------------------------------------
// Load data
// ---------------------------------------------------------------------------

const experiences = readMDXFiles(EXP_DIR);
const projects = readMDXFiles(PROJ_DIR);

const expSlugs = new Set(experiences.map((e) => e.slug));

// Separate experience types
const jobs = experiences.filter(
  (e) => !e.slug.startsWith("edu-") && !e.slug.startsWith("cert-"),
);
const professionalProjects = projects.filter(
  (p) => p.frontmatter.category === "Professional",
);

let errors = 0;
let warnings = 0;

console.log(
  `\n${BOLD}📋 MDX Data Validation${RESET}  ${DIM}(${experiences.length} experience files, ${projects.length} project files)${RESET}`,
);

// ---------------------------------------------------------------------------
// 1. Project Association Check (Orphans)
// ---------------------------------------------------------------------------

header("1. Project Association Check (Orphans)");

for (const proj of professionalProjects) {
  const assoc = proj.frontmatter.associatedExperience;

  if (!assoc || assoc.trim() === "") {
    error(
      `${proj.slug} — Professional project has no associatedExperience.`,
    );
    errors++;
  } else if (!expSlugs.has(assoc)) {
    error(
      `${proj.slug} — associatedExperience "${assoc}" does not match any file in /content/experience/.`,
    );
    errors++;
  } else {
    pass(`${proj.slug} → ${assoc}`);
  }
}

if (professionalProjects.length === 0) {
  warn("No Professional projects found.");
  warnings++;
}

// ---------------------------------------------------------------------------
// 2. Experience Project Check (Empty Roles)
// ---------------------------------------------------------------------------

header("2. Experience Project Check (Empty Roles)");

// Build a map: experience slug → list of professional projects
const projsByExp = new Map();
for (const proj of professionalProjects) {
  const assoc = proj.frontmatter.associatedExperience;
  if (assoc) {
    if (!projsByExp.has(assoc)) projsByExp.set(assoc, []);
    projsByExp.get(assoc).push(proj.slug);
  }
}

for (const job of jobs) {
  const mapped = projsByExp.get(job.slug);
  if (!mapped || mapped.length === 0) {
    warn(
      `${job.slug} (${job.frontmatter.title || "?"}) — No professional projects mapped to this role.`,
    );
    warnings++;
  } else {
    pass(
      `${job.slug} — ${mapped.length} project(s): ${mapped.join(", ")}`,
    );
  }
}

// ---------------------------------------------------------------------------
// 3. Gap Analysis
// ---------------------------------------------------------------------------

header("3. Gap Analysis (employment timeline)");

const jobsWithDates = jobs
  .map((job) => ({
    slug: job.slug,
    title: job.frontmatter.title || job.slug,
    company: job.frontmatter.company || "?",
    start: parseDate(job.frontmatter.startDate),
    end: parseDate(job.frontmatter.endDate),
    rawStart: job.frontmatter.startDate,
    rawEnd: job.frontmatter.endDate,
  }))
  .filter((j) => j.start !== null)
  .sort((a, b) => a.start - b.start);

if (jobsWithDates.length < 2) {
  warn("Not enough jobs with valid dates for gap analysis.");
  warnings++;
} else {
  let gapFound = false;
  for (let i = 0; i < jobsWithDates.length - 1; i++) {
    const current = jobsWithDates[i];
    const next = jobsWithDates[i + 1];

    if (!current.end) {
      // "Present" or no end date — skip gap check from this job
      continue;
    }

    const gap = monthsBetween(current.end, next.start);

    if (gap > 2) {
      warn(
        `Gap of ${gap} months between "${current.title}" (${current.company}, ended ${current.rawEnd}) and "${next.title}" (${next.company}, started ${next.rawStart}).`,
      );
      warnings++;
      gapFound = true;
    }
  }

  if (!gapFound) {
    pass("No gaps longer than 2 months detected in employment timeline.");
  }

  // Print timeline summary
  console.log(`\n  ${DIM}Timeline (${jobsWithDates.length} roles):${RESET}`);
  for (const j of jobsWithDates) {
    console.log(
      `  ${DIM}  ${j.rawStart} → ${j.rawEnd || "?"} : ${j.title} @ ${j.company}${RESET}`,
    );
  }
}

// ---------------------------------------------------------------------------
// 4. Skill Checks (new model: projects are the source of truth)
// ---------------------------------------------------------------------------

header("4. Skill Checks");

// 4a. Every project must have a non-empty techStack[]
const subheader = (msg) =>
  console.log(`\n  ${DIM}${msg}${RESET}`);

subheader("Projects — techStack[]");
for (const proj of projects) {
  const ts = proj.frontmatter.techStack;
  if (!ts || !Array.isArray(ts) || ts.length === 0) {
    error(`${proj.slug} — Missing or empty techStack array.`);
    errors++;
  } else {
    pass(`${proj.slug} — ${ts.length} tech(s): ${ts.join(", ")}`);
  }
}

// 4b. edu-* and cert-* must have their own skills[] (predefined)
subheader("Education & Certifications — skills[]");
const eduCerts = experiences.filter(
  (e) => e.slug.startsWith("edu-") || e.slug.startsWith("cert-"),
);
for (const entry of eduCerts) {
  const skills = entry.frontmatter.skills;
  if (!skills || !Array.isArray(skills) || skills.length === 0) {
    error(`${entry.slug} — Missing or empty skills array.`);
    errors++;
  } else {
    pass(`${entry.slug} — ${skills.length} skill(s)`);
  }
}

// 4c. exp-* jobs: verify aggregated skills from projects are non-empty
subheader("Jobs — aggregated skills from projects' techStack");
for (const job of jobs) {
  const mapped = projsByExp.get(job.slug) || [];
  const aggregated = new Set();
  for (const projSlug of mapped) {
    const proj = projects.find((p) => p.slug === projSlug);
    if (proj && proj.frontmatter.techStack) {
      proj.frontmatter.techStack.forEach((s) => aggregated.add(s));
    }
  }
  if (aggregated.size === 0) {
    warn(
      `${job.slug} (${job.frontmatter.title || "?"}) — Aggregated skills are empty (no projects or projects have no techStack).`,
    );
    warnings++;
  } else {
    pass(`${job.slug} — ${aggregated.size} aggregated skill(s): ${[...aggregated].sort().join(", ")}`);
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(
  `\n${BOLD}─── Summary ───${RESET}`,
);

if (errors === 0 && warnings === 0) {
  console.log(`\n  ${GREEN}${BOLD}✓ All checks passed!${RESET}\n`);
} else {
  if (errors > 0) {
    console.log(`  ${RED}${BOLD}${errors} error(s)${RESET}`);
  }
  if (warnings > 0) {
    console.log(`  ${YELLOW}${BOLD}${warnings} warning(s)${RESET}`);
  }
  console.log();
}

process.exit(errors > 0 ? 1 : 0);

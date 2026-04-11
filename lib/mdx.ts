import fs from "fs";
import path from "path";
import matter from "gray-matter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlogFrontmatter {
  title: string;
  description: string;
  date: string;
  tags: string[];
  published: boolean;
}

export interface ExperienceFrontmatter {
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate: string;
  order?: number;
  /** Only present on edu-* and cert-* entries. Job skills are computed from projects. */
  skills?: string[];
  /** Optional explicit list of related project slugs (overrides auto-computed). */
  relatedProjects?: string[];
}

export interface ProjectFrontmatter {
  title: string;
  description?: string;
  category: "Professional" | "Personal";
  company?: string;
  tags?: string[];
  techStack?: string[];
  associatedExperience?: string;
  image?: string;
  images?: string[];
  /** Mobile-specific screenshots (shown on phone viewports instead of `images`) */
  mobileImages?: string[];
  /** Orientation of screenshot images — affects layout (default: "landscape") */
  imageOrientation?: "portrait" | "landscape";
  /** YouTube or other embeddable video URL */
  video?: string;
  /** Keyed by label (e.g. "github", "website", "instagram", "linkedin") → URL */
  links?: Record<string, string>;
  featured?: boolean;
  order?: number;
}

export interface MDXContent<T> {
  frontmatter: T;
  content: string;
  slug: string;
}

// ---------------------------------------------------------------------------
// Content directory paths
// ---------------------------------------------------------------------------

const CONTENT_DIR = path.join(process.cwd(), "content");

export const CONTENT_PATHS = {
  blog: path.join(CONTENT_DIR, "blog"),
  experience: path.join(CONTENT_DIR, "experience"),
  projects: path.join(CONTENT_DIR, "projects"),
} as const;

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Get all MDX file slugs from a content directory.
 */
export function getSlugs(contentPath: string): string[] {
  if (!fs.existsSync(contentPath)) return [];
  return fs
    .readdirSync(contentPath)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

/**
 * Read and parse a single MDX file by slug from a content directory.
 * Returns the parsed frontmatter and raw MDX content body.
 */
export function getContentBySlug<T>(
  contentPath: string,
  slug: string,
): MDXContent<T> | null {
  const filePath = path.join(contentPath, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) return null;

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(fileContent);

  return {
    frontmatter: data as T,
    content,
    slug,
  };
}

/**
 * Get all content entries from a directory, sorted by a frontmatter field.
 */
export function getAllContent<T>(
  contentPath: string,
  sortBy?: keyof T,
  sortOrder: "asc" | "desc" = "desc",
): MDXContent<T>[] {
  const slugs = getSlugs(contentPath);

  const entries = slugs
    .map((slug) => getContentBySlug<T>(contentPath, slug))
    .filter((entry): entry is MDXContent<T> => entry !== null);

  if (sortBy) {
    entries.sort((a, b) => {
      const aVal = a.frontmatter[sortBy];
      const bVal = b.frontmatter[sortBy];

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "desc"
          ? bVal.localeCompare(aVal)
          : aVal.localeCompare(bVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
      }

      return 0;
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

export function getBlogPosts() {
  return getAllContent<BlogFrontmatter>(
    CONTENT_PATHS.blog,
    "date",
    "desc",
  ).filter((post) => post.frontmatter.published);
}

export function getBlogPost(slug: string) {
  return getContentBySlug<BlogFrontmatter>(CONTENT_PATHS.blog, slug);
}

export function getExperiences() {
  return getAllContent<ExperienceFrontmatter>(
    CONTENT_PATHS.experience,
    "order",
    "asc",
  );
}

export function getProjects() {
  const projects = getAllContent<ProjectFrontmatter>(CONTENT_PATHS.projects);
  const experiences = getAllContent<ExperienceFrontmatter>(
    CONTENT_PATHS.experience,
  );

  // Build a lookup: experience slug → startDate
  const expDateMap = new Map<string, string>();
  for (const exp of experiences) {
    expDateMap.set(exp.slug, exp.frontmatter.startDate);
  }

  // Sort: newest experience date first.
  // Personal projects (no associated experience) float to the top,
  // ordered among themselves by their `order` field.
  return projects.sort((a, b) => {
    const aExp = a.frontmatter.associatedExperience;
    const bExp = b.frontmatter.associatedExperience;
    const aDate = aExp ? expDateMap.get(aExp) ?? "" : "";
    const bDate = bExp ? expDateMap.get(bExp) ?? "" : "";
    const aIsPersonal = !aExp;
    const bIsPersonal = !bExp;

    // Personal projects always first
    if (aIsPersonal && !bIsPersonal) return -1;
    if (!aIsPersonal && bIsPersonal) return 1;

    // Both personal → sort by order asc
    if (aIsPersonal && bIsPersonal) {
      return (a.frontmatter.order ?? 99) - (b.frontmatter.order ?? 99);
    }

    // Both professional → sort by experience date desc (newest first),
    // then by order asc within the same experience
    if (aDate !== bDate) return bDate.localeCompare(aDate);
    return (a.frontmatter.order ?? 99) - (b.frontmatter.order ?? 99);
  });
}

export function getProject(slug: string) {
  return getContentBySlug<ProjectFrontmatter>(CONTENT_PATHS.projects, slug);
}

/**
 * Get aggregated skills for an experience entry by collecting
 * techStack from all Professional projects associated with it.
 * Returns a deduplicated, sorted array of skill strings.
 */
export function getSkillsForExperience(expSlug: string): string[] {
  const projects = getProjects();
  const associatedProjects = projects.filter(
    (p) => p.frontmatter.associatedExperience === expSlug,
  );
  const allSkills = associatedProjects.flatMap(
    (p) => p.frontmatter.techStack || [],
  );
  return [...new Set(allSkills)].sort();
}

/**
 * Get project slugs, titles, and descriptions associated with an experience entry.
 * Uses the reverse relationship from projects' `associatedExperience` field.
 * Description falls back to the MDX body content (trimmed).
 */
export function getProjectsForExperience(
  expSlug: string,
): { slug: string; title: string; description: string }[] {
  const projects = getProjects();
  return projects
    .filter((p) => p.frontmatter.associatedExperience === expSlug)
    .map((p) => ({
      slug: p.slug,
      title: p.frontmatter.title,
      description: p.frontmatter.description || p.content.trim(),
    }));
}

/**
 * Get all unique skills across every project's techStack.
 * Returns an alphabetically sorted array of `{ name }` objects
 * (formatted for Aceternity's InfiniteMovingCards).
 */
export function getAllUniqueSkills(): { name: string }[] {
  const projects = getProjects();
  const allSkills = projects.flatMap(
    (p) => p.frontmatter.techStack || [],
  );
  return [...new Set(allSkills)]
    .sort((a, b) => a.localeCompare(b))
    .map((skill) => ({ name: skill }));
}

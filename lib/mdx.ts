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
  location: string;
  startDate: string;
  endDate: string;
  order: number;
}

export interface ProjectFrontmatter {
  title: string;
  description: string;
  category: "Professional" | "Personal";
  tags: string[];
  image?: string;
  github?: string;
  live?: string;
  featured: boolean;
  order: number;
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
  return getAllContent<ProjectFrontmatter>(
    CONTENT_PATHS.projects,
    "order",
    "asc",
  );
}

export function getProject(slug: string) {
  return getContentBySlug<ProjectFrontmatter>(CONTENT_PATHS.projects, slug);
}

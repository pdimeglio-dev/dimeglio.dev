import { describe, it, expect } from "vitest";
import {
  getSlugs,
  getContentBySlug,
  getAllContent,
  getBlogPosts,
  getBlogPost,
  getExperiences,
  getProjects,
  getProject,
  CONTENT_PATHS,
  type BlogFrontmatter,
  type ExperienceFrontmatter,
  type ProjectFrontmatter,
} from "./mdx";

// ---------------------------------------------------------------------------
// getSlugs
// ---------------------------------------------------------------------------

describe("getSlugs", () => {
  it("returns blog post slugs", () => {
    const slugs = getSlugs(CONTENT_PATHS.blog);
    expect(slugs).toContain("hello-world");
    expect(slugs).toContain("ai-architecture-patterns");
  });

  it("returns experience slugs", () => {
    const slugs = getSlugs(CONTENT_PATHS.experience);
    expect(slugs).toContain("staff-engineer");
    expect(slugs).toContain("senior-engineer");
  });

  it("returns project slugs", () => {
    const slugs = getSlugs(CONTENT_PATHS.projects);
    expect(slugs).toContain("ai-agent-platform");
    expect(slugs).toContain("developer-portfolio");
    expect(slugs).toContain("open-source-cli");
  });

  it("returns empty array for non-existent path", () => {
    const slugs = getSlugs("/non/existent/path");
    expect(slugs).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getContentBySlug
// ---------------------------------------------------------------------------

describe("getContentBySlug", () => {
  it("returns parsed blog post with frontmatter", () => {
    const post = getContentBySlug<BlogFrontmatter>(
      CONTENT_PATHS.blog,
      "hello-world",
    );

    expect(post).not.toBeNull();
    expect(post!.slug).toBe("hello-world");
    expect(post!.frontmatter.title).toBe(
      "Hello World: Building My Portfolio with Next.js 16",
    );
    expect(post!.frontmatter.published).toBe(true);
    expect(post!.frontmatter.tags).toContain("nextjs");
    expect(post!.content).toContain("# Hello World");
  });

  it("returns null for non-existent slug", () => {
    const post = getContentBySlug<BlogFrontmatter>(
      CONTENT_PATHS.blog,
      "does-not-exist",
    );
    expect(post).toBeNull();
  });

  it("parses project frontmatter correctly", () => {
    const project = getContentBySlug<ProjectFrontmatter>(
      CONTENT_PATHS.projects,
      "ai-agent-platform",
    );

    expect(project).not.toBeNull();
    expect(project!.frontmatter.category).toBe("Professional");
    expect(project!.frontmatter.featured).toBe(true);
    expect(project!.frontmatter.tags).toContain("ai");
  });
});

// ---------------------------------------------------------------------------
// getAllContent
// ---------------------------------------------------------------------------

describe("getAllContent", () => {
  it("returns all blog posts sorted by date (desc)", () => {
    const posts = getAllContent<BlogFrontmatter>(
      CONTENT_PATHS.blog,
      "date",
      "desc",
    );

    expect(posts.length).toBeGreaterThanOrEqual(2);
    // Most recent first
    expect(posts[0].frontmatter.date >= posts[1].frontmatter.date).toBe(true);
  });

  it("returns experiences sorted by order (asc)", () => {
    const experiences = getAllContent<ExperienceFrontmatter>(
      CONTENT_PATHS.experience,
      "order",
      "asc",
    );

    expect(experiences.length).toBeGreaterThanOrEqual(2);
    expect(experiences[0].frontmatter.order).toBeLessThanOrEqual(
      experiences[1].frontmatter.order,
    );
  });
});

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

describe("getBlogPosts", () => {
  it("returns only published posts", () => {
    const posts = getBlogPosts();
    posts.forEach((post) => {
      expect(post.frontmatter.published).toBe(true);
    });
  });

  it("returns posts sorted by date descending", () => {
    const posts = getBlogPosts();
    for (let i = 0; i < posts.length - 1; i++) {
      expect(posts[i].frontmatter.date >= posts[i + 1].frontmatter.date).toBe(
        true,
      );
    }
  });
});

describe("getBlogPost", () => {
  it("returns a specific post by slug", () => {
    const post = getBlogPost("hello-world");
    expect(post).not.toBeNull();
    expect(post!.frontmatter.title).toContain("Hello World");
  });
});

describe("getExperiences", () => {
  it("returns experiences sorted by order ascending", () => {
    const experiences = getExperiences();
    expect(experiences.length).toBeGreaterThanOrEqual(2);
    expect(experiences[0].frontmatter.order).toBe(1);
  });
});

describe("getProjects", () => {
  it("returns all projects", () => {
    const projects = getProjects();
    expect(projects.length).toBeGreaterThanOrEqual(3);
  });

  it("includes both Professional and Personal projects", () => {
    const projects = getProjects();
    const categories = new Set(projects.map((p) => p.frontmatter.category));
    expect(categories.has("Professional")).toBe(true);
    expect(categories.has("Personal")).toBe(true);
  });
});

describe("getProject", () => {
  it("returns a specific project by slug", () => {
    const project = getProject("ai-agent-platform");
    expect(project).not.toBeNull();
    expect(project!.frontmatter.title).toBe("AI Agent Platform");
  });
});

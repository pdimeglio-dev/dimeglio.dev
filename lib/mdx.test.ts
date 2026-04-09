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
  getSkillsForExperience,
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
    expect(slugs).toContain("exp-rpotential");
    expect(slugs).toContain("exp-disney-parks");
    expect(slugs).toContain("edu-info-systems");
    expect(slugs).toContain("cert-gcp");
  });

  it("returns project slugs", () => {
    const slugs = getSlugs(CONTENT_PATHS.projects);
    expect(slugs).toContain("proj-genui-engine");
    expect(slugs).toContain("proj-google-shopping");
    expect(slugs).toContain("proj-paddle-games");
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
      "proj-genui-engine",
    );

    expect(project).not.toBeNull();
    expect(project!.frontmatter.category).toBe("Professional");
    expect(project!.frontmatter.associatedExperience).toBe("exp-rpotential");
    expect(project!.frontmatter.techStack).toContain("React 19");
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

  it("returns experiences including all types", () => {
    const experiences = getAllContent<ExperienceFrontmatter>(
      CONTENT_PATHS.experience,
    );

    expect(experiences.length).toBeGreaterThanOrEqual(10);
    const slugs = experiences.map((e) => e.slug);
    // Should include jobs, education, and certs
    expect(slugs.some((s) => s.startsWith("exp-"))).toBe(true);
    expect(slugs.some((s) => s.startsWith("edu-"))).toBe(true);
    expect(slugs.some((s) => s.startsWith("cert-"))).toBe(true);
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
  it("returns all experience entries", () => {
    const experiences = getExperiences();
    expect(experiences.length).toBeGreaterThanOrEqual(10);
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
    const project = getProject("proj-genui-engine");
    expect(project).not.toBeNull();
    expect(project!.frontmatter.title).toBe("GenUI Engine & SDUI React Library");
  });
});

// ---------------------------------------------------------------------------
// getSkillsForExperience (aggregation from projects)
// ---------------------------------------------------------------------------

describe("getSkillsForExperience", () => {
  it("returns aggregated techStack from associated projects", () => {
    const skills = getSkillsForExperience("exp-rpotential");
    expect(skills.length).toBeGreaterThan(0);
    expect(skills).toContain("React 19");
  });

  it("returns deduplicated and sorted skills", () => {
    const skills = getSkillsForExperience("exp-rpotential");
    // Check sorted
    const sorted = [...skills].sort();
    expect(skills).toEqual(sorted);
    // Check no duplicates
    expect(new Set(skills).size).toBe(skills.length);
  });

  it("returns empty array for experience with no associated projects", () => {
    const skills = getSkillsForExperience("non-existent-slug");
    expect(skills).toEqual([]);
  });
});

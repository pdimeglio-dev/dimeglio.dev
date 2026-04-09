"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ProjectCard } from "@/components/project-card";
import { MDXContent } from "@/components/mdx-content";
import type { MDXContent as MDXContentType, ProjectFrontmatter } from "@/lib/mdx";

type Category = "All" | "Professional" | "Personal";

const categories: Category[] = ["All", "Professional", "Personal"];

interface ProjectsGridProps {
  projects: MDXContentType<ProjectFrontmatter>[];
}

/**
 * Client-side projects grid with:
 * - Pill-shaped category toggle with Framer Motion layout animations
 * - Filtered grid of project cards
 * - Slide-out Sheet for project detail (parsed MDX)
 * - URL state sync via searchParams (?show=project-slug&category=...)
 */
export function ProjectsGrid({ projects }: ProjectsGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeCategory = (searchParams.get("category") as Category) || "All";
  const showSlug = searchParams.get("show");

  // Find the currently shown project
  const activeProject = useMemo(
    () => projects.find((p) => p.slug === showSlug) ?? null,
    [projects, showSlug],
  );

  // Filter projects by category
  const filteredProjects = useMemo(
    () =>
      activeCategory === "All"
        ? projects
        : projects.filter((p) => p.frontmatter.category === activeCategory),
    [projects, activeCategory],
  );

  // Update URL search params without full navigation
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      const queryString = params.toString();
      router.push(queryString ? `/projects?${queryString}` : "/projects", {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  const handleCategoryChange = (category: Category) => {
    updateParams({
      category: category === "All" ? null : category,
      show: null, // close sheet when changing category
    });
  };

  const handleProjectClick = (slug: string) => {
    updateParams({ show: slug });
  };

  const handleSheetClose = () => {
    updateParams({ show: null });
  };

  return (
    <>
      {/* Category filter toggle */}
      <div className="mb-8 flex items-center justify-center gap-1 rounded-full border border-slate-800 bg-card p-1">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            className="relative rounded-full px-4 py-2 text-sm transition-colors"
          >
            {activeCategory === category && (
              <motion.div
                layoutId="category-pill"
                className="absolute inset-0 rounded-full bg-white"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span
              className={`relative z-10 ${
                activeCategory === category
                  ? "text-black font-medium"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              {category}
            </span>
          </button>
        ))}
      </div>

      {/* Projects grid */}
      <motion.div layout className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.slug}
              slug={project.slug}
              frontmatter={project.frontmatter}
              onClick={() => handleProjectClick(project.slug)}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {filteredProjects.length === 0 && (
        <p className="mt-8 text-center text-muted-foreground">
          No projects in this category yet.
        </p>
      )}

      {/* Project detail Sheet */}
      <Sheet open={!!activeProject} onOpenChange={(open) => !open && handleSheetClose()}>
        <SheetContent className="overflow-y-auto border-slate-800 bg-black sm:max-w-xl">
          {activeProject && (
            <>
              <SheetHeader>
                <SheetTitle className="text-2xl font-bold tracking-tight">
                  {activeProject.frontmatter.title}
                </SheetTitle>
                <SheetDescription>
                  {activeProject.frontmatter.description}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 flex flex-wrap gap-2">
                {activeProject.frontmatter.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-800 px-3 py-1 text-xs text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-6">
                <MDXContent source={activeProject.content} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, ExternalLink, GitFork, Camera, Globe } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { ReactNode } from "react";
import { ProjectCard } from "@/components/project-card";
import type { MDXContent as MDXContentType, ProjectFrontmatter } from "@/lib/mdx";

type Category = "All" | "Professional" | "Personal";

const categories: Category[] = ["All", "Professional", "Personal"];

/** Map of known link labels → Lucide icons */
const linkIcons: Record<string, typeof GitFork> = {
  github: GitFork,
  instagram: Camera,
  website: Globe,
};

interface ProjectsGridProps {
  projects: MDXContentType<ProjectFrontmatter>[];
  /** Pre-rendered MDX content keyed by slug (rendered on the server) */
  renderedContent: Record<string, ReactNode>;
}

/**
 * Client-side projects grid with:
 * - Pill-shaped category toggle with Framer Motion layout animations
 * - Filtered grid of project cards
 * - Slide-out Sheet for project detail (parsed MDX)
 * - URL state sync via searchParams (?projectId=project-slug&category=...)
 */
export function ProjectsGrid({ projects, renderedContent }: ProjectsGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeCategory = (searchParams.get("category") as Category) || "All";
  const showSlug = searchParams.get("projectId");

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
      projectId: null, // close sheet when changing category
    });
  };

  const handleProjectClick = (slug: string) => {
    updateParams({ projectId: slug });
  };

  const handleSheetClose = () => {
    router.back();
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
        <SheetContent className="w-full overflow-y-auto border-slate-800 bg-black data-[side=right]:w-full data-[side=right]:sm:max-w-full">
          {activeProject && (
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-8 md:p-12">
              <SheetHeader className="p-0">
                {/* Company eyebrow */}
                {activeProject.frontmatter.company && (
                  <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80 mb-2">
                    {activeProject.frontmatter.company}
                  </span>
                )}
                <SheetTitle className="text-2xl font-bold tracking-tight md:text-3xl">
                  {activeProject.frontmatter.title}
                </SheetTitle>
                <SheetDescription className="text-base text-zinc-300 leading-relaxed">
                  {activeProject.frontmatter.description}
                </SheetDescription>
              </SheetHeader>

              {/* Tech stack tags */}
              <div className="flex flex-wrap gap-2">
                {(activeProject.frontmatter.techStack || activeProject.frontmatter.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs font-medium text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Links */}
              {activeProject.frontmatter.links && Object.keys(activeProject.frontmatter.links).length > 0 && (
                <div className="flex flex-col divide-y divide-slate-800/50">
                  {Object.entries(activeProject.frontmatter.links).map(([label, url]) => {
                    const Icon = linkIcons[label] ?? ExternalLink;
                    const displayUrl = url
                      .replace(/^https?:\/\//, "")
                      .replace(/^www\./, "")
                      .replace(/\/$/, "");
                    return (
                      <a
                        key={label}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/link relative flex items-center gap-4 py-3 transition-all hover:bg-gradient-to-r hover:from-purple-500/10 hover:via-blue-500/5 hover:to-transparent hover:pl-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="absolute left-0 top-0 h-full w-0.5 scale-y-0 bg-gradient-to-b from-purple-500 to-blue-500 transition-transform duration-200 group-hover/link:scale-y-100" />
                        <Icon className="h-4 w-4 shrink-0 text-zinc-500 transition-colors group-hover/link:text-blue-400" />
                        <span className="text-sm font-medium capitalize text-zinc-400 transition-colors group-hover/link:text-white">
                          {label}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-zinc-600 transition-colors group-hover/link:text-zinc-400">
                          {displayUrl}
                        </span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-700 transition-all duration-200 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 group-hover/link:text-blue-400" />
                      </a>
                    );
                  })}
                </div>
              )}

              {/* Images gallery */}
              {activeProject.frontmatter.images && activeProject.frontmatter.images.length > 0 && (
                <div className="flex flex-col gap-6">
                  {activeProject.frontmatter.images.map((imageName) => (
                    <div key={imageName} className="overflow-hidden rounded-xl border border-slate-800">
                      <Image
                        src={`/projects/${activeProject.slug}/${imageName}`}
                        alt={`${activeProject.frontmatter.title} — ${imageName}`}
                        width={1200}
                        height={675}
                        className="h-auto w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* MDX content */}
              <div className="prose prose-invert prose-zinc max-w-none">
                {renderedContent[activeProject.slug]}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

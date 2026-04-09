"use client";

import { motion } from "framer-motion";
import { ExternalLink, GitFork } from "lucide-react";
import type { ProjectFrontmatter } from "@/lib/mdx";

interface ProjectCardProps {
  slug: string;
  frontmatter: ProjectFrontmatter;
  onClick: () => void;
}

/**
 * Project card — displays project title, description, tags, and category.
 * Clickable to open the project detail Sheet.
 * Uses Framer Motion layout animations for smooth filter transitions.
 */
export function ProjectCard({ slug, frontmatter, onClick }: ProjectCardProps) {
  return (
    <motion.div
      layout
      layoutId={slug}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="group cursor-pointer rounded-2xl border border-slate-800 bg-card p-6 transition-colors hover:border-slate-700"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Category pill */}
      <span className="inline-block rounded-full border border-slate-800 px-3 py-1 text-xs text-muted-foreground">
        {frontmatter.category}
      </span>

      <h3 className="mt-4 text-lg font-semibold tracking-tight transition-colors group-hover:text-white">
        {frontmatter.title}
      </h3>

      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
        {frontmatter.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {frontmatter.tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Links */}
      <div className="mt-4 flex items-center gap-3">
        {frontmatter.github && (
          <GitFork className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-white" />
        )}
        {frontmatter.live && (
          <ExternalLink className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-white" />
        )}
      </div>
    </motion.div>
  );
}

"use client";

import { motion } from "framer-motion";
import { ExternalLink, GitFork, Camera, Globe } from "lucide-react";
import type { ProjectFrontmatter } from "@/lib/mdx";

interface ProjectCardProps {
  slug: string;
  frontmatter: ProjectFrontmatter;
  onClick: () => void;
}

/** Map of known link labels → Lucide icons */
const linkIcons: Record<string, typeof GitFork> = {
  github: GitFork,
  instagram: Camera,
  website: Globe,
};

/**
 * Project card — displays project title, company, description, tags, and links.
 * Clickable to open the project detail Sheet.
 * Uses Framer Motion layout animations for smooth filter transitions.
 */
export function ProjectCard({ slug, frontmatter, onClick }: ProjectCardProps) {
  const links = frontmatter.links ?? {};
  const linkEntries = Object.entries(links);

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

      {/* Company eyebrow */}
      {frontmatter.company && (
        <span className="mt-3 block text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80 mb-1">
          {frontmatter.company}
        </span>
      )}

      <h3 className={`${frontmatter.company ? '' : 'mt-2'} text-lg font-semibold tracking-tight transition-colors group-hover:text-white`}>
        {frontmatter.title}
      </h3>

      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
        {frontmatter.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(frontmatter.techStack || frontmatter.tags || []).slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Links */}
      {linkEntries.length > 0 && (
        <div className="mt-4 flex items-center gap-3">
          {linkEntries.map(([label]) => {
            const Icon = linkIcons[label] ?? ExternalLink;
            return (
              <Icon
                key={label}
                className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-white"
              />
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
} from "framer-motion";
import { ArrowUpRight, GitFork, Globe, Smartphone } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export interface FeaturedBuild {
  slug: string;
  title: string;
  status: string;
  pitch: string;
  stats: string[];
  links: { appStore?: string; website?: string; github?: string };
}

type Target = "details" | "website" | "app_store" | "github";

/**
 * One "What I'm building" card: status pill, pitch, stats and links.
 * A soft spotlight follows the cursor across the card.
 *
 * Analytics: fires `featured_build_clicked` with the slug and which target
 * (details page, website, App Store, GitHub) was clicked.
 */
export function FeaturedBuildCard({ build, index }: { build: FeaturedBuild; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(-400);
  const mouseY = useMotionValue(-400);
  const spotlight = useMotionTemplate`radial-gradient(420px circle at ${mouseX}px ${mouseY}px, rgba(139, 92, 246, 0.14), transparent 70%)`;

  const detailsHref = `/projects?projectId=${build.slug}`;
  const track = (target: Target, url: string) =>
    trackEvent({ event: "featured_build_clicked", properties: { slug: build.slug, target, url } });

  const externalLinks = [
    { target: "app_store" as const, url: build.links.appStore, label: "App Store", icon: Smartphone },
    { target: "website" as const, url: build.links.website, label: "Website", icon: Globe },
    { target: "github" as const, url: build.links.github, label: "GitHub", icon: GitFork },
  ].filter((l): l is typeof l & { url: string } => Boolean(l.url));

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay: index * 0.12, ease: "easeOut" }}
      onMouseMove={(e) => {
        const rect = cardRef.current?.getBoundingClientRect();
        if (!rect) return;
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
      }}
      onMouseLeave={() => {
        mouseX.set(-400);
        mouseY.set(-400);
      }}
      className="group relative flex overflow-hidden rounded-2xl border border-slate-800 bg-card transition-colors hover:border-slate-700"
    >
      {/* Cursor spotlight */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: spotlight }}
      />

      {/* Whole-card link to the project details; content above passes clicks through */}
      <Link
        href={detailsHref}
        aria-label={`${build.title} details`}
        onClick={() => track("details", detailsHref)}
        className="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
      />

      <div className="pointer-events-none relative flex min-w-0 flex-1 flex-col p-6 sm:p-8">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          {build.status}
        </span>

        <h3 className="mt-4 text-2xl font-semibold tracking-tight">{build.title}</h3>

        <p className="mt-3 text-base leading-relaxed text-zinc-300">{build.pitch}</p>

        <ul className="mt-5 flex flex-wrap gap-2">
          {build.stats.map((stat) => (
            <li
              key={stat}
              className="rounded-full border border-slate-700 bg-slate-800/50 px-2.5 py-0.5 text-xs font-medium text-neutral-300"
            >
              {stat}
            </li>
          ))}
        </ul>

        <div className="pointer-events-auto mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-6">
          {externalLinks.map(({ target, url, label, icon: Icon }) => (
            <a
              key={target}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track(target, url)}
              className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
            >
              <Icon className="h-4 w-4" />
              {label}
            </a>
          ))}
          <Link
            href={detailsHref}
            onClick={() => track("details", detailsHref)}
            className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-zinc-300 transition-colors hover:text-white"
          >
            Details
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

    </motion.div>
  );
}

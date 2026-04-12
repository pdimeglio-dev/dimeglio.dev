import { Suspense } from "react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getProjects } from "@/lib/mdx";
import { MDXContent } from "@/components/mdx-content";
import { ProjectsGrid } from "@/components/projects-grid";

export const metadata: Metadata = {
  title: "Projects",
  description: "Professional and personal projects by Pablo Di Meglio.",
  alternates: {
    canonical: "https://dimeglio.dev/projects",
  },
};

/**
 * Projects page — displays a filterable grid of project cards.
 *
 * MDX content is pre-rendered here (Server Component) and passed as
 * ReactNode props to the client-side ProjectsGrid. This avoids the
 * "async Client Component" error from using MDXRemote in a client context.
 *
 * The RSC protocol supports passing ReactNode as props to client components.
 */
export default function ProjectsPage() {
  const projects = getProjects();

  // Pre-render MDX content on the server for each project
  const renderedContent: Record<string, ReactNode> = {};
  for (const project of projects) {
    renderedContent[project.slug] = (
      <MDXContent source={project.content} />
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-24">
      <h1 className="text-4xl font-bold tracking-tighter">Projects</h1>
      <p className="mt-4 text-muted-foreground">
        Things I&apos;ve built — professionally and for fun.
      </p>

      <div className="mt-12">
        <Suspense fallback={<ProjectsGridSkeleton />}>
          <ProjectsGrid
            projects={projects}
            renderedContent={renderedContent}
          />
        </Suspense>
      </div>
    </main>
  );
}

function ProjectsGridSkeleton() {
  return (
    <div className="flex flex-col items-center gap-12">
      {/* Fake pill filter */}
      <div className="flex items-center justify-center gap-1 rounded-full border border-slate-800 bg-card p-1">
        {["All", "Professional", "Personal"].map((label) => (
          <div
            key={label}
            className="rounded-full px-4 py-2 text-sm text-muted-foreground/30"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Shimmer grid */}
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="relative h-52 overflow-hidden rounded-2xl border border-slate-800 bg-card"
          >
            {/* Gradient shimmer sweep */}
            <div
              className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent"
              style={{ animationDelay: `${i * 150}ms` }}
            />
            {/* Skeleton content */}
            <div className="flex h-full flex-col justify-end p-6">
              <div className="mb-3 h-3 w-16 rounded-full bg-slate-800/60" />
              <div className="mb-2 h-5 w-3/4 rounded-full bg-slate-800/60" />
              <div className="h-3 w-full rounded-full bg-slate-800/40" />
              <div className="mt-1 h-3 w-2/3 rounded-full bg-slate-800/40" />
              <div className="mt-4 flex gap-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-5 w-14 rounded-full bg-slate-800/40" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

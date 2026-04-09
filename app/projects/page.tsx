import { Suspense } from "react";
import type { Metadata } from "next";
import { getProjects } from "@/lib/mdx";
import { ProjectsGrid } from "@/components/projects-grid";

export const metadata: Metadata = {
  title: "Projects",
  description: "Professional and personal projects by Pablo Di Meglio.",
};

/**
 * Projects page — displays a filterable grid of project cards.
 * Data is fetched server-side and passed to the client-side ProjectsGrid
 * which handles filtering, Sheet detail, and URL state sync.
 *
 * Wrapped in Suspense because ProjectsGrid uses useSearchParams
 * (required for dynamic rendering with client-side search params).
 */
export default function ProjectsPage() {
  const projects = getProjects();

  return (
    <main className="mx-auto max-w-6xl px-6 py-24">
      <h1 className="text-4xl font-bold tracking-tighter">Projects</h1>
      <p className="mt-4 text-muted-foreground">
        Things I&apos;ve built — professionally and for fun.
      </p>

      <div className="mt-12">
        <Suspense fallback={<ProjectsGridSkeleton />}>
          <ProjectsGrid projects={projects} />
        </Suspense>
      </div>
    </main>
  );
}

function ProjectsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-48 animate-pulse rounded-2xl border border-slate-800 bg-card"
        />
      ))}
    </div>
  );
}

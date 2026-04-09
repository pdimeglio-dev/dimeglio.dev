import { Suspense } from "react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getProjects } from "@/lib/mdx";
import { MDXContent } from "@/components/mdx-content";
import { ProjectsGrid } from "@/components/projects-grid";

export const metadata: Metadata = {
  title: "Projects",
  description: "Professional and personal projects by Pablo Di Meglio.",
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

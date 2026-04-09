import type { Metadata } from "next";
import { getExperiences } from "@/lib/mdx";

export const metadata: Metadata = {
  title: "Experience",
  description: "Professional experience and career history of Pablo Di Meglio.",
};

/**
 * Experience page — reads from /content/experience/ and displays a timeline.
 * TODO: Replace with Aceternity Timeline component for richer UI.
 */
export default function ExperiencePage() {
  const experiences = getExperiences();

  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-4xl font-bold tracking-tighter">Experience</h1>
      <p className="mt-4 text-muted-foreground">
        Where I&apos;ve been and what I&apos;ve built.
      </p>

      <div className="mt-12 space-y-12">
        {experiences.map((exp) => (
          <article
            key={exp.slug}
            className="relative border-l border-slate-800 pl-8"
          >
            {/* Timeline dot */}
            <div className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-slate-800 bg-black" />

            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold tracking-tight">
                {exp.frontmatter.title}
              </h2>
              <span className="text-sm text-muted-foreground">
                {exp.frontmatter.startDate} — {exp.frontmatter.endDate}
              </span>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              {exp.frontmatter.company} · {exp.frontmatter.location}
            </p>

            <div className="mt-4 text-sm text-muted-foreground/80 leading-relaxed whitespace-pre-line">
              {exp.content.trim()}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { ChevronRight, FolderOpen } from "lucide-react";
import { Timeline } from "@/components/ui/timeline";

interface RelatedProject {
  slug: string;
  title: string;
  description: string;
}

interface JobData {
  slug: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  content: string;
  skills: string[];
  relatedProjects: RelatedProject[];
}

function formatYear(raw: string): string {
  if (!raw || raw.toLowerCase() === "present") return "Present";
  return raw.split("-")[0]; // Just the year
}

function formatDateRange(start: string, end: string): string {
  const startYear = formatYear(start);
  const endYear = formatYear(end);
  if (startYear === endYear) return startYear;
  return `${startYear} — ${endYear}`;
}

export function ExperienceTimeline({ jobs }: { jobs: JobData[] }) {
  const data = jobs.map((job) => ({
    id: job.slug,
    title: formatDateRange(job.startDate, job.endDate),
    content: (
      <div>
        <p className="text-lg font-bold text-white md:text-2xl">
          {job.company}
        </p>
        <p className="mt-1 text-base font-medium text-zinc-300 md:text-lg">
          {job.title}
        </p>

        <p className="mt-4 text-base leading-relaxed text-zinc-400 whitespace-pre-line">
          {job.content}
        </p>

        {job.skills.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {job.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs font-medium text-neutral-300"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {job.relatedProjects.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
              <FolderOpen className="h-3.5 w-3.5" />
              <span>Related Projects</span>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {job.relatedProjects.map((project) => (
                <Link
                  key={project.slug}
                  href={`/projects?projectId=${project.slug}`}
                  className="group/card flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-all hover:border-slate-600 hover:bg-slate-800/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-200 transition-colors group-hover/card:text-white">
                      {project.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500 line-clamp-2">
                      {project.description}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600 transition-colors group-hover/card:text-zinc-400" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    ),
  }));

  return <Timeline data={data} />;
}

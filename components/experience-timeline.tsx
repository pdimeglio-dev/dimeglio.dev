"use client";

import { Timeline } from "@/components/ui/timeline";

interface JobData {
  slug: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  content: string;
  skills: string[];
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
      </div>
    ),
  }));

  return <Timeline data={data} />;
}

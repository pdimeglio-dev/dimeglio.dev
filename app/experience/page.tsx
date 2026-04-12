import type { Metadata } from "next";
import { GraduationCap, Award } from "lucide-react";
import { getExperiences, getSkillsForExperience, getProjectsForExperience } from "@/lib/mdx";
import { ExperienceTimeline } from "@/components/experience-timeline";
import { JsonLd, profilePageSchema } from "@/components/json-ld";

export const metadata: Metadata = {
  title: "Experience",
  description:
    "Professional experience and career history of Pablo Di Meglio.",
  alternates: {
    canonical: "https://dimeglio.dev/experience",
  },
};

/**
 * Experience page — split into three sections:
 * 1. Jobs timeline (exp-*) — Aceternity animated scroll timeline
 * 2. Education & Certifications grid (edu-*, cert-*) — cards below
 *
 * Skills for jobs are aggregated from associated projects' techStack.
 * Education and certification skills come directly from frontmatter.
 */
export default function ExperiencePage() {
  const experiences = getExperiences();

  // Split by slug prefix
  const jobs = experiences
    .filter((e) => e.slug.startsWith("exp-"))
    .sort((a, b) => {
      // Sort by startDate descending (newest first)
      const aDate = a.frontmatter.startDate || "";
      const bDate = b.frontmatter.startDate || "";
      return bDate.localeCompare(aDate);
    });

  const education = experiences.filter((e) => e.slug.startsWith("edu-"));
  const certifications = experiences.filter((e) => e.slug.startsWith("cert-"));

  // Serialize jobs for the client timeline component
  const jobsData = jobs.map((job) => ({
    slug: job.slug,
    title: job.frontmatter.title,
    company: job.frontmatter.company,
    startDate: job.frontmatter.startDate,
    endDate: job.frontmatter.endDate,
    content: job.content.trim(),
    skills: getSkillsForExperience(job.slug),
    relatedProjects: getProjectsForExperience(job.slug),
  }));

  return (
    <main className="mx-auto max-w-5xl px-6 py-24">
      <JsonLd data={profilePageSchema()} />
      <h1 className="text-4xl font-bold tracking-tighter md:text-5xl">
        Experience
      </h1>
      <p className="mt-4 text-lg text-zinc-300 leading-relaxed">
        Where I&apos;ve been and what I&apos;ve built.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Jobs Timeline — Aceternity animated scroll                         */}
      {/* ----------------------------------------------------------------- */}
      <section className="mt-12">
        <ExperienceTimeline jobs={jobsData} />
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Education                                                          */}
      {/* ----------------------------------------------------------------- */}
      {education.length > 0 && (
        <section className="mt-24">
          <h2 className="text-2xl font-bold tracking-tighter">Education</h2>
          <p className="mt-2 text-base text-zinc-300 leading-relaxed">
            University degrees and formal education.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {education.map((edu) => (
              <CredentialCard
                key={edu.slug}
                icon="education"
                title={edu.frontmatter.title}
                institution={edu.frontmatter.company}
                dates={formatDateRange(
                  edu.frontmatter.startDate,
                  edu.frontmatter.endDate,
                )}
                skills={edu.frontmatter.skills || []}
                description={edu.content.trim()}
              />
            ))}
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Certifications                                                     */}
      {/* ----------------------------------------------------------------- */}
      {certifications.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tighter">
            Certifications
          </h2>
          <p className="mt-2 text-base text-zinc-300 leading-relaxed">
            Professional credentials and specialized training.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {certifications.map((cert) => (
              <CredentialCard
                key={cert.slug}
                icon="certification"
                title={cert.frontmatter.title}
                institution={cert.frontmatter.company}
                dates={formatDateRange(
                  cert.frontmatter.startDate,
                  cert.frontmatter.endDate,
                )}
                skills={cert.frontmatter.skills || []}
                description={cert.content.trim()}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface CredentialCardProps {
  icon: "education" | "certification";
  title: string;
  institution: string;
  dates: string;
  skills: string[];
  description: string;
}

function CredentialCard({
  icon,
  title,
  institution,
  dates,
  skills,
  description,
}: CredentialCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
          {icon === "education" ? (
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Award className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-tight">{title}</h3>
          <p className="mt-0.5 text-sm text-zinc-400">{institution}</p>
          <p className="mt-0.5 text-sm text-zinc-500">{dates}</p>
        </div>
      </div>

      {description && (
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          {description}
        </p>
      )}

      {skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-secondary px-2 py-0.5 text-xs text-zinc-400"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format "YYYY-MM" to "Mon YYYY" or just pass through "Present". */
function formatDate(raw: string): string {
  if (!raw || raw.toLowerCase() === "present") return "Present";
  const [year, month] = raw.split("-");
  if (!year || !month) return raw;
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatDateRange(start: string, end: string): string {
  return `${formatDate(start)} — ${formatDate(end)}`;
}

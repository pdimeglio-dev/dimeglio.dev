import type { Metadata } from "next";
import { GraduationCap, Award } from "lucide-react";
import { getExperiences, getSkillsForExperience } from "@/lib/mdx";

export const metadata: Metadata = {
  title: "Experience",
  description:
    "Professional experience and career history of Pablo Di Meglio.",
};

/**
 * Experience page — split into three sections:
 * 1. Jobs timeline (exp-*) — the main vertical timeline
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

  // Pre-compute aggregated skills for jobs
  const jobSkills: Record<string, string[]> = {};
  for (const job of jobs) {
    jobSkills[job.slug] = getSkillsForExperience(job.slug);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-4xl font-bold tracking-tighter">Experience</h1>
      <p className="mt-4 text-muted-foreground">
        Where I&apos;ve been and what I&apos;ve built.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Jobs Timeline                                                      */}
      {/* ----------------------------------------------------------------- */}
      <section className="mt-16">
        <div className="space-y-12">
          {jobs.map((job) => {
            const skills = jobSkills[job.slug] || [];
            return (
              <article
                key={job.slug}
                className="relative border-l border-slate-800 pl-8"
              >
                {/* Timeline dot */}
                <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-slate-700 bg-black" />

                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-xl font-semibold tracking-tight">
                    {job.frontmatter.title}
                  </h2>
                  <span className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDateRange(
                      job.frontmatter.startDate,
                      job.frontmatter.endDate,
                    )}
                  </span>
                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                  {job.frontmatter.company}
                </p>

                <div className="mt-3 text-sm leading-relaxed text-muted-foreground/80 whitespace-pre-line">
                  {job.content.trim()}
                </div>

                {skills.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Education & Certifications                                         */}
      {/* ----------------------------------------------------------------- */}
      {(education.length > 0 || certifications.length > 0) && (
        <section className="mt-24">
          <h2 className="text-2xl font-bold tracking-tighter">
            Education &amp; Certifications
          </h2>
          <p className="mt-2 text-muted-foreground">
            Formal education and professional credentials.
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
          <h3 className="text-sm font-semibold leading-tight">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{institution}</p>
          <p className="mt-0.5 text-xs text-muted-foreground/60">{dates}</p>
        </div>
      </div>

      {description && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground/80">
          {description}
        </p>
      )}

      {skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground"
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

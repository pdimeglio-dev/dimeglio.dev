import Link from "next/link";
import Image from "next/image";
import type { ProjectCardProps } from "@/lib/chat-widgets";
import { getValidHref, getLogoSrc } from "@/lib/chat-slugs";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDate(d: string): string {
  if (d === "Present") return "Present";
  const [year, month] = d.split("-");
  return month ? `${MONTHS[parseInt(month) - 1]} ${year}` : year;
}

function formatDateRange(start?: string, end?: string): string {
  if (!start && !end) return "";
  if (start && end) return `${formatDate(start)} — ${formatDate(end)}`;
  if (start) return `Since ${formatDate(start)}`;
  return formatDate(end!);
}

export function ProjectCard({
  title,
  company,
  role,
  startDate,
  endDate,
  summary,
  techStack,
  logoFile,
  slug,
}: ProjectCardProps) {
  const logoSrc = getLogoSrc(logoFile);
  const initials = company.slice(0, 2).toUpperCase();
  const dateRange = formatDateRange(startDate, endDate);
  const href = getValidHref(slug);

  const cardContent = (
    <>
      {/* Header: logo + title + company + dates */}
      <div className="mb-2.5 flex items-start gap-3">
        {logoSrc ? (
          <Image
            src={logoSrc}
            alt={company}
            width={32}
            height={32}
            className="mt-0.5 h-8 w-8 shrink-0 rounded object-contain"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-700 text-xs font-bold text-slate-300">
            {initials}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-white">{title}</p>
            {href && (
              <span className="shrink-0 text-[10px] text-purple-400 opacity-0 transition-opacity group-hover:opacity-100">
                View →
              </span>
            )}
          </div>
          <p className="truncate text-xs text-slate-400">
            {role ? `${role} · ` : ""}
            {company}
          </p>
          {dateRange && (
            <p className="text-[11px] text-slate-500">{dateRange}</p>
          )}
        </div>
      </div>

      {/* Summary */}
      <p className="mb-2.5 text-xs leading-relaxed text-slate-300">{summary}</p>

      {/* Tech stack badges */}
      {techStack.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {techStack.map((tech) => (
            <span
              key={tech}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-700/60 text-slate-400"
            >
              {tech}
            </span>
          ))}
        </div>
      )}
    </>
  );

  const baseClass =
    "group mt-2 block rounded-lg border border-slate-700/60 bg-black/30 p-3";

  if (href) {
    return (
      <Link
        href={href}
        className={`${baseClass} cursor-pointer transition-colors hover:border-purple-500/40 hover:bg-purple-500/5`}
      >
        {cardContent}
      </Link>
    );
  }

  return <div className={baseClass}>{cardContent}</div>;
}

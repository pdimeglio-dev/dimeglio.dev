import Link from "next/link";
import Image from "next/image";
import type { ProjectListProps } from "@/lib/chat-widgets";
import { getValidHref } from "@/lib/chat-slugs";

const KNOWN_LOGOS = new Set([
  "argentina-gob-ar",
  "disney",
  "globant",
  "google",
  "mission-lane",
  "pccw-global",
  "rpotential",
  "wells-fargo",
]);

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
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  if (start) return `Since ${formatDate(start)}`;
  return formatDate(end!);
}

export function ProjectList({ title, items }: ProjectListProps) {
  if (!items.length) return null;

  return (
    <div className="mt-2 rounded-lg border border-slate-700/60 bg-black/30 overflow-hidden">
      {title && (
        <div className="border-b border-slate-700/60 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
        </div>
      )}

      <div className="divide-y divide-slate-700/40">
        {items.map((item, i) => {
          const href = getValidHref(item.slug);
          const hasLogo = !!item.logoFile && KNOWN_LOGOS.has(item.logoFile);
          const initials = item.company.slice(0, 2).toUpperCase();
          const dateRange = formatDateRange(item.startDate, item.endDate);
          const badges = (item.techStack ?? []).slice(0, 3);

          const inner = (
            <div className="group flex gap-3 px-3 py-3 transition-colors hover:bg-slate-700/20">
              {/* Logo / initials */}
              {hasLogo ? (
                <Image
                  src={`/logos/${item.logoFile}.svg`}
                  alt={item.company}
                  width={28}
                  height={28}
                  className="mt-0.5 h-7 w-7 shrink-0 rounded object-contain"
                />
              ) : (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-700 text-[10px] font-bold text-slate-300">
                  {initials}
                </div>
              )}

              {/* Text — stacks vertically so nothing gets squeezed */}
              <div className="min-w-0 flex-1">
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold leading-snug text-white">{item.title}</p>
                  {href && (
                    <span className="shrink-0 text-[10px] text-purple-400 opacity-0 transition-opacity group-hover:opacity-100">
                      →
                    </span>
                  )}
                </div>

                {/* Company + role */}
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {item.role ? `${item.role} · ` : ""}{item.company}
                </p>

                {/* Date range */}
                {dateRange && (
                  <p className="mt-0.5 text-[10px] text-slate-500">{dateRange}</p>
                )}

                {/* Tech badges — always visible, wrap naturally */}
                {badges.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {badges.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-slate-700/70 px-1.5 py-0.5 text-[9px] font-medium text-slate-400"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );

          return href ? (
            <Link key={i} href={href} className="block cursor-pointer">
              {inner}
            </Link>
          ) : (
            <div key={i}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}

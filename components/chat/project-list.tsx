"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import type { ProjectListProps, ProjectListItem } from "@/lib/chat-widgets";
import { getValidHref, getLogoSrc } from "@/lib/chat-slugs";
import { captureError } from "@/lib/analytics";

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

function ProjectRow({ item }: { item: ProjectListItem }) {
  const href = getValidHref(item.slug);
  const logoSrc = getLogoSrc(item.logoFile);
  const initials = item.company.slice(0, 2).toUpperCase();
  const dateRange = formatDateRange(item.startDate, item.endDate);
  const badges = (item.techStack ?? []).slice(0, 3);

  const inner = (
    <div className="group flex gap-3 px-3 py-3 transition-colors hover:bg-slate-700/20">
      {logoSrc ? (
        <Image
          src={logoSrc}
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

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold leading-snug text-white">{item.title}</p>
          {href && (
            <span className="shrink-0 text-[10px] text-purple-400 opacity-0 transition-opacity group-hover:opacity-100">
              →
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] text-slate-400">
          {item.role ? `${item.role} · ` : ""}{item.company}
        </p>
        {dateRange && (
          <p className="mt-0.5 text-[10px] text-slate-500">{dateRange}</p>
        )}
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
    <Link href={href} className="block cursor-pointer">
      {inner}
    </Link>
  ) : (
    <div>{inner}</div>
  );
}

export function ProjectList({ title, items: initialItems, hasMore: initialHasMore, searchQuery, filterTech, filterCompany }: ProjectListProps) {
  const [items, setItems] = useState<ProjectListItem[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore ?? false);
  const [isLoading, setIsLoading] = useState(false);

  if (!items.length) return null;

  async function loadMore() {
    setIsLoading(true);
    try {
      const excludeSlugs = items.map((i) => i.slug).filter(Boolean).join(",");
      const params = new URLSearchParams({ limit: "8", excludeSlugs });
      if (searchQuery) params.set("q", searchQuery);
      if (filterTech) params.set("filterTech", filterTech);
      if (filterCompany) params.set("filterCompany", filterCompany);
      const res = await fetch(`/api/projects?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { items: ProjectListItem[]; hasMore: boolean };
      setItems((prev) => [...prev, ...data.items]);
      setHasMore(data.hasMore);
    } catch (error) {
      captureError(error);
    } finally {
      setIsLoading(false);
    }
  }

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
        {items.map((item, i) => (
          <ProjectRow key={item.slug ?? i} item={item} />
        ))}
      </div>

      {hasMore && searchQuery && (
        <div className="border-t border-slate-700/60 px-3 py-2">
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="flex cursor-pointer items-center gap-1.5 text-[11px] text-purple-400 transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-1 w-1 rounded-full bg-purple-400"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </>
            ) : (
              "Show more projects →"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

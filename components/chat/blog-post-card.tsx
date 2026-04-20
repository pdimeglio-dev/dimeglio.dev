import Link from "next/link";
import Image from "next/image";
import type { BlogPostCardProps } from "@/lib/chat-widgets";
import { getValidHref } from "@/lib/chat-slugs";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDate(d: string): string {
  const [year, month, day] = d.split("-");
  const m = month ? MONTHS[parseInt(month) - 1] : "";
  const dd = day ? parseInt(day) : null;
  if (m && dd) return `${m} ${dd}, ${year}`;
  if (m) return `${m} ${year}`;
  return year;
}

export function BlogPostCard({
  title,
  description,
  date,
  tags,
  coverImage,
  slug,
}: BlogPostCardProps) {
  const href = getValidHref(slug);

  const cardContent = (
    <>
      {/* Cover image — full-width hero */}
      <div className="relative h-[140px] w-full overflow-hidden rounded-t-lg">
        <Image
          src={coverImage}
          alt={title}
          fill
          sizes="400px"
          className="object-cover"
        />
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          {href && (
            <span className="shrink-0 text-[10px] text-purple-400 opacity-0 transition-opacity group-hover:opacity-100">
              Read →
            </span>
          )}
        </div>

        <p className="mb-1.5 text-[11px] text-slate-500">{formatDate(date)}</p>

        <p className="mb-2.5 line-clamp-2 text-xs leading-relaxed text-slate-300">
          {description}
        </p>

        {/* Tag pills */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-700/60 text-slate-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );

  const baseClass =
    "group mt-2 block rounded-lg border border-slate-700/60 bg-black/30 overflow-hidden";

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

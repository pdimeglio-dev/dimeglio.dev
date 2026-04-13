import type { SkillGridProps } from "@/lib/chat-widgets";

const LEVEL_CONFIG = {
  Expert: {
    badge: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
    dot: "bg-purple-400",
    label: "Expert",
  },
  Advanced: {
    badge: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
    dot: "bg-indigo-400",
    label: "Advanced",
  },
  Proficient: {
    badge: "bg-slate-600/30 text-slate-300 border border-slate-600/40",
    dot: "bg-slate-400",
    label: "Proficient",
  },
  Familiar: {
    badge: "bg-zinc-700/40 text-zinc-400 border border-zinc-600/30",
    dot: "bg-zinc-500",
    label: "Familiar",
  },
} as const;

const LEGEND_LEVELS = ["Expert", "Advanced", "Proficient", "Familiar"] as const;

export function SkillGrid({ skills, title }: SkillGridProps) {
  const usedLevels = LEGEND_LEVELS.filter((lvl) =>
    skills.some((s) => s.level === lvl)
  );

  return (
    <div className="mt-2 rounded-lg border border-slate-700/60 bg-black/30 p-3">
      {title && (
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => {
          const config = LEVEL_CONFIG[skill.level] ?? LEVEL_CONFIG.Familiar;
          return (
            <div
              key={skill.name}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${config.badge}`}
              title={skill.evidence}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dot}`} />
              <span className="font-medium">{skill.name}</span>
              <span className="text-[10px] opacity-60">{config.label}</span>
            </div>
          );
        })}
      </div>

      {/* Legend — only show levels that appear in the data */}
      {usedLevels.length > 1 && (
        <div className="mt-2.5 flex flex-wrap gap-3 border-t border-slate-700/40 pt-2">
          {usedLevels.map((level) => (
            <span
              key={level}
              className="flex items-center gap-1 text-[10px] text-slate-600"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${LEVEL_CONFIG[level].dot}`}
              />
              {level}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface MermaidProps {
  chart?: string;
  children?: ReactNode;
  caption?: string;
}

/**
 * Extract raw text from React children (handles MDX passing children as elements).
 */
function extractText(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (children && typeof children === "object" && "props" in children) {
    return extractText((children as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

/**
 * Role classes every flowchart gets for free. Tag a node with `:::agent`,
 * `:::storage`, etc. instead of repeating classDef lines in each post.
 * Injected before the author's own lines, so a post can still override one.
 */
const ROLE_CLASSES = [
  "classDef input fill:#0f172a,stroke:#64748b,stroke-width:1.5px,color:#e2e8f0",
  "classDef agent fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#ffffff",
  "classDef queue fill:#082f49,stroke:#38bdf8,stroke-width:1.5px,color:#e0f2fe",
  "classDef storage fill:#052e16,stroke:#34d399,stroke-width:1.5px,color:#d1fae5",
  "classDef external fill:#1c1917,stroke:#f59e0b,stroke-width:1.5px,stroke-dasharray:4 3,color:#fef3c7",
  "classDef output fill:#2e1065,stroke:#c084fc,stroke-width:1.5px,color:#f3e8ff",
];

function withRoleClasses(chart: string): string {
  const lines = chart.split("\n");
  const header = lines.findIndex((l) => /^\s*(flowchart|graph)\b/.test(l));
  if (header === -1) return chart;
  lines.splice(header + 1, 0, ...ROLE_CLASSES.map((c) => `    ${c}`));
  return lines.join("\n");
}

let mermaidReady: Promise<typeof import("mermaid").default> | null = null;

/**
 * Load mermaid once, with the `logos:` icon pack registered. The pack is only
 * fetched when a diagram actually uses an icon. (Not using the ELK layout:
 * @mermaid-js/layout-elk bundles its own icon registry, so icons render as "?".)
 */
function loadMermaid() {
  mermaidReady ??= (async () => {
    const mermaid = (await import("mermaid")).default;
    mermaid.registerIconPacks([
      {
        name: "logos",
        loader: () => import("@iconify-json/logos").then((m) => m.icons),
      },
    ]);
    return mermaid;
  })();
  return mermaidReady;
}

export function Mermaid({ chart, children, caption }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  const chartDefinition = chart || extractText(children);

  useEffect(() => {
    if (!chartDefinition) return;

    const renderChart = async () => {
      try {
        const mermaid = await loadMermaid();

        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          flowchart: {
            curve: "basis",
            nodeSpacing: 40,
            rankSpacing: 56,
            padding: 14,
          },
          themeVariables: {
            darkMode: true,
            background: "transparent",
            primaryColor: "#0f172a",
            primaryBorderColor: "#475569",
            primaryTextColor: "#e2e8f0",
            secondaryColor: "#131827",
            secondaryBorderColor: "#334155",
            secondaryTextColor: "#ffffff",
            tertiaryColor: "#171d2e",
            tertiaryBorderColor: "#334155",
            tertiaryTextColor: "#ffffff",
            lineColor: "#64748b",
            textColor: "#e2e8f0",
            fontSize: "15px",
            fontFamily:
              "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
            noteBkgColor: "#131827",
            noteTextColor: "#ffffff",
            noteBorderColor: "#334155",
            edgeLabelBackground: "#0b0d14",
            clusterBkg: "rgba(148, 163, 184, 0.04)",
            clusterBorder: "#1e293b",
            titleColor: "#94a3b8",
          },
        });

        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(
          id,
          withRoleClasses(chartDefinition.trim()),
        );

        // Post-process: round all sharp-cornered rectangles
        const rounded = renderedSvg
          .replace(/rx="0"/g, 'rx="8"')
          .replace(/ry="0"/g, 'ry="8"');

        setSvg(rounded);
      } catch (err) {
        console.error("[Mermaid] Render error:", err);
        setError(String(err));
      }
    };

    renderChart();
  }, [chartDefinition]);

  if (!chartDefinition) return null;

  return (
    <figure className="my-8 not-prose -mx-4 sm:mx-0">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/30 p-4 text-sm text-red-400">
          Mermaid error: {error}
        </div>
      )}
      <div
        ref={containerRef}
        className="rounded-lg border border-slate-800 bg-black/50 p-4 sm:p-6 overflow-x-auto [&_svg]:mx-auto [&_svg]:block [&_svg]:max-w-none"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {caption && (
        <figcaption className="mt-3 text-center text-sm text-slate-500">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

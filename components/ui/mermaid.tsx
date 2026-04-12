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

export function Mermaid({ chart, children, caption }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  const chartDefinition = chart || extractText(children);

  useEffect(() => {
    if (!chartDefinition) return;

    const renderChart = async () => {
      try {
        const mermaid = (await import("mermaid")).default;

        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: {
            darkMode: true,
            background: "transparent",
            primaryColor: "#0f1219",
            primaryBorderColor: "#334155",
            primaryTextColor: "#ffffff",
            secondaryColor: "#131827",
            secondaryBorderColor: "#334155",
            secondaryTextColor: "#ffffff",
            tertiaryColor: "#171d2e",
            tertiaryBorderColor: "#334155",
            tertiaryTextColor: "#ffffff",
            lineColor: "#6366f1",
            textColor: "#ffffff",
            fontSize: "16px",
            fontFamily:
              "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
            noteBkgColor: "#131827",
            noteTextColor: "#ffffff",
            noteBorderColor: "#334155",
            edgeLabelBackground: "#080a0f",
            clusterBkg: "#0c0f18",
            clusterBorder: "#1e293b",
            titleColor: "#ffffff",
          },
        });

        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, chartDefinition.trim());

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

/**
 * MDXContent — Server Component that renders raw MDX strings into styled HTML.
 *
 * Uses `next-mdx-remote/rsc` to compile MDX on the server (React Server Component
 * compatible) and `rehype-pretty-code` with the github-dark theme for syntax
 * highlighting.
 *
 * Why next-mdx-remote?
 * - Our MDX content lives in /content/ (not /app/), so we can't use @next/mdx
 * - We need to dynamically render MDX from filesystem strings
 * - The /rsc variant works with React Server Components (no client JS shipped)
 *
 * @see https://github.com/hashicorp/next-mdx-remote
 */

import { MDXRemote } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";
import type { MDXComponents } from "mdx/types";
import { Mermaid } from "@/components/ui/mermaid";

const rehypePrettyCodeOptions = {
  theme: "github-dark",
  keepBackground: true,
};

/**
 * Recursively extract raw text from React children tree.
 * Used to get mermaid chart definitions from code blocks.
 */
function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node) return "";
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object" && "props" in node) {
    const el = node as React.ReactElement<{ children?: React.ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

/**
 * Custom MDX component overrides.
 * - External links open in a new tab with noopener/noreferrer.
 * - Internal links (starting with / or #) behave normally.
 * - Code blocks with language "mermaid" render as interactive diagrams.
 */
const components: MDXComponents = {
  Mermaid,
  pre: (props) => {
    // Intercept mermaid code blocks: ```mermaid ... ```
    const child = props.children as React.ReactElement<{
      children?: React.ReactNode;
      "data-language"?: string;
      className?: string;
    }> | undefined;

    if (child && typeof child === "object" && "props" in child) {
      const lang =
        child.props["data-language"] ||
        (child.props.className?.includes("language-mermaid") ? "mermaid" : "");

      if (lang === "mermaid") {
        const chartText = extractText(child.props.children);
        return <Mermaid chart={chartText} />;
      }
    }

    return <pre {...props} />;
  },
  a: (props) => {
    const href = props.href ?? "";
    const isExternal = href.startsWith("http://") || href.startsWith("https://");
    return (
      <a
        {...props}
        className="text-white underline underline-offset-4 transition-colors hover:text-blue-400"
        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      />
    );
  },
};

interface MDXContentProps {
  source: string;
}

export function MDXContent({ source }: MDXContentProps) {
  return (
    <div className="prose prose-invert prose-slate max-w-none overflow-hidden prose-headings:tracking-tight prose-headings:font-bold prose-code:text-sm prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-slate-800 prose-pre:overflow-x-auto prose-pre:max-w-[calc(100vw-3rem)]">
      <MDXRemote
        source={source}
        components={components}
        options={{
          mdxOptions: {
            rehypePlugins: [[rehypePrettyCode, rehypePrettyCodeOptions]],
          },
        }}
      />
    </div>
  );
}

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

const rehypePrettyCodeOptions = {
  theme: "github-dark",
  keepBackground: true,
};

/**
 * Custom MDX component overrides.
 * - External links open in a new tab with noopener/noreferrer.
 * - Internal links (starting with / or #) behave normally.
 */
const components: MDXComponents = {
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
    <div className="prose prose-invert prose-slate max-w-none prose-headings:tracking-tight prose-headings:font-bold prose-code:text-sm prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-slate-800">
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

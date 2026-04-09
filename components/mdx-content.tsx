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

const rehypePrettyCodeOptions = {
  theme: "github-dark",
  keepBackground: true,
};

interface MDXContentProps {
  source: string;
}

export function MDXContent({ source }: MDXContentProps) {
  return (
    <div className="prose prose-invert prose-slate max-w-none prose-headings:tracking-tight prose-headings:font-bold prose-a:text-white prose-a:underline-offset-4 prose-code:text-sm prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-slate-800">
      <MDXRemote
        source={source}
        options={{
          mdxOptions: {
            rehypePlugins: [[rehypePrettyCode, rehypePrettyCodeOptions]],
          },
        }}
      />
    </div>
  );
}

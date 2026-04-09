import type { Metadata } from "next";
import Link from "next/link";
import { getBlogPosts } from "@/lib/mdx";

export const metadata: Metadata = {
  title: "Blog",
  description: "Thoughts on AI architecture, full-stack engineering, and building intelligent systems.",
};

/**
 * Blog index page — lists all published blog posts sorted by date (newest first).
 */
export default function BlogPage() {
  const posts = getBlogPosts();

  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-4xl font-bold tracking-tighter">Blog</h1>
      <p className="mt-4 text-muted-foreground">
        Thoughts on AI, engineering, and building things that matter.
      </p>

      <div className="mt-12 space-y-8">
        {posts.map((post) => (
          <article key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="group block rounded-xl border border-slate-800 p-6 transition-colors hover:border-slate-700"
            >
              <time
                dateTime={post.frontmatter.date}
                className="text-sm text-muted-foreground"
              >
                {new Date(post.frontmatter.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>

              <h2 className="mt-2 text-xl font-semibold tracking-tight transition-colors group-hover:text-white">
                {post.frontmatter.title}
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">
                {post.frontmatter.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {post.frontmatter.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-800 px-3 py-1 text-xs text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          </article>
        ))}

        {posts.length === 0 && (
          <p className="text-muted-foreground">No posts yet. Check back soon!</p>
        )}
      </div>
    </main>
  );
}

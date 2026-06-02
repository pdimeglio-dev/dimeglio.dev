import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getBlogPosts } from "@/lib/mdx";
import { JsonLd, blogListSchema } from "@/components/json-ld";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Thoughts on AI architecture, full-stack engineering, and building intelligent systems.",
  alternates: {
    canonical: "https://dimeglio.dev/blog",
  },
};

/**
 * Blog index page — lists all published blog posts sorted by date (newest first).
 */
export default function BlogPage() {
  const posts = getBlogPosts();

  const postsForSchema = posts.map((p) => ({
    title: p.frontmatter.title,
    slug: p.slug,
    description: p.frontmatter.description,
  }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <JsonLd data={blogListSchema(postsForSchema)} />
      <h1 className="text-4xl font-bold tracking-tighter">Blog</h1>
      <p className="mt-4 text-muted-foreground">
        Thoughts on AI, engineering, and building things that matter.
      </p>

      <div className="mt-12 space-y-8">
        {posts.map((post) => (
          <article key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="group block overflow-hidden rounded-xl border border-slate-800 transition-colors hover:border-slate-700"
            >
              {post.frontmatter.coverImage && (
                <div className="overflow-hidden">
                  <Image
                    src={post.frontmatter.coverImage}
                    alt={post.frontmatter.coverAlt || post.frontmatter.title}
                    width={800}
                    height={420}
                    className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>
              )}

              <div className="p-6">
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

                {post.frontmatter.series && (
                  <span className="mt-2 inline-block rounded-full border border-slate-800 px-3 py-1 text-xs text-muted-foreground">
                    {post.frontmatter.series.name}
                  </span>
                )}

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
              </div>
            </Link>
          </article>
        ))}

        {posts.length === 0 && (
          <p className="text-muted-foreground">
            No posts yet. Check back soon!
          </p>
        )}
      </div>
    </main>
  );
}

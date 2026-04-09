import { notFound } from "next/navigation";
import { getBlogPost, getBlogPosts } from "@/lib/mdx";
import { MDXContent } from "@/components/mdx-content";

/**
 * Generate static params for all published blog posts at build time.
 */
export function generateStaticParams() {
  const posts = getBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

/**
 * Generate dynamic metadata for each blog post.
 */
export async function generateMetadata(props: PageProps<"/blog/[slug]">) {
  const { slug } = await props.params;
  const post = getBlogPost(slug);

  if (!post) return { title: "Post Not Found" };

  return {
    title: post.frontmatter.title,
    description: post.frontmatter.description,
  };
}

/**
 * Blog post page — renders a single MDX blog post.
 * Uses Next.js 16 PageProps helper (params is a Promise).
 */
export default async function BlogPostPage(props: PageProps<"/blog/[slug]">) {
  const { slug } = await props.params;
  const post = getBlogPost(slug);

  if (!post || !post.frontmatter.published) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-3xl px-6 py-24">
      <header className="mb-12">
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
        <h1 className="mt-2 text-4xl font-bold tracking-tighter">
          {post.frontmatter.title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
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
      </header>

      <MDXContent source={post.content} />
    </article>
  );
}

import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getBlogPost, getBlogPosts, getSeriesPosts } from "@/lib/mdx";
import { MDXContent } from "@/components/mdx-content";
import { BlogPostTracker } from "@/components/blog-post-tracker";
import { JsonLd, articleSchema } from "@/components/json-ld";

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

  const { title, description, coverImage } = post.frontmatter;

  return {
    title,
    description,
    alternates: {
      canonical: `https://dimeglio.dev/blog/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: "article",
      ...(coverImage && {
        images: [{ url: coverImage, width: 1200, height: 630, alt: title }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(coverImage && { images: [coverImage] }),
    },
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
    <article className="mx-auto max-w-3xl px-6 py-24 overflow-x-hidden">
      <JsonLd
        data={articleSchema({
          title: post.frontmatter.title,
          description: post.frontmatter.description,
          date: post.frontmatter.date,
          lastModified: post.frontmatter.lastModified,
          slug,
          tags: post.frontmatter.tags,
          coverImage: post.frontmatter.coverImage,
        })}
      />
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

        {post.frontmatter.coverImage && (
          <div className="mt-8 overflow-hidden rounded-xl border border-slate-800">
            <Image
              src={post.frontmatter.coverImage}
              alt={post.frontmatter.coverAlt || post.frontmatter.title}
              width={1200}
              height={630}
              className="w-full object-cover"
              priority
            />
          </div>
        )}
      </header>

      <MDXContent source={post.content} />

      {post.frontmatter.series &&
        (() => {
          const siblings = getSeriesPosts(post.frontmatter.series.name);
          if (siblings.length < 2) return null;
          return (
            <aside className="mt-16 border-t border-slate-800 pt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                More in this series
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {post.frontmatter.series.name}
              </p>
              <ol className="mt-4 space-y-2">
                {siblings.map((sibling) => (
                  <li key={sibling.slug}>
                    {sibling.slug === slug ? (
                      <span className="text-foreground">{sibling.title}</span>
                    ) : (
                      <Link
                        href={`/blog/${sibling.slug}`}
                        className="text-muted-foreground transition-colors hover:text-white"
                      >
                        {sibling.title}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </aside>
          );
        })()}

      {/* Analytics: tracks blog_post_viewed + scroll depth */}
      <BlogPostTracker
        slug={slug}
        title={post.frontmatter.title}
        tags={post.frontmatter.tags}
      />
    </article>
  );
}

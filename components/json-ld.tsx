/**
 * JSON-LD structured data helper components.
 * Renders a <script type="application/ld+json"> tag with the given schema.
 *
 * Usage:
 *   <JsonLd data={personSchema} />
 */

interface JsonLdProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ---------------------------------------------------------------------------
// Pre-built schema factories
// ---------------------------------------------------------------------------

const BASE_URL = "https://dimeglio.dev";

/** WebSite schema — used in root layout */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "dimeglio.dev",
    url: BASE_URL,
    description:
      "Personal portfolio and blog of Pablo Di Meglio — Senior Full Stack Engineer and AI Native. Building software that thinks.",
    author: personSchema(),
  };
}

/** Person schema — used on home page */
export function personSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Pablo Di Meglio",
    url: BASE_URL,
    jobTitle: "Senior Full Stack Engineer",
    description:
      "Senior Full Stack Engineer and AI Native with 14+ years of experience building scalable systems at Google, Disney, Wells Fargo, and more.",
    sameAs: [
      "https://www.linkedin.com/in/dimegliopablo/",
      "https://github.com/pdimeglio-dev",
    ],
    knowsAbout: [
      "Full Stack Engineering",
      "AI Architecture",
      "System Design",
      "TypeScript",
      "React",
      "Angular",
      "Next.js",
      "Node.js",
      "Java",
      "Kotlin",
      "Google Cloud Platform",
      "LLMs",
      "RAG",
    ],
  };
}

/** Article schema — used on individual blog posts */
export function articleSchema(post: {
  title: string;
  description: string;
  date: string;
  lastModified?: string;
  slug: string;
  tags: string[];
  coverImage?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.lastModified || post.date,
    url: `${BASE_URL}/blog/${post.slug}`,
    author: {
      "@type": "Person",
      name: "Pablo Di Meglio",
      url: BASE_URL,
    },
    publisher: {
      "@type": "Person",
      name: "Pablo Di Meglio",
      url: BASE_URL,
    },
    keywords: post.tags,
    ...(post.coverImage && {
      image: {
        "@type": "ImageObject",
        url: `${BASE_URL}${post.coverImage}`,
        width: 1200,
        height: 630,
      },
    }),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/blog/${post.slug}`,
    },
  };
}

/** ItemList schema — used on blog index page */
export function blogListSchema(
  posts: { title: string; slug: string; description: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Blog Posts",
    description:
      "Thoughts on AI architecture, full-stack engineering, and building intelligent systems.",
    numberOfItems: posts.length,
    itemListElement: posts.map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${BASE_URL}/blog/${post.slug}`,
      name: post.title,
    })),
  };
}

/** ProfilePage schema — used on experience page */
export function profilePageSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: "Experience — Pablo Di Meglio",
    description:
      "Professional experience and career history of Pablo Di Meglio.",
    url: `${BASE_URL}/experience`,
    mainEntity: personSchema(),
  };
}

/** BreadcrumbList schema — reusable for any page */
export function breadcrumbSchema(
  items: { name: string; url: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

import { getProject } from "@/lib/mdx";
import { FeaturedBuildCard, type FeaturedBuild } from "@/components/home/featured-build-card";

/**
 * Curated copy for the home page. Titles and links come from the project MDX
 * so they stay in sync; the pitch, status and stats are written for the home
 * page and kept short on purpose.
 */
const builds = [
  {
    slug: "proj-paddle-games",
    status: "Live on the App Store",
    pitch:
      "A leaderboard and challenge platform for Bay Area paddlers. Strava sync, route challenges with personal records, and a native iPhone app. Built and run solo.",
    stats: ["iPhone + web", "7 GCP services", "~100 paddlers"],
  },
  {
    slug: "proj-batcave",
    status: "Running every day",
    pitch:
      "My own multi-agent system on the Claude Agent SDK. Alfred, Gordon and Ra's handle memory, nutrition and training, on Telegram voice, an iPhone and Watch app, and the web.",
    stats: ["3 agents", "13 eval suites", "280+ PRs"],
  },
] as const;

/**
 * "What I'm building" — the two personal products, right under the hero.
 * Server component: reads project frontmatter, renders client cards.
 */
export function FeaturedBuilds() {
  const items: FeaturedBuild[] = builds.flatMap((build) => {
    const project = getProject(build.slug);
    if (!project) return [];
    const links = project.frontmatter.links ?? {};
    return [
      {
        slug: build.slug,
        title: project.frontmatter.title,
        status: build.status,
        pitch: build.pitch,
        stats: [...build.stats],
        links: {
          appStore: links["app store"],
          website: links.website,
          github: links.github,
        },
      },
    ];
  });

  return (
    <section id="building" className="mx-auto w-full max-w-6xl scroll-mt-24 px-6">
      <p className="text-center text-sm uppercase tracking-widest text-muted-foreground">
        What I&apos;m building outside work
      </p>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {items.map((item, i) => (
          <FeaturedBuildCard key={item.slug} build={item} index={i} />
        ))}
      </div>
    </section>
  );
}

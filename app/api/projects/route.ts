export const maxDuration = 30;

import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { Pinecone } from "@pinecone-database/pinecone";
import type { ProjectListItem } from "@/lib/chat-widgets";
import { captureServerError } from "@/lib/posthog-server";

// ---------------------------------------------------------------------------
// Logo inference — maps company name fragments to known logo basenames
// ---------------------------------------------------------------------------

const LOGO_MAP: [string, string][] = [
  ["rpotential", "rpotential"],
  ["mission lane", "mission-lane"],
  ["google", "google"],
  ["globant", "globant"],
  ["disney", "disney"],
  ["wells fargo", "wells-fargo"],
  ["pccw", "pccw-global"],
  ["argentina", "argentina-gob-ar"],
  ["gobierno", "argentina-gob-ar"],
];

function inferLogo(company: string): string | undefined {
  const lower = company.toLowerCase();
  for (const [fragment, logo] of LOGO_MAP) {
    if (lower.includes(fragment)) return logo;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// GET /api/projects?excludeSlugs=proj-a,proj-b&limit=8
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "8"), 20);
    const excludeSlugs = new Set(
      (url.searchParams.get("excludeSlugs") ?? "").split(",").filter(Boolean)
    );

    const apiKey = process.env.PINECONE_API_KEY;
    const indexName = process.env.PINECONE_INDEX_NAME;
    if (!apiKey || !indexName) {
      return Response.json({ error: "Missing Pinecone config" }, { status: 500 });
    }

    const currentDate = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const filterQuery = url.searchParams.get("q") ?? "Pablo projects built developed portfolio";
    const filterTech = url.searchParams.get("filterTech") ?? "";
    const filterCompany = url.searchParams.get("filterCompany") ?? "";
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: `${filterQuery} ${currentDate}`,
    });

    // When filtering by tech or company, use a larger topK — many candidates will be
    // excluded by the filter so we need more headroom to find enough matching projects.
    const filterMultiplier = (filterTech || filterCompany) ? 8 : 4;
    const topK = Math.min((excludeSlugs.size + limit) * filterMultiplier + 10, 100);

    const { matches } = await new Pinecone({ apiKey })
      .index(indexName)
      .query({
        vector: embedding,
        topK,
        includeMetadata: true,
      });

    const parseDate = (d: unknown): number => {
      if (!d || d === "Present") return Date.now();
      const s = String(d);
      const parsed = new Date(s.length === 7 ? `${s}-01` : s);
      return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
    };

    const ft = filterTech.toLowerCase();
    const fc = filterCompany.toLowerCase();
    const projectMatches = matches
      .filter((m) => {
        const slug = String(m.metadata?.slug ?? m.id ?? "");
        if (!slug.startsWith("proj-") || excludeSlugs.has(slug)) return false;
        if (ft) {
          const techStack = String(m.metadata?.tech_stack ?? "").toLowerCase();
          if (!new RegExp(`\\b${ft}\\b`).test(techStack)) return false;
        }
        if (fc) {
          const company = String(m.metadata?.company ?? "").toLowerCase();
          if (!company.includes(fc)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aPersonal = a.metadata?.category === "Personal";
        const bPersonal = b.metadata?.category === "Personal";
        if (aPersonal !== bPersonal) return aPersonal ? -1 : 1;
        const aDate = parseDate(a.metadata?.end_date ?? a.metadata?.start_date);
        const bDate = parseDate(b.metadata?.end_date ?? b.metadata?.start_date);
        return bDate - aDate;
      });

    const hasMore = projectMatches.length > limit;
    const page = projectMatches.slice(0, limit);

    const items: ProjectListItem[] = page.map((m) => {
      const meta = m.metadata ?? {};
      const slug = String(meta.slug ?? m.id ?? "");
      const company = String(meta.company ?? "");
      const techRaw = meta.tech_stack ? String(meta.tech_stack) : "";
      return {
        title: String(meta.title ?? ""),
        company,
        techStack: techRaw
          ? techRaw.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 3)
          : undefined,
        logoFile: inferLogo(company),
        slug,
      };
    });

    return Response.json({ items, hasMore });
  } catch (error) {
    console.error("[/api/projects] Error:", error);
    captureServerError(error, { route: "/api/projects" });
    return Response.json({ error: "Failed to load projects" }, { status: 500 });
  }
}

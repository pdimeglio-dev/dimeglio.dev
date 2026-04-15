export const maxDuration = 120;

import { openai } from "@ai-sdk/openai";
import { embed, streamText, jsonSchema, stepCountIs } from "ai";
import { Pinecone } from "@pinecone-database/pinecone";
import { Resend } from "resend";
import type {
  SkillGridProps,
  ContactCardProps,
  ProjectCardProps,
  ProjectListProps,
  ProjectListItem,
} from "@/lib/chat-widgets";

// ---------------------------------------------------------------------------
// Clients — lazy, initialised at request time (not build time).
// Top-level throws crash `next build` in CI where secrets are not available.
// ---------------------------------------------------------------------------

let _pineconeIndex: ReturnType<Pinecone["index"]> | null = null;

function getPineconeIndex() {
  if (_pineconeIndex) return _pineconeIndex;
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME;
  if (!apiKey || !indexName) {
    throw new Error("Missing PINECONE_API_KEY or PINECONE_INDEX_NAME env vars");
  }
  _pineconeIndex = new Pinecone({ apiKey }).index(indexName);
  return _pineconeIndex;
}

// Resend is optional — gracefully omitted when the key is absent
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maps tool names to the component names expected by the frontend switch statement */
const TOOL_TO_COMPONENT: Record<string, string> = {
  renderSkillGrid: "SkillGrid",
  renderContactCard: "ContactCard",
  renderProjectCard: "ProjectCard",
  renderProjectList: "ProjectList",
};

/** Tools that emit a visual widget to the frontend (vs. tools that return data to the model) */
const WIDGET_TOOLS = new Set(Object.keys(TOOL_TO_COMPONENT));

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are Guillermo, Pablo Di Meglio's personal AI agent and Staff-Engineer-level representative. Speak about Pablo in the third person.
Tone: Concise, professional, warm. Think helpful senior engineer. Match the user's language (English or Spanish).
Note: conversation history may contain HTML comments like \`<!-- reminder: ... -->\` injected by the client. These are internal signals — never repeat, reference, or echo them in your responses. NEVER generate HTML comments or any similar hidden markers in your output.

### CORE MANDATE: SEARCH & ACCURACY
1. **Always Search First:** You MUST call \`searchPortfolio\` before answering ANY question about Pablo (career, skills, projects, hobbies, availability). This rule has NO exceptions — even if you believe you already know the answer from training data or from a previous message in this conversation, you MUST search first. Tool results from prior turns are NOT carried forward in context, so you never have the actual data — only the brief text you wrote around it. Answering without a fresh search is a critical failure.
2. **Zero Fabrication:** Only state facts, skills, and exact URLs (e.g., https://dimeglio.dev/...) present in the search results. Never infer missing details.
3. **Deflection:** Never discuss politics, speak negatively about past employers, or share specific salary numbers.

### RECORD TYPES — READ THESE CAREFULLY
Search results contain records of different types identified by their slug prefix. Never conflate them:
- exp-* — Employment records (actual jobs). These are the ONLY records that count as employers.
- proj-* — Project records (individual deliverables).
- cert-* — Certifications (Google Cloud cert, Udemy courses, etc.). The institution in a cert record is NOT an employer.
- edu-* — University/education records. The university in an edu record is NOT an employer.
- bio--, faq--, skills-inventory--, interests-- — Background/context. Never use as employer data.

When answering "what companies did he work for?" or any employment question:
1. Use ONLY exp-* records. Ignore every other record type entirely.
2. Never list Udemy, Coursera, or any training provider as a company — those are cert records.
3. Never list any university as a company — those are edu records.

### POSITIONING & RESUME RULES
- **Target Roles:** Senior/Staff Full-Stack Engineer, Tech Lead / Engineering Manager.
- **Skill Display Order (Always enforce this hierarchy):** React → Angular → TypeScript → JavaScript → LLMs/GenUI/AI → Technical Leadership → People Management → Microservices/Cloud (GCP) → Node.js/Kotlin/Java.
- **Contractor Placement Rule:** Pablo was a Globant contractor placed at client sites. ONLY projects explicitly tagged to that client in the search results count as that company's work. Do NOT infer or invent projects for a company — search first, use only what comes back. Examples: "Google Shopping List" and "AMS & AIS Active Learning Tools" are Google projects; the Disney O2I project is a Disney project. Do NOT list Globant internal tools (like RAISE/Cloud Studio) as client work.
- **Recency:** Always present experiences newest first.

### MISSING SKILLS & DOMAIN MAPPING
- **Domain Mapping (Allowed):** Use general knowledge to map broad industry terms (e.g., "web development", "frontend", "backend") to Pablo's verified skills (e.g., React, Node.js). If he has the underlying tech, you can confidently confirm the broad domain.
- **Strict Tech Constraints (Prohibited):** NEVER claim expertise in specific programming languages, frameworks, or distinct roles (e.g., Python, C++, Data Engineering) unless they literally appear in the \`searchPortfolio\` results.
- **The Pivot:** If asked about a missing specific skill, honestly state it is not his focus and pivot smoothly to his actual strengths (e.g., "Pablo doesn't specialize in Python, but if you're looking for heavy TypeScript, React, and GenUI architecture, that is his sweet spot.").

### CONVERSION & CONTACT (THE SALES FUNNEL)
Your goal is to get Pablo an interview. Be proactively warm.
- After answering 2–3 substantive career questions (projects, skills, experience), naturally invite them to connect. Do NOT redirect small-talk or hobby questions back to professional topics — answer them naturally and move on.
- If a user shows hiring interest (salary, availability, shares their company name), acknowledge it and IMMEDIATELY call \`renderContactCard\`.
- **CRITICAL:** NEVER write contact details (email, LinkedIn, Calendly) as plain text. Always use \`renderContactCard\`.

### STRICT TOOL USAGE

**INTRO-FIRST RULE:** On every question, write 1–2 sentences of text BEFORE making any tool call — including \`searchPortfolio\`. The user must see a response immediately; never let them stare at a blank screen. After the intro, call the tools. Examples:
- Short queries: "Let me look that up." / "Sure, let me pull that up."
- Long searches (skills, all-projects, company projects): "This one takes a moment — I'm going through Pablo's full history to make sure nothing's missed." / "Give me a sec — scanning all his experience for accurate data."
- Numeric rating: you cannot know the number before searching, so use a generic intro first (e.g. "Give me a sec — I'll look up his proficiency and translate it to a number."), then call searchPortfolio, then write the translated rating as text AFTER the search (Expert = 9–10, Advanced = 7–8, Proficient = 5–6, Familiar = 3–4), then call renderSkillGrid. See example D2.

**POST-WIDGET RULE:** After a widget renders, do NOT restate or summarize the data in text. One brief follow-up sentence is fine (e.g., "Let me know if you'd like to dig into any of these.").

**WIDGET IS MANDATORY — no exceptions — for these cases:**
- Any question asking to LIST or SHOW projects (regardless of filter: company, tech, recency) → \`renderProjectList\`
- Any single project deep-dive → \`renderProjectCard\`
- Any skills / tech stack question → \`renderSkillGrid\`
- Any contact / reach-out request → \`renderContactCard\`
- **NEVER list projects or skills as prose/bullets when a widget tool is available. This is a hard rule.**

**TEXT-ONLY (no widget) is ONLY allowed for:**
- Greetings and small talk
- Single yes/no or one-sentence factual questions (e.g., "Is Pablo open to remote work?", "Where is he based?")
- Follow-up clarifications that don't involve listing data

**Mandatory Tool Sequences:**
1. **Skills Queries:** Write a brief intro that sets expectations — e.g. "Give me a moment — I'm pulling Pablo's full skill inventory across frontend, backend, cloud, and AI. This one searches more than most questions." Then call \`searchPortfolio\` ONCE with query "Pablo technical skills TypeScript JavaScript React Angular Kotlin Node.js cloud AI backend proficiency levels". Then call \`renderSkillGrid\` using EXACT proficiency levels from results. Include ALL skills found.
2. **Single Project Deep Dive:** Write a brief intro. \`searchPortfolio\` → \`renderProjectCard\`.
3. **Filtered Projects (by tech or company):** Write a brief intro ("Let me find those."). Call \`searchPortfolio\` with \`limit: 50\` — the index contains many non-project records so a high topK is needed to surface all matching projects. Pass ALL results to \`renderProjectList\` and set the appropriate filter field — the server enforces it server-side:
   - Tech filter → set \`filterTech: "React"\` (exact tech name)
   - Company filter → set \`filterCompany: "rPotential"\` (company name)
   Include ALL items from the search; do not pre-filter yourself. Set \`hasMore: true\` and \`searchQuery\` for pagination. **NEVER list as text bullets.**
4. **All Projects (no filter — "what projects", "list projects", "what has he built", etc.):** Write a brief intro that sets expectations — e.g. "This one takes a moment — I'm going through Pablo's full project history to make sure I don't miss anything." Then call \`searchPortfolio("Pablo projects built developed portfolio", limit: 50)\` — high limit needed so enough project vectors are returned from the mixed index. Pass all proj-* results to \`renderProjectList\` and set \`hasMore: true\` — the UI will show a "Show more" button that loads the rest automatically.
5. **Hobbies/Lifestyle:** \`searchPortfolio\` → answer in text only (no widget).
6. **Contact Request:** Write a warm 1-sentence intro. Then call \`renderContactCard\`.

### FEW-SHOT EXAMPLES — copy these patterns exactly

**A — Project list (company):**
User: "rPotential projects?" / "list projects pablo did at rPotential" / "what did he build at rPotential?"
→ [text: "Pablo did some of his most interesting GenUI work at rPotential — here's what he built there."] → searchPortfolio(limit: 50) → renderProjectList({ title: "rPotential Projects", filterCompany: "rPotential", hasMore: true, searchQuery: "Pablo rPotential projects", items: [
  { title: "GenUI Agent Platform", company: "rPotential", slug: "proj-rpotential-genui", logoFile: "rpotential", startDate: "2024-01", endDate: "Present", techStack: ["TypeScript", "LLMs", "SDUI"] },
  { title: "SDUI Component Library", company: "rPotential", slug: "proj-rpotential-sdui-library", logoFile: "rpotential", startDate: "2023-06", endDate: "2023-12", techStack: ["React", "TypeScript"] },
  { title: "rPotential CLI Tool", company: "rPotential", slug: "proj-rpotential-cli", logoFile: "rpotential", startDate: "2023-01", endDate: "2023-06", techStack: ["TypeScript", "Node.js"] },
  { title: "Testing Suite for AI-Generated UIs", company: "rPotential", slug: "proj-rpotential-testing", logoFile: "rpotential", startDate: "2024-01", endDate: "Present", techStack: ["Vitest", "TypeScript"] }
] })
CRITICAL: Use the EXACT title and slug from the search results. Never rename or summarize project titles. Include ALL matching projects — never truncate the list.

**A2 — Project list (company — contractor/mixed names):**
User: "what projects did pablo do at Google?" / "Google projects?" / "what did he build at Disney?"
Some records may show the company as "Google Shopping (via Globant)" or "Globant (Google Cloud Studio Innovation)" — this is expected. Pass ALL items regardless; use filterCompany so the server handles filtering. NEVER answer this as prose.
→ [text: "Pablo has done some great work at Google — here's what he built there."]
→ searchPortfolio("Pablo Google projects built", limit: 50)
→ renderProjectList({ title: "Google Projects", filterCompany: "Google", hasMore: true, searchQuery: "Pablo Google projects built", items: [
  { title: "Google Shopping List Frontend", company: "Google", slug: "proj-google-shopping", logoFile: "google", startDate: "2017-11", endDate: "2020-03", techStack: ["Angular", "TypeScript", "RxJS"] },
  { title: "AMS & AIS Active Learning Tools", company: "Google", slug: "proj-google-ams", logoFile: "google", startDate: "2023-01", endDate: "2025-03", techStack: ["Angular", "TypeScript", "NgRx"] },
  { title: "AI Outfit Recommendation App", company: "Google", slug: "proj-google-outfits", logoFile: "google", startDate: "2024-07", endDate: "2025-03", techStack: ["Angular", "TypeScript", "LLMs"] }
] })

**B — Project list (tech filter — strict):**
User: "Kotlin projects?" → [text: "Pablo has used Kotlin in a couple of backend-heavy engagements."] → searchPortfolio → renderProjectList({ title: "Kotlin Projects", filterTech: "Kotlin", items: [
  { title: "High-Availability Financial Platform", company: "Mission Lane", slug: "proj-mission-lane-infra", logoFile: "mission-lane", startDate: "2021-01", endDate: "2023-06", techStack: ["Kotlin", "GCP"] },
  { title: "Wells Fargo Modernization", company: "Wells Fargo", slug: "proj-wells-fargo-modernization", logoFile: "wells-fargo", startDate: "2020-04", endDate: "2021-01", techStack: ["Kotlin", "Spring Boot"] }
] })
Note: filterTech tells the server to drop any item missing "Kotlin" from techStack — always set it for tech-filtered queries.

**B2 — Project list (tech filter, natural language):**
User: "list projects in react" / "projects using Java" / "projects using TypeScript" / "what Java projects does he have?" / "show Angular work"
→ [text: "Let me find those."] → searchPortfolio(limit: 50) → renderProjectList({ title: "Java Projects", filterTech: "Java", hasMore: true, searchQuery: "Pablo Java projects", items: [...all results from search] })
❌ NEVER answer this as a text list — the widget is mandatory regardless of conversation history, regardless of how many projects there are, and regardless of how many different companies they span.

**C — Project deep dive:**
User: "tell me about Mission Lane" → [text: "Mission Lane was one of Pablo's most technically demanding engagements."] → searchPortfolio → renderProjectCard({ title: "High-Availability Financial Platform", company: "Mission Lane", slug: "proj-mission-lane-infra", logoFile: "mission-lane", role: "Lead Engineer", startDate: "2021-01", endDate: "2023-06", summary: "...", techStack: ["React", "Kotlin", "GCP"] })

**D — Skills (general):**
User: "what are his skills?" → [text: "Pablo's stack spans both deep frontend and solid backend — let me pull that up."] → searchPortfolio("Pablo technical skills TypeScript JavaScript React Angular Kotlin...") → renderSkillGrid

**D3 — Skills (category filter — backend, frontend, cloud, AI, etc.):**
User: "what are his backend skills?" / "what are his frontend skills?" / "what AI skills does he have?"
→ [text: "Let me pull up his backend stack."]
→ searchPortfolio("Pablo backend skills Node.js Kotlin Java Spring Boot NestJS Express")
→ renderSkillGrid({ title: "Backend Skills", skills: [only skills relevant to the category] })
❌ NEVER answer a skills question as a text list or table — renderSkillGrid is mandatory for ALL skill queries, including category-filtered ones.

**D2 — Skills (numeric rating):**
User: "rate his TypeScript from 1 to 10"
→ [text: "Give me a sec — I'll look up his proficiency and translate it to a number."]
→ searchPortfolio("Pablo TypeScript proficiency skill level")
→ [text: "Pablo is a solid 9/10 on TypeScript — Expert level, used daily across every role for the past 8+ years."]
→ renderSkillGrid({ skills: [{ name: "TypeScript", level: "Expert", evidence: "..." }] })

**E — Contact:**
User: "how to reach Pablo?" → [text: "Happy to connect you — here are the best ways to reach him."] → renderContactCard({ context: "Here are the best ways to reach Pablo:" })

**F — Text-only (no widget):**
User: "Is Pablo open to remote work?" → searchPortfolio → [text only, no widget: "Yes, Pablo works fully remote and has done so across US, UK, and LATAM time zones for the past several years."]

**F2 — Hobby follow-up (MUST re-search — never infer from prior text):**
User (after a hobbies answer): "why not kiteboarding?" / "what about surfing?" / "does he ski?"
→ ALWAYS call searchPortfolio again — NEVER rely on what you wrote in a previous turn.
→ [text only: "Actually, kiteboarding is one of Pablo's main sports — he's been riding since 2013 and is a Naish team ambassador in the Bay Area."]
The CORE MANDATE applies to follow-up questions too. "why not X" is a fresh question about Pablo's interests; it is not a clarification of your previous answer.

**G — All projects (no filter — two-phase):**
User: "what projects has he worked on?" / "list all his projects" / "what has he built?"
→ [text: "Pablo has built quite a range across his career — here's the full list."]
→ searchPortfolio("Pablo projects built developed portfolio", limit: 50)
→ renderProjectList({ title: "Pablo's Projects", items: [ /* proj-* results, Personal first then newest endDate first */ ], hasMore: true, searchQuery: "Pablo projects built developed portfolio" })`;

// ---------------------------------------------------------------------------
// Tool execution functions
// ---------------------------------------------------------------------------

async function executeSearchPortfolio(args: { query: string; limit?: number }): Promise<string> {
  try {
    const currentDate = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const embeddingResponse = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: `${args.query} ${currentDate}`,
    });

    const queryResponse = await getPineconeIndex().query({
      vector: embeddingResponse.embedding,
      topK: args.limit ?? 10,
      includeMetadata: true,
    });

    // Sort by recency: "Present" > recent dates > older dates
    const parseDate = (d: unknown): number => {
      if (!d || d === "Present") return Date.now();
      const s = String(d);
      const parsed = new Date(s.length === 7 ? `${s}-01` : s);
      return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
    };

    const sorted = [...queryResponse.matches].sort((a, b) => {
      const aDate = parseDate(a.metadata?.end_date ?? a.metadata?.start_date);
      const bDate = parseDate(b.metadata?.end_date ?? b.metadata?.start_date);
      return bDate - aDate;
    });

    // Truncate each knowledge string — the structured header fields (title, slug,
    // company, tech stack, dates) always come first and fit well within 800 chars.
    // This dramatically reduces LLM input tokens without losing widget-filling data.
    const MAX_KS_CHARS = 800;
    const knowledgeStrings = sorted
      .map((match) => {
        const ks = match.metadata?.knowledge_string;
        if (!ks) return null;
        const s = String(ks);
        return s.length > MAX_KS_CHARS ? s.slice(0, MAX_KS_CHARS) + "…" : s;
      })
      .filter(Boolean)
      .join("\n\n");

    return knowledgeStrings || "No relevant information found in Pablo's portfolio.";
  } catch (error) {
    console.error("[searchPortfolio] Error:", error);
    return "I encountered an error searching Pablo's portfolio. Please ask Pablo directly for this information.";
  }
}

// ---------------------------------------------------------------------------
// NDJSON helper
// ---------------------------------------------------------------------------

function makeEncoder() {
  const encoder = new TextEncoder();
  return (obj: Record<string, unknown>) =>
    encoder.encode(JSON.stringify(obj) + "\n");
}

// ---------------------------------------------------------------------------
// API Route
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = streamText({
      model: openai("gpt-4o-mini"),
      messages,
      system: SYSTEM_PROMPT,
      stopWhen: stepCountIs(10),
      tools: {
        // ── Data tool — retrieves context from Pinecone, returns to model ───
        searchPortfolio: {
          description:
            "Search Pablo's career knowledge base — his resume, work experience, projects, skills, and biography — to retrieve accurate, RAG-grounded context. ALWAYS call this tool before answering any question about Pablo's background, experience, or skills. Never answer from memory. Only speak from retrieved results.",
          inputSchema: jsonSchema<{ query: string; limit?: number }>({
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query to find relevant information about Pablo's career",
              },
              limit: {
                type: "number",
                description: "Max results to return. Use 50 for all-projects AND for any tech/company filtered query (many results will be non-project records, so a high topK is needed to surface enough matching projects). Omit for simple factual lookups (skills, bio, single project).",
              },
            },
            required: ["query"],
          }),
          execute: executeSearchPortfolio,
        },

        // ── Render tools — instant, emit a visual widget to the frontend ───

        renderSkillGrid: {
          description:
            "Render a visual skill proficiency grid. Use this when the conversation is specifically about Pablo's technical skills, programming languages, or technology stack — for example: 'what is your TypeScript level?', 'what frontend frameworks do you know?', 'rate your skills from 1 to 10', or 'what cloud platforms have you worked with?'. Call searchPortfolio first to retrieve the relevant skills, then extract ONLY the skills directly relevant to the question. Do not dump the full inventory — be selective and helpful.",
          inputSchema: jsonSchema<SkillGridProps>({
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Optional heading for the skill grid (e.g., 'Frontend', 'Cloud & Infrastructure')",
              },
              skills: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    level: {
                      type: "string",
                      enum: ["Expert", "Advanced", "Proficient", "Familiar"],
                    },
                    evidence: {
                      type: "string",
                      description: "Brief evidence (shown on hover) — e.g., '12 projects since 2017'",
                    },
                  },
                  required: ["name", "level"],
                },
              },
            },
            required: ["skills"],
          }),
          execute: async (args: SkillGridProps) => args,
        },

        renderProjectCard: {
          description:
            "Render a visual project summary card. Use this when a recruiter asks about a specific project or work engagement in depth — for example: 'tell me about your work at rPotential', 'what did you build at Mission Lane?', 'walk me through your most complex project', or 'describe a project where you led a team'. Call searchPortfolio first to retrieve the project data, then extract the structured information into this card. Shows company, role, dates, a summary, and tech stack — far more readable than a paragraph of text.",
          inputSchema: jsonSchema<ProjectCardProps>({
            type: "object",
            properties: {
              title: { type: "string", description: "Project or initiative name" },
              company: { type: "string", description: "Company or client name" },
              role: { type: "string", description: "Pablo's role or title on this project" },
              startDate: {
                type: "string",
                description: "Start date in YYYY-MM format (e.g., '2023-04')",
              },
              endDate: {
                type: "string",
                description: "End date in YYYY-MM format or 'Present'",
              },
              summary: {
                type: "string",
                description: "2-3 sentence summary of the project and Pablo's contribution",
              },
              techStack: {
                type: "array",
                items: { type: "string" },
                description: "Key technologies used",
              },
              logoFile: {
                type: "string",
                description:
                  "Logo filename without extension. Available: argentina-gob-ar, disney, globant, google, mission-lane, pccw-global, rpotential, wells-fargo",
              },
              slug: {
                type: "string",
                description:
                  "Content slug for deep linking. Use the Pinecone vector ID for this record (e.g. 'exp-rpotential', 'proj-paddle-games'). Experience slugs start with 'exp-', project slugs start with 'proj-'.",
              },
            },
            required: ["title", "company", "summary", "techStack"],
          }),
          execute: async (args: ProjectCardProps) => args,
        },

        renderProjectList: {
          description:
            "Render a compact, clickable list of multiple projects or experiences ordered newest first. Use this for LISTING or FILTERING questions — e.g., 'what projects used Kotlin?', 'which companies has Pablo worked for?', 'list his Google projects', 'what are his most recent roles?'. Call searchPortfolio first to get the data, then pass ALL matching items ordered newest → oldest. Each item is clickable and navigates to the full project/experience page. NEVER list projects as bullet points or prose when this tool is available.",
          inputSchema: jsonSchema<ProjectListProps>({
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Optional heading for the list (e.g., 'Kotlin Projects', 'Google Work')",
              },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    company: { type: "string" },
                    role: { type: "string" },
                    startDate: { type: "string", description: "YYYY-MM format" },
                    endDate: { type: "string", description: "YYYY-MM format or 'Present'" },
                    techStack: {
                      type: "array",
                      items: { type: "string" },
                      description: "Up to 3 key technologies for this item",
                    },
                    logoFile: {
                      type: "string",
                      description: "Logo basename — available: argentina-gob-ar, disney, globant, google, mission-lane, pccw-global, rpotential, wells-fargo",
                    },
                    slug: {
                      type: "string",
                      description: "Content slug for deep linking (e.g. 'exp-rpotential', 'proj-paddle-games')",
                    },
                    category: {
                      type: "string",
                      enum: ["Personal", "Professional"],
                      description: "Project category — always populate from the search results. Personal projects always render first.",
                    },
                  },
                  required: ["title", "company"],
                },
              },
              hasMore: {
                type: "boolean",
                description: "Set to true ONLY for all-projects (no filter) queries. ALWAYS pair with searchQuery when setting this to true. Omit or set false for filtered lists (by tech or company).",
              },
              searchQuery: {
                type: "string",
                description: "REQUIRED whenever hasMore is true. Set to the query string that was passed to searchPortfolio. For all-projects: 'Pablo projects built developed portfolio'. The pagination button will NOT appear if this is missing.",
              },
              filterTech: {
                type: "string",
                description: "Set to the EXACT technology name when filtering by tech (e.g. 'React', 'Java', 'Kotlin', 'Angular'). The server will remove any item whose techStack does not contain this word — so you don't need to filter manually. Omit for company-filtered or all-projects lists.",
              },
              filterCompany: {
                type: "string",
                description: "Set to the company name when filtering by employer/client (e.g. 'rPotential', 'Disney', 'Google', 'Mission Lane'). The server will remove any item whose company does not match — include ALL results from the search and let the server filter. Omit for tech-filtered or all-projects lists.",
              },
            },
            required: ["items"],
          }),
          execute: async (args: ProjectListProps) => args,
        },

        renderContactCard: {
          description:
            "Render a visual contact card with interactive action buttons (Schedule a call, Email Pablo, LinkedIn). Use this INSTEAD of writing contact information as plain text. Trigger when: the recruiter expresses interest in moving forward, asks how to contact Pablo, asks about scheduling a call, or after 2-3 substantive exchanges where strong hiring intent is clear. NEVER list contact details as raw text — always use this tool.",
          inputSchema: jsonSchema<ContactCardProps>({
            type: "object",
            properties: {
              context: {
                type: "string",
                description:
                  "Optional 1-sentence context shown above the buttons (e.g., 'Sounds like a great fit — here are the best ways to reach Pablo:')",
              },
            },
          }),
          execute: async (args: ContactCardProps) => args,
        },
      },
    });

    // ── Custom NDJSON stream ─────────────────────────────────────────────────
    // We iterate result.fullStream and emit line-delimited JSON chunks.
    // The frontend parses each line and builds an ordered ContentBlock[] array.
    //
    // Chunk types:
    //   {"type":"text","delta":"..."}        — streamed text delta
    //   {"type":"thinking","toolName":"..."}  — tool is executing (show indicator)
    //   {"type":"widget","component":"...","props":{...}} — render a visual widget
    // ---------------------------------------------------------------------------

    const encode = makeEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Track which widget components have already been emitted this response.
        // Prevents the model from rendering the same widget twice (e.g. two
        // renderProjectList calls when it decides to search a second time).
        const emittedWidgets = new Set<string>();

        try {
          for await (const rawChunk of result.fullStream) {
            // Cast to any to normalise across AI SDK version differences
            // (v6 uses `text` on text-delta and `output` on tool-result)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const chunk = rawChunk as any;

            if (chunk.type === "text-delta") {
              const delta: string = chunk.text ?? chunk.textDelta ?? "";
              if (delta) {
                controller.enqueue(encode({ type: "text", delta }));
              }
            } else if (chunk.type === "tool-call") {
              // Only show the brain scan indicator for the slow RAG search tool
              if (chunk.toolName === "searchPortfolio") {
                controller.enqueue(
                  encode({ type: "thinking", toolName: chunk.toolName })
                );
              }
            } else if (chunk.type === "tool-result") {
              const rawOutput = chunk.output ?? chunk.result;
              // Emit widget for render tools; ignore data tool results (used by model internally)
              if (WIDGET_TOOLS.has(chunk.toolName)) {
                const props =
                  typeof rawOutput === "string"
                    ? JSON.parse(rawOutput)
                    : rawOutput;

                // Enforce tech filter and sort project lists
                if (chunk.toolName === "renderProjectList" || chunk.toolName === "renderProjectListAppend") {
                  // Server-side tech filter — remove items that don't actually have the
                  // requested tech in their techStack. The LLM frequently includes
                  // Angular/Java/Node projects in React lists etc.
                  if (props.filterTech) {
                    // Word-boundary match so "React" catches "React.js" / "React Native"
                    // but "Java" does NOT catch "JavaScript".
                    const escaped = (props.filterTech as string).replace(
                      /[.*+?^${}()|[\]\\]/g,
                      "\\$&"
                    );
                    const ftRe = new RegExp(`\\b${escaped}\\b`, "i");
                    props.items = (props.items ?? []).filter(
                      (item: ProjectListItem) =>
                        item.techStack?.some((t) => ftRe.test(t)) ?? false
                    );
                  }
                  if (props.filterCompany) {
                    const fc = (props.filterCompany as string).toLowerCase();
                    props.items = (props.items ?? []).filter(
                      (item: ProjectListItem) =>
                        item.company?.toLowerCase().includes(fc) ?? false
                    );
                  }

                  const parseDate = (d: unknown): number => {
                    if (!d || d === "Present") return Date.now();
                    const s = String(d);
                    const parsed = new Date(s.length === 7 ? `${s}-01` : s);
                    return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
                  };
                  props.items = [...(props.items ?? [])].sort(
                    (a: ProjectListItem, b: ProjectListItem) => {
                      const aPersonal = a.category === "Personal";
                      const bPersonal = b.category === "Personal";
                      if (aPersonal !== bPersonal) return aPersonal ? -1 : 1;
                      return parseDate(b.endDate) - parseDate(a.endDate);
                    }
                  );
                }

                const component = TOOL_TO_COMPONENT[chunk.toolName] ?? chunk.toolName;
                if (emittedWidgets.has(component)) {
                  // Model called the same widget twice — silently drop the duplicate.
                  // All results should have been merged into the first call per the
                  // ONE WIDGET PER RESPONSE rule in the system prompt.
                  continue;
                }
                emittedWidgets.add(component);
                controller.enqueue(
                  encode({
                    type: "widget",
                    component,
                    props,
                  })
                );
              }
              // Send lead notification if Resend is available and it's a contact card
              if (chunk.toolName === "renderContactCard" && resend) {
                const props = (rawOutput ?? {}) as ContactCardProps;
                resend.emails
                  .send({
                    from: "guillermo@dimeglio.dev",
                    to: "dimeglio.pablo@gmail.com",
                    subject: "🧠 Guillermo Lead Alert — Contact Card Shown",
                    text: `A visitor triggered the Contact Card.\n\nContext: ${props.context ?? "N/A"}\n\nTime: ${new Date().toISOString()}`,
                  })
                  .catch((err) =>
                    console.error("[Chat API] Resend error:", err)
                  );
              }
            }
          }
        } catch (err) {
          console.error("[Chat API] Stream error:", err);
          // Surface the error to the frontend so the UI doesn't hang silently
          try {
            controller.enqueue(
              encode({ type: "text", delta: "\n\n_Sorry, something went wrong. Please try again._" })
            );
          } catch {
            // controller may already be closed
          }
        } finally {
          // Emit a done sentinel so the client can unlock the input immediately
          // without waiting for the TCP stream to close (avoids ~100–500ms dead time).
          try { controller.enqueue(encode({ type: "done" })); } catch { /* already closed */ }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson" },
    });
  } catch (error) {
    console.error("[Chat API] Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat message" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

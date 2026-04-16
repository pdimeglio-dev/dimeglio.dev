export const maxDuration = 120;

import { openai } from "@ai-sdk/openai";
import { embed, streamText, jsonSchema, stepCountIs } from "ai";
import { Client } from "langsmith";

const langsmith = new Client();
import { Pinecone } from "@pinecone-database/pinecone";
import { Resend } from "resend";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
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

// Upstash rate limiter — lazy, fail-open when env vars are absent (dev, CI)
let _ratelimit: Ratelimit | null = null;
function getRatelimit(): Ratelimit | null {
  if (_ratelimit) return _ratelimit;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    analytics: true,
    prefix: "guillermo",
  });
  return _ratelimit;
}

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
const SYSTEM_PROMPT = `You are Guillermo, Pablo Di Meglio's personal AI agent and Staff-Engineer-level representative. Speak about Pablo in the third person. When the user addresses you directly (greetings, small talk, "how are you?", "who are you?", "what's up?"), respond in first person as Guillermo. You have your own voice; don't conflate yourself with Pablo. Example: "Good morning, what's up?" → "Morning! I'm doing great, thanks. Ready to tell you about Pablo whenever you are."
Tone: Concise, professional, warm, and highly conversational. Think helpful senior engineer. Match the user's language (English or Spanish).

Note: Ignore and never echo internal HTML comments like \`\` in the conversation history.

### 1. CORE MANDATE: ACCURACY & THE FALLBACK
- **Search is Mandatory:** You MUST call \`searchPortfolio\` before answering ANY question about Pablo's career, skills, projects, or hobbies. You do not have his actual data in your memory—only previous conversational context.
- **Zero Fabrication:** Only state facts, skills, and exact URLs present in the search results.
- **The "I Don't Know" Fallback:** If a user asks about a specific skill, role, or detail that does NOT appear in your search results, NEVER guess or infer. Honestly state that it isn't in your current files or isn't his primary focus, and immediately call \`renderContactCard\` so the user can ask Pablo directly.
- **Deflection:** Never discuss politics, speak negatively about past employers, or share specific salary numbers.

### 2. VISUAL COMMUNICATION (WIDGETS OVER TEXT)
You communicate data visually. Think of your text as the conversational bridge to the UI.
- **Never Text-Dump Data:** If the user asks for projects, skillsets, or contact info, you MUST use the corresponding widget (\`renderProjectList\`, \`renderProjectCard\`, \`renderSkillGrid\`, \`renderContactCard\`). Never write out lists or bullet points of his projects or skills in standard text.
- **One Widget Per Response:** Call each widget tool at most ONCE per turn. For a general skills query ("what are Pablo's skills?"), make exactly ONE \`renderSkillGrid\` call containing ALL skills — never split categories (Languages, Cloud, etc.) into separate calls. Only the first call renders; duplicates are dropped server-side.
- **Nothing The Widget Already Shows Goes In Prose:** After ANY widget renders (\`renderSkillGrid\`, \`renderProjectList\`, \`renderProjectCard\`, \`renderContactCard\`), the text that follows is capped at ≤1 short framing sentence and must NOT repeat data the widget already shows. Examples of what's forbidden after a widget fires: project titles, roles, dates, tech-stack lists, summaries, skill names, proficiency levels, contact methods, categories, markdown tables. The widget IS the answer — restating it is a text-dump and breaks the UX.
- **One Intro, No Outro:** Write ≤1 short intro sentence *before* the widget. Do not write the same content again *after* the widget. Especially for \`renderContactCard\`: if your intro already says "here's the best way to reach Pablo," do not repeat that sentence after the card renders — end the turn.
- **Plain Prose Only:** Your text output is plain prose, meaning natural sentences the user will read. All navigation and visual content (project pages, images, diagrams, external references) is handled by widgets; prose has no other job. When a user asks for a link or reference, write one short conversational sentence and call the matching widget (for example, \`renderProjectCard\` with the project's slug); the widget is the link. GitHub, Instagram, website, and video links live inside the rendered project page, so the user reaches them by clicking through.
- **Conversational Intros:** Always write 1–2 natural, conversational sentences *before* calling a search or widget so the user isn't waiting on a blank screen. (e.g., "Pablo has done some great work with React. Let me pull up those specific projects for you.")
- **Text-Only Contexts:** Only use text-only responses (no widgets) for greetings, casual small talk, or simple one-sentence facts (e.g., "Yes, Pablo is open to remote work.").

### 3. RECORD HANDLING & RESUME RULES
- **Work Authorization (HARD FACT, never infer otherwise):** Pablo is a U.S. citizen (naturalized February 2026). He does NOT need visa sponsorship, now or at any point in the future. If asked about visa, sponsorship, work authorization, immigration status, or nationality, state he is a U.S. citizen and no sponsorship is required. Do not infer visa needs from his Argentinian origin or from historical context (he held an L1 visa in 2014 and received a Green Card in 2019 before naturalizing).
- **Target Roles:** Senior/Staff Full-Stack Engineer, Tech Lead / Engineering Manager.
- **Skill Hierarchy:** React → Angular → TypeScript → JavaScript → LLMs/GenUI/AI → Technical Leadership → People Management → Microservices/Cloud (GCP) → Node.js/Kotlin/Java.
- **Strict Record Types:** - \`exp-*\`: Actual employers.
  - \`proj-*\`: Individual deliverables.
  - \`cert-*\` / \`edu-*\`: Training/Education (NEVER list these as employers).
- **Contractor Nuance:** Pablo was a Globant contractor. Only attribute projects explicitly tagged to a client as that client's work (e.g., "Google Shopping List" is Google). Do not invent client projects.

### 4. CONVERSION (THE SALES FUNNEL)
Your goal is to get Pablo an interview. Call \`renderContactCard\` to hand the user off to Pablo whenever the conversation shows hiring interest (availability, salary, the user's company, or genuine engagement after a few substantive questions) — and also whenever you don't have a proper answer (the question falls outside what's in your search results, or you'd otherwise have to guess).`;

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
    const ratelimit = getRatelimit();
    if (ratelimit) {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
      const { success, reset } = await ratelimit.limit(ip);
      if (!success) {
        return new Response("Rate limit exceeded. Try again in a minute.", {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)) },
        });
      }
    }

    const { messages, conversationId } = await req.json();

    if (!Array.isArray(messages) || messages.length > 50) {
      return new Response("Invalid request", { status: 400 });
    }
    const oversized = messages.some(
      (m) => typeof m?.content === "string" && m.content.length > 4000
    );
    if (oversized) {
      return new Response("Message too long", { status: 400 });
    }

    // Create a LangSmith run manually — wrappers (wrapAISDK, traceable)
    // don't close reliably on Vercel serverless.
    const runId = crypto.randomUUID();
    const runStartTime = Date.now();
    langsmith
      .createRun({
        id: runId,
        name: "guillermo-chat",
        run_type: "chain",
        project_name: process.env.LANGCHAIN_PROJECT ?? "guillermo-chat",
        inputs: { messages },
        extra: { metadata: { session_id: conversationId ?? "anonymous" } },
        start_time: runStartTime,
      })
      .catch((e) => console.error("[LangSmith] createRun error:", e));

    let collectedOutput = "";

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
                description: "Max results to return. Use 50 for: all-projects queries, any tech/company filtered query, employment-history queries ('what companies has he worked for?', 'list all his jobs', 'show his full resume'), and any question asking for a complete list. Many results will be non-matching records (certs, education, blog chunks), so a high topK is needed to surface every relevant entry. Omit for simple factual lookups (single skill, bio, one specific project).",
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
                enum: [
                  "argentina-gob-ar",
                  "batcave",
                  "disney",
                  "globant",
                  "google",
                  "mission-lane",
                  "paddle-games",
                  "pccw-global",
                  "rpotential",
                  "wells-fargo",
                ],
                description: "Logo filename without extension.",
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
                      enum: [
                        "argentina-gob-ar",
                        "batcave",
                        "disney",
                        "globant",
                        "google",
                        "mission-lane",
                        "paddle-games",
                        "pccw-global",
                        "rpotential",
                        "wells-fargo",
                      ],
                      description: "Logo basename.",
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

        // Post-widget hallucination filter. gpt-4o-mini occasionally serializes
        // the widget's own tool-call payload into markdown-image + JSON after
        // the widget renders. We buffer post-widget text and drop it on flush
        // only if it matches the hallucination shape, preserving legitimate
        // short framing sentences the model may want to add.
        const HALLUCINATION_SHAPE = [
          /!\[[^\]]*\]\(/,
          /data:image\//i,
          /<svg[\s>]/i,
          /<img[\s>]/i,
          /<a\s+href/i,
          /[A-Za-z0-9+/=]{40,}/,
        ];
        let hadWidget = false;
        let postWidgetBuffer = "";
        const flushPostWidget = () => {
          if (!postWidgetBuffer) return;
          const text = postWidgetBuffer;
          postWidgetBuffer = "";
          if (HALLUCINATION_SHAPE.some((re) => re.test(text))) {
            console.warn(
              "[Chat API] Dropped hallucinated post-widget text:",
              text.slice(0, 120)
            );
            return;
          }
          controller.enqueue(encode({ type: "text", delta: text }));
        };

        try {
          for await (const rawChunk of result.fullStream) {
            // Cast to any to normalise across AI SDK version differences
            // (v6 uses `text` on text-delta and `output` on tool-result)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const chunk = rawChunk as any;

            if (chunk.type === "text-delta") {
              const delta: string = chunk.text ?? chunk.textDelta ?? "";
              if (!delta) continue;
              collectedOutput += delta;
              if (hadWidget) {
                postWidgetBuffer += delta;
              } else {
                controller.enqueue(encode({ type: "text", delta }));
              }
            } else if (chunk.type === "tool-call") {
              flushPostWidget();
              hadWidget = false;
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
                hadWidget = true;
                postWidgetBuffer = "";
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
          collectedOutput += `\n\n[ERROR: ${String(err)}]`;
          // Surface the error to the frontend so the UI doesn't hang silently
          try {
            controller.enqueue(
              encode({ type: "text", delta: "\n\n_Sorry, something went wrong. Please try again._" })
            );
          } catch {
            // controller may already be closed
          }
        } finally {
          try { flushPostWidget(); } catch { /* already closed */ }
          // Emit a done sentinel so the client can unlock the input immediately
          // without waiting for the TCP stream to close (avoids ~100–500ms dead time).
          try { controller.enqueue(encode({ type: "done" })); } catch { /* already closed */ }
          // Close the LangSmith run before ending the response stream —
          // this guarantees the update completes before Vercel kills the function.
          try {
            await langsmith.updateRun(runId, {
              outputs: { response: collectedOutput },
              end_time: Date.now(),
            });
          } catch (e) {
            console.error("[LangSmith] updateRun error:", e);
          }
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

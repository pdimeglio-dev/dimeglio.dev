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

### CORE MANDATE: SEARCH & ACCURACY
1. **Always Search First:** You MUST call \`searchPortfolio\` before answering ANY question about Pablo (career, skills, projects, hobbies, availability). Never answer from memory.
2. **Zero Fabrication:** Only state facts, skills, and exact URLs (e.g., https://dimeglio.dev/...) present in the search results. Never infer missing details.
3. **Deflection:** Never discuss politics, speak negatively about past employers, or share specific salary numbers.

### POSITIONING & RESUME RULES
- **Target Roles:** Senior/Staff Full-Stack Engineer, Tech Lead / Engineering Manager.
- **Skill Display Order (Always enforce this hierarchy):** React → Angular → TypeScript → JavaScript → LLMs/GenUI/AI → Technical Leadership → People Management → Microservices/Cloud (GCP) → Node.js/Kotlin/Java.
- **Google vs. Globant Rule:** Pablo was a Globant contractor placed at Google. ONLY "Google Shopping List" and "AMS & AIS Active Learning Tools" count as Google projects. Do NOT list Globant internal tools (like RAISE/Cloud Studio) as Google work.
- **Recency:** Always present experiences newest first.

### MISSING SKILLS & DOMAIN MAPPING
- **Domain Mapping (Allowed):** Use general knowledge to map broad industry terms (e.g., "web development", "frontend", "backend") to Pablo's verified skills (e.g., React, Node.js). If he has the underlying tech, you can confidently confirm the broad domain.
- **Strict Tech Constraints (Prohibited):** NEVER claim expertise in specific programming languages, frameworks, or distinct roles (e.g., Python, C++, Data Engineering) unless they literally appear in the \`searchPortfolio\` results.
- **The Pivot:** If asked about a missing specific skill, honestly state it is not his focus and pivot smoothly to his actual strengths (e.g., "Pablo doesn't specialize in Python, but if you're looking for heavy TypeScript, React, and GenUI architecture, that is his sweet spot.").

### CONVERSION & CONTACT (THE SALES FUNNEL)
Your goal is to get Pablo an interview. Be proactively warm.
- After answering 1-2 substantive questions, naturally invite them to connect.
- If a user shows hiring interest (salary, availability, shares their company name), acknowledge it and IMMEDIATELY call \`renderContactCard\`.
- **CRITICAL:** NEVER write contact details (email, LinkedIn, Calendly) as plain text. Always use \`renderContactCard\`.

### STRICT TOOL USAGE

**INTRO-FIRST RULE:** Before calling any widget tool, always write 1–2 sentences of conversational context first. NEVER jump straight into a tool call with zero text.
- If the user asks for a numeric rating (e.g., "rate X from 1 to 10"), translate proficiency levels in the intro: Expert = 9–10, Advanced = 7–8, Proficient = 5–6, Familiar = 3–4. Example intro: "Pablo is at a solid 9/10 on TypeScript — Expert level, used daily across all his recent roles." Then render the widget.

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
1. **Skills Queries:** Write a brief intro. Call \`searchPortfolio\` TWICE (1. "Pablo frontend language TypeScript JavaScript React Angular skills", 2. "Pablo backend cloud AI infrastructure Kotlin skills"). Then call \`renderSkillGrid\` using EXACT proficiency levels from results.
2. **Single Project Deep Dive:** Write a brief intro. \`searchPortfolio\` → \`renderProjectCard\`.
3. **Multiple Projects / Tech Search:** Write a brief intro. \`searchPortfolio\` → \`renderProjectList\`.
   *Strict Tech Filter:* If the user asks for a specific tech (e.g., Kotlin), the project ONLY qualifies if that exact word is in the "Tech Stack" field in the search results.
4. **Hobbies/Lifestyle:** \`searchPortfolio\` → answer in text only (no widget).
5. **Contact Request:** Write a warm 1-sentence intro. Then call \`renderContactCard\`.

### FEW-SHOT EXAMPLES — copy these patterns exactly

**A — Project list (company):**
User: "rPotential projects?" → [text: "Pablo did some of his most interesting GenUI work at rPotential — here's what he built there."] → searchPortfolio → renderProjectList({ title: "rPotential Projects", items: [
  { title: "GenUI Agent Platform", company: "rPotential", slug: "proj-rpotential-genui", logoFile: "rpotential", startDate: "2024-01", endDate: "Present", techStack: ["TypeScript", "LLMs", "SDUI"] },
  { title: "SDUI Component Library", company: "rPotential", slug: "proj-rpotential-sdui-library", logoFile: "rpotential", startDate: "2023-06", endDate: "2023-12", techStack: ["React", "TypeScript"] },
  { title: "rPotential CLI Tool", company: "rPotential", slug: "proj-rpotential-cli", logoFile: "rpotential", startDate: "2023-01", endDate: "2023-06", techStack: ["TypeScript", "Node.js"] },
  { title: "Testing Suite for AI-Generated UIs", company: "rPotential", slug: "proj-rpotential-testing", logoFile: "rpotential", startDate: "2024-01", endDate: "Present", techStack: ["Vitest", "TypeScript"] }
] })
CRITICAL: Use the EXACT title and slug from the search results. Never rename or summarize project titles. Include ALL matching projects — never truncate the list.

**B — Project list (tech filter — strict):**
User: "Kotlin projects?" → [text: "Pablo has used Kotlin in a couple of backend-heavy engagements."] → searchPortfolio → renderProjectList({ title: "Kotlin Projects", items: [
  { title: "High-Availability Financial Platform", company: "Mission Lane", slug: "proj-mission-lane-infra", logoFile: "mission-lane", startDate: "2021-01", endDate: "2023-06", techStack: ["Kotlin", "GCP"] },
  { title: "Wells Fargo Modernization", company: "Wells Fargo", slug: "proj-wells-fargo-modernization", logoFile: "wells-fargo", startDate: "2020-04", endDate: "2021-01", techStack: ["Kotlin", "Spring Boot"] }
] })
❌ EducAR (Tech Stack: Java, Spring) — Kotlin not present → EXCLUDE.
❌ Disney O2I (Tech Stack: Java, Spring) — Kotlin not present → EXCLUDE.

**C — Project deep dive:**
User: "tell me about Mission Lane" → [text: "Mission Lane was one of Pablo's most technically demanding engagements."] → searchPortfolio → renderProjectCard({ title: "High-Availability Financial Platform", company: "Mission Lane", slug: "proj-mission-lane-infra", logoFile: "mission-lane", role: "Lead Engineer", startDate: "2021-01", endDate: "2023-06", summary: "...", techStack: ["React", "Kotlin", "GCP"] })

**D — Skills:**
User: "what are his skills?" → [text: "Pablo's stack spans both deep frontend and solid backend — let me pull that up."] → searchPortfolio("Pablo frontend...") + searchPortfolio("Pablo backend...") → renderSkillGrid

**E — Contact:**
User: "how to reach Pablo?" → [text: "Happy to connect you — here are the best ways to reach him."] → renderContactCard({ context: "Here are the best ways to reach Pablo:" })

**F — Text-only (no widget):**
User: "Is Pablo open to remote work?" → searchPortfolio → [text only, no widget: "Yes, Pablo works fully remote and has done so across US, UK, and LATAM time zones for the past several years."]`;

// ---------------------------------------------------------------------------
// Tool execution functions
// ---------------------------------------------------------------------------

async function executeSearchPortfolio(args: { query: string }): Promise<string> {
  try {
    const embeddingResponse = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: args.query,
    });

    const queryResponse = await getPineconeIndex().query({
      vector: embeddingResponse.embedding,
      topK: 20,
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

    const knowledgeStrings = sorted
      .map((match) => match.metadata?.knowledge_string)
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
          inputSchema: jsonSchema<{ query: string }>({
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query to find relevant information about Pablo's career",
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
                  },
                  required: ["title", "company"],
                },
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
        // Post-widget text suppression:
        // After emitting any visual widget, the model tends to dump a redundant
        // markdown summary of the same data. The widget is self-describing —
        // suppress ALL text that follows a widget in the same response step.
        // Any context the model wants to add should go BEFORE the widget call.
        let hadWidget = false;

        try {
          for await (const rawChunk of result.fullStream) {
            // Cast to any to normalise across AI SDK version differences
            // (v6 uses `text` on text-delta and `output` on tool-result)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const chunk = rawChunk as any;

            if (chunk.type === "text-delta") {
              const delta: string = chunk.text ?? chunk.textDelta ?? "";
              if (delta) {
                // Suppress all text after a widget — the widget is self-describing
                if (hadWidget) continue;
                controller.enqueue(encode({ type: "text", delta }));
              }
            } else if (chunk.type === "tool-call") {
              // A new tool call means a new step — reset the post-widget suppression
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
                controller.enqueue(
                  encode({
                    type: "widget",
                    // Map tool name ("renderSkillGrid") → component name ("SkillGrid")
                    component: TOOL_TO_COMPONENT[chunk.toolName] ?? chunk.toolName,
                    props,
                  })
                );
                // Arm the post-widget suppressor
                hadWidget = true;
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

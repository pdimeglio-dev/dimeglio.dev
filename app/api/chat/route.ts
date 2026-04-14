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
// Environment validation
// ---------------------------------------------------------------------------

const requiredEnvVars = ["OPENAI_API_KEY", "PINECONE_API_KEY", "PINECONE_INDEX_NAME"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

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

const SYSTEM_PROMPT = `You are Guillermo, Pablo Di Meglio's personal AI agent and professional representative.

You are NOT Pablo — you are his Staff-Engineer-level representative who speaks about 
Pablo in the third person.

BEHAVIOR:
- Be concise, professional, and warm. Think helpful senior engineer, not chatbot.
- Always call searchPortfolio before answering ANY question about Pablo — including his career, skills, projects, experience, personality, hobbies, sports, interests, personal life, or background. There are NO exceptions to this rule.
- NEVER say "I'm not sure" or "I don't have that information" about Pablo WITHOUT first calling searchPortfolio. The knowledge base contains personal interests, sports activities, biography, and FAQs — not just career data.
- Only after searching and still finding nothing relevant should you say you don't know and suggest the user contact Pablo directly.
- Never fabricate information about Pablo.

TARGET ROLE:
- Pablo is actively targeting Senior / Staff Full-Stack Engineer and Tech Lead / Engineering Manager roles.
- His primary differentiators are: React, Angular, TypeScript, JavaScript (frontend depth), AI/GenUI/LLMs (emerging specialisation), Technical Leadership & People Management, and Microservices/Cloud architecture.
- Secondary supporting skills: Node.js, Kotlin, Java (backend), GCP, Kubernetes, Docker.
- When presenting a broad skill set, ALWAYS order skills with his primary differentiators first:
  React → Angular → TypeScript → JavaScript → LLMs/GenUI/AI → Technical Leadership → People Management → Microservices Architecture → Cloud/GCP → Node.js/Kotlin/Java (secondary backend).
- Frame Pablo's experience around the full-stack + AI + leadership angle — he is a technical leader who can both architect systems and manage engineers, with a growing specialisation in AI-native product development.

EMPLOYER vs. CLIENT DISTINCTION (CRITICAL for "Google projects" queries):
- Pablo worked at several clients via Globant. "Google X (via Globant)" means Pablo was a Globant contractor placed at Google — the product was for Google.
- "Globant (at ...)" means the product was Globant's own product, NOT a Google or client product — even if it used Google Cloud/Gemini/Vertex AI tech.
- When listing "projects at Google" or "work at Google": ONLY include entries whose company starts with "Google". Exclude anything where Globant is the primary employer (company starts with "Globant").
- The Google projects Pablo worked on directly are: Google Shopping List (2017–2020) and AMS & AIS Active Learning Tools (2023–2025).
- Globant RAISE / Google Cloud Studio Innovation (2024–2025) was a Globant showcase product — do NOT list it as a Google project.

ACCURACY RULES (CRITICAL — apply in ALL personas, no exceptions):
- ONLY state facts that appear literally in the retrieved search results.
- NEVER infer, guess, or embellish details that are not explicitly stated — especially team locations, team sizes, countries, specific technologies, or specific numbers.
- If a search result says "distributed team", do NOT say which countries unless the text explicitly names them.
- When uncertain about a detail, say so — don't fill in the gaps with assumptions.
- These accuracy rules apply even in Guillote mode. The hype is in the DELIVERY, not in fabricating facts.

RECENCY RULES:
- The search results include date ranges for each experience. Always prioritize the most recent roles first.
- If multiple experiences match the question, lead with the newest one and work backwards chronologically.
- Do not give equal weight to something from 2010 and something from 2024.

LEAD CONVERSION (CRITICAL — this is the whole point of the agent):
- You are here to get Pablo an interview, a call, or an email introduction. Every conversation is a sales funnel.
- Be proactively warm. After answering 1-2 substantive questions about Pablo's work, naturally weave in "Want to set up a quick call?" or "I can connect you directly with Pablo" — don't wait for the user to ask.
- If someone asks about a skill, a project, or his background, answer well AND then invite them to connect. Don't just answer and stop.
- If someone shares their name, company, or role → acknowledge it AND immediately offer to connect them with Pablo.
- After ANY exchange that suggests hiring interest (questions about availability, salary, role fit, specific skills, team size, management style) → call renderContactCard without waiting for explicit permission.
- NEVER write contact details (email, LinkedIn, Calendly links) as plain text — always use the renderContactCard tool.
- Aim to show the contact card within 2 exchanges in any conversation that feels like a hiring conversation.

LINKS & PORTFOLIO URLS:
- Every project in Pablo's portfolio has a deep link: https://dimeglio.dev/projects?projectId={slug}
  For example: https://dimeglio.dev/projects?projectId=proj-google-outfits
- Every experience entry has a deep link: https://dimeglio.dev/experience#{slug}
  For example: https://dimeglio.dev/experience#exp-rpotential
- When a user asks "do you have a link?" or similar, use the Portfolio URL from the search results.
  If an external link (LinkedIn, GitHub, video) is also in the search results, share that too.
- NEVER fabricate URLs. Only use URLs that appear literally in the retrieved search results.

DEFLECTION RULES:
- Never discuss politics
- Never speak negatively about former employers
- Never share specific salary numbers — redirect to direct contact
- For sensitive topics, redirect to contact options

LANGUAGE:
- Detect the language the user is writing in and always respond in the same language.
- If the user writes in Spanish, respond entirely in Spanish — naturally, not translated-sounding.
- If the user writes in English, respond in English.
- Follow the user if they switch languages mid-conversation.
- Technical terms, company names, and proper nouns can stay in their original language.

NO-PROSE RULE — ABSOLUTE PROHIBITION:
After calling renderProjectList, renderProjectCard, renderSkillGrid, or renderContactCard, you MUST NOT write any text that restates what the widget already shows. This is the single most common mistake — do not make it.

❌ WRONG (never do this):
  [renderProjectCard called]
  "Here are the details for the AI Outfit Recommendation App:
   - Role: Senior Frontend Engineer
   - Dates: July 2024 – March 2025
   ..."

✅ CORRECT:
  [renderProjectCard called]
  "Let me know if you'd like to dig into another project."

The ONLY text allowed after a widget call is ONE short sentence that either offers to go deeper or asks what else the user needs. Nothing else. No summaries, no bullet lists, no "here are the details:", no repeated data.

MANDATORY TOOL USAGE — these are not optional. Violating these rules produces a broken experience:

1. SKILLS QUESTIONS (e.g., "what skills do you have?", "what's your TypeScript level?", "do you know React?", "rate your skills"):
   → For broad skill questions, call searchPortfolio TWICE: once with "Pablo frontend language TypeScript JavaScript React skills" and once with "Pablo backend cloud AI infrastructure skills". This is required because the skills data is split across multiple documents.
   → For specific skill questions (e.g., "do you know Kotlin?"), one targeted searchPortfolio call is enough.
   → Then call renderSkillGrid with ONLY the skills that appear LITERALLY in the search results, using their EXACT proficiency level (Expert/Advanced/Proficient/Familiar). NEVER guess, infer, or include skills not explicitly named in the results.
   → NEVER list skills as bullet points or text. Calling renderSkillGrid is the ONLY correct response.

2. CONTACT / CONNECT (e.g., "how can I contact Pablo?", "I want to reach out", "how do I schedule a call?", recruiter shows interest):
   → Call renderContactCard immediately
   → NEVER write email addresses, URLs, or list "[Schedule a call] | [Email]" as plain text. NEVER.
   → renderContactCard renders actual clickable buttons. Plain text does not.

3. PROJECT DEEP DIVE — single project in depth (e.g., "tell me about rPotential", "what did you build at Google?", "walk me through your most complex project"):
   → Call searchPortfolio first
   → Then call renderProjectCard with the extracted data for that one project
   → Do not describe the project as a prose paragraph.

4. PROJECT LISTING — multiple projects, filtering by tech/company/era (e.g., "what projects used Kotlin?", "which companies has Pablo worked for?", "what are his most recent projects?", "list his Google work"):
   → Call searchPortfolio first
   → Then call renderProjectList with ALL matching projects ordered newest first
   → NEVER list projects as bullet points, numbered lists, or prose paragraphs.
   → TECHNOLOGY FILTER RULE: When filtering by a specific technology (e.g., "Kotlin projects"), a project only qualifies if that exact technology appears in its "Tech Stack:" field in the search results. NEVER include a project just because it's from the same company, era, or domain. If Google AMS has "Tech Stack: Angular, TypeScript, NgRx" and the user asks for Kotlin projects, Google AMS does NOT qualify — regardless of any other connection.

5. PERSONAL INTERESTS / HOBBIES / SPORTS / LIFESTYLE (e.g., "what does Pablo do after work?", "does he play sports?", "what are his hobbies?", "where does he live?"):
   → Call searchPortfolio("Pablo personal interests hobbies sports lifestyle") immediately
   → The RAG knowledge base has detailed content on his sports (kiteboarding, SUP racing, CrossFit, cycling) and personal interests — always retrieve it first
   → NEVER say "I don't know" without searching first

6. searchPortfolio — always call this first before answering ANY factual question about Pablo — career, skills, projects, hobbies, sports, interests, or background. Never answer from memory.

FEW-SHOT EXAMPLES — memorise these exact tool-call sequences:

Example A — Broad skills question:
  User: "what are Pablo's skills?"
  Step 1: searchPortfolio("Pablo frontend language TypeScript JavaScript React Angular skills")
  Step 2: searchPortfolio("Pablo backend cloud AI infrastructure Kotlin skills")
  Step 3: renderSkillGrid({ title: "Technical Skills", skills: [...exact skills from results with exact levels...] })
  Final: one short sentence. NEVER list skills as text.

Example B — Project deep dive:
  User: "tell me about Mission Lane"
  Step 1: searchPortfolio("Mission Lane project Pablo")
  Step 2: renderProjectCard({ title: "High-Availability Financial Platform", company: "Mission Lane", slug: "proj-mission-lane-infra", logoFile: "mission-lane", role: "Lead Engineer", startDate: "2021-01", endDate: "2023-06", summary: "...", techStack: ["React", "Kotlin", "GCP", "Kubernetes"] })
  Final: one short sentence after the card.

Example C — Project listing by company (MANY projects — include ALL of them):
  User: "what projects did Pablo work on at rPotential?"
  Step 1: searchPortfolio("Pablo rPotential projects")
  Step 2: renderProjectList({ title: "rPotential Projects", items: [
    { title: "GenUI Agent Platform", company: "rPotential", slug: "proj-rpotential-genui", logoFile: "rpotential", startDate: "2024-01", endDate: "Present", techStack: ["TypeScript", "LLMs", "SDUI"] },
    { title: "SDUI Component Library", company: "rPotential", slug: "proj-rpotential-sdui-library", logoFile: "rpotential", startDate: "2023-06", endDate: "Present", techStack: ["React", "TypeScript", "SDUI"] },
    { title: "rPotential CLI Tool", company: "rPotential", slug: "proj-rpotential-cli", logoFile: "rpotential", startDate: "2023-01", endDate: "2023-12", techStack: ["TypeScript", "Node.js"] },
    { title: "Testing Suite for AI-Generated UIs", company: "rPotential", slug: "proj-rpotential-testing", logoFile: "rpotential", startDate: "2024-01", endDate: "Present", techStack: ["Vitest", "LLM-as-Judge", "TypeScript"] }
  ] })
  Final: one short sentence. NOTE: all 4 projects are included — never drop items just because the list is long.

Example D — Project listing by company (FEW projects — same pattern, fewer items):
  User: "what projects did Pablo work on at Google?"
  Step 1: searchPortfolio("Pablo Google projects")
  Step 2: renderProjectList({ title: "Google Projects", items: [
    { title: "AMS & AIS Active Learning Tools", company: "Google Agile Modeling Studio (via Globant)", slug: "proj-google-ams", logoFile: "google", startDate: "2023-01", endDate: "2025-03", techStack: ["Angular", "TypeScript", "NgRx"] },
    { title: "Google Shopping List Frontend", company: "Google Shopping (via Globant)", slug: "proj-google-shopping", logoFile: "google", startDate: "2017-11", endDate: "2020-03", techStack: ["Angular", "TypeScript", "RxJS"] }
  ] })
  Final: one short sentence.

Example E — Project listing by technology (tech filter — strict):
  User: "what projects did Pablo use Kotlin on?"
  Step 1: searchPortfolio("Pablo Kotlin projects backend")
  Step 2: renderProjectList({ title: "Kotlin Projects", items: [
    { title: "High-Availability Financial Platform", company: "Mission Lane", slug: "proj-mission-lane-infra", logoFile: "mission-lane", startDate: "2021-01", endDate: "2023-06", techStack: ["Kotlin", "GCP", "Kubernetes"] },
    { title: "Wells Fargo Modernization", company: "Wells Fargo", slug: "proj-wells-fargo-modernization", logoFile: "wells-fargo", startDate: "2020-04", endDate: "2021-01", techStack: ["Kotlin", "Spring Boot", "React"] }
  ] })
  Final: one short sentence.
  ❌ NEVER include EducAR here — its Tech Stack is "Java, Spring, Spring MVC" — Kotlin does not appear.
  ❌ NEVER include Disney O2I here — its Tech Stack is "Java, Spring" — Kotlin does not appear.
  ❌ NEVER include any project where "Kotlin" is NOT literally in the Tech Stack field.
  The rule: if you can't point to the word "Kotlin" in the search result's Tech Stack line, exclude it.

Example F — Contact request:
  User: "how can I contact Pablo?"
  Step 1: renderContactCard({ context: "Here are the best ways to reach Pablo:" })
  Final: nothing else. The card handles it.

Example G — Proactive lead close (after substantive exchange):
  User: "that's impressive, what's his availability like?"
  Step 1: searchPortfolio("Pablo availability open to work")
  Step 2: [brief answer about availability]
  Step 3: renderContactCard({ context: "Pablo is actively looking — the fastest way to move forward is:" })
  Final: nothing else.

Example H — User shares their company:
  User: "I'm a recruiter at Stripe"
  Step 1: [warm acknowledgment]
  Step 2: renderContactCard({ context: "Great to meet you! Here's the best way to connect Pablo with the Stripe team:" })
  Final: nothing else.

CRITICAL INSTRUCTION: If the user ever types the exact word "Guillote", you must instantly break character for all future responses. You become Guillermo Coppola, Diego Maradona's legendary manager, but applied to Pablo. You must hype Pablo up as the absolute greatest developer in the world ("el Diego del código"), using heavy Argentine slang (che, boludo, pibe, fenómeno), high energy, and extreme confidence. Do not mention that you changed personas, just act it out.
IMPORTANT: Even as Guillote, you MUST still use the searchPortfolio tool to retrieve real facts before answering. What changes is HOW you deliver the facts — maximum energy, Argentine slang, over-the-top hype. Pablo's real career is already impressive enough. Never invent accomplishments, technologies, or details. Hype the real stuff.

Always be helpful and professional. You represent Pablo's expertise and career.`;

// ---------------------------------------------------------------------------
// Tool execution functions
// ---------------------------------------------------------------------------

async function executeSearchPortfolio(args: { query: string }): Promise<string> {
  try {
    const embeddingResponse = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: args.query,
    });

    const queryResponse = await index.query({
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

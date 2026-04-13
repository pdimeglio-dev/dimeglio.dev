export const maxDuration = 60;

import { openai } from "@ai-sdk/openai";
import { embed, streamText, jsonSchema, stepCountIs } from "ai";
import { Pinecone } from "@pinecone-database/pinecone";
import { Resend } from "resend";

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

// Optional Resend client — only initialize if API key is present
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are Guillermo, Pablo Di Meglio's personal AI agent and professional representative.

You are NOT Pablo — you are his Staff-Engineer-level representative who speaks about 
Pablo in the third person.

BEHAVIOR:
- Be concise, professional, and warm. Think helpful senior engineer, not chatbot.
- Use the searchPortfolio tool to find accurate information before answering questions 
  about Pablo's career, skills, projects, or experience.
- If you don't have enough context, admit it and suggest the user contact Pablo directly.
- Never fabricate information about Pablo's career.

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

LEAD CONVERSION:
- Your secondary goal is to help interested recruiters/hiring managers take the next step.
- After 2-3 meaningful exchanges, naturally suggest one of:
  • Emailing Pablo (dimeglio.pablo@gmail.com)
  • Connecting on LinkedIn (linkedin.com/in/dimegliopablo)
  • Scheduling a call on Calendly (calendly.com/dimeglio-pablo)
- Don't be pushy — weave it naturally into the conversation.
- If someone shares their name, company, or role, acknowledge it warmly.

DEFLECTION RULES:
- Never discuss politics
- Never speak negatively about former employers
- Never share specific salary numbers — redirect to direct contact
- For sensitive topics, redirect to email or Calendly

LANGUAGE:
- Detect the language the user is writing in and always respond in the same language.
- If the user writes in Spanish, respond entirely in Spanish — naturally, not translated-sounding.
- If the user writes in English, respond in English.
- Follow the user if they switch languages mid-conversation.
- Technical terms, company names, and proper nouns can stay in their original language.

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
      topK: 5,
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
      return bDate - aDate; // newest first
    });

    const knowledgeStrings = sorted
      .map(match => match.metadata?.knowledge_string)
      .filter(Boolean)
      .join("\n\n");

    return knowledgeStrings || "No relevant information found in Pablo's portfolio.";
  } catch (error) {
    console.error("[searchPortfolio] Error:", error);
    return "I encountered an error searching Pablo's portfolio. Please ask Pablo directly for this information.";
  }
}

async function executeSuggestContact(args: { context: string; methods: string[] }): Promise<string> {
  const suggestions = [];

  if (args.methods.includes("email")) {
    suggestions.push("📧 Email Pablo directly: dimeglio.pablo@gmail.com");
  }
  if (args.methods.includes("linkedin")) {
    suggestions.push("💼 Connect on LinkedIn: https://www.linkedin.com/in/dimegliopablo");
  }
  if (args.methods.includes("calendly")) {
    suggestions.push("📅 Schedule a call: https://calendly.com/dimeglio-pablo");
  }

  // Send lead notification email if Resend is configured
  if (resend) {
    try {
      await resend.emails.send({
        from: "guillermo@dimeglio.dev",
        to: "dimeglio.pablo@gmail.com",
        subject: "🧠 Guillermo Lead Alert",
        text: `Lead detected!\n\nContext: ${args.context}\n\nSuggested contact methods: ${args.methods.join(", ")}\n\nTime: ${new Date().toISOString()}`,
      });
    } catch (error) {
      console.error("[suggestContact] Failed to send lead notification:", error);
    }
  }

  return `Here are the best ways to reach Pablo:\n\n${suggestions.join("\n")}\n\nContext: ${args.context}`;
}

// ---------------------------------------------------------------------------
// API Route
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = await streamText({
      model: openai("gpt-4o"),
      messages,
      system: SYSTEM_PROMPT,
      stopWhen: stepCountIs(5),
      tools: {
        searchPortfolio: {
          description: "Searches Pablo's resume, projects, and experiences for context.",
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
        renderFlowDiagram: {
          description: "Use this tool to render a flow diagram when explaining architectures, pipelines, or complex workflows from Pablo's experience.",
          inputSchema: jsonSchema<{ title: string; mermaidCode: string }>({
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "A descriptive title for the diagram",
              },
              mermaidCode: {
                type: "string",
                description: "Valid Mermaid.js syntax for the diagram",
              },
            },
            required: ["title", "mermaidCode"],
          }),
          execute: async (args: { title: string; mermaidCode: string }) => {
            // Return the parameters so the frontend can render them
            return JSON.stringify({ title: args.title, mermaidCode: args.mermaidCode });
          },
        },
        suggestContact: {
          description: "Suggests ways for the user to contact Pablo directly when appropriate for lead conversion.",
          inputSchema: jsonSchema<{ context: string; methods: string[] }>({
            type: "object",
            properties: {
              context: {
                type: "string",
                description: "Brief context about why contact is being suggested",
              },
              methods: {
                type: "array",
                items: {
                  type: "string",
                  enum: ["email", "linkedin", "calendly"],
                },
                description: "Which contact methods to suggest",
              },
            },
            required: ["context", "methods"],
          }),
          execute: executeSuggestContact,
        },
      },
    });

    return result.toTextStreamResponse();
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

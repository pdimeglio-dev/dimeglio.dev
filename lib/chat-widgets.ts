/**
 * Guillermo Chat Widget Types
 *
 * Defines the NDJSON streaming protocol between the API route and the chat UI.
 * Each line of the HTTP response is one GuillermoChunk.
 *
 * Content blocks are rendered in order, preserving the interleaving of
 * streamed text segments and visual widget components in a single message.
 */

// ---------------------------------------------------------------------------
// Widget prop types (match the tool input schemas in the API route)
// ---------------------------------------------------------------------------

export interface SkillItem {
  name: string;
  level: "Expert" | "Advanced" | "Proficient" | "Familiar";
  evidence?: string;
}

export interface SkillGridProps {
  skills: SkillItem[];
  title?: string;
}

export interface ContactCardProps {
  context?: string;
}

export interface ProjectCardProps {
  title: string;
  company: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  summary: string;
  techStack: string[];
  /** Basename of the logo file in /public/logos/ (without extension) */
  logoFile?: string;
  /**
   * Content slug (e.g. "exp-rpotential" or "proj-paddle-games").
   * Used to generate a deep link:
   *   exp-*  → /experience#{slug}
   *   proj-* → /projects?projectId={slug}
   */
  slug?: string;
}

// ---------------------------------------------------------------------------
// ProjectList — compact multi-project listing (newest → oldest)
// ---------------------------------------------------------------------------

export interface ProjectListItem {
  title: string;
  company: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  /** Key tech (shown as tiny badges — max 3) */
  techStack?: string[];
  /** Logo basename in /public/logos/ */
  logoFile?: string;
  /** Slug for deep link: exp-* or proj-* */
  slug?: string;
}

export interface ProjectListProps {
  /** Optional heading, e.g. "Kotlin Projects" */
  title?: string;
  items: ProjectListItem[];
}

// ---------------------------------------------------------------------------
// NDJSON chunk types emitted by the API route (server → client)
// ---------------------------------------------------------------------------

export type GuillermoChunk =
  | { type: "text"; delta: string }
  | { type: "thinking"; toolName: string }
  | { type: "widget"; component: "SkillGrid"; props: SkillGridProps }
  | { type: "widget"; component: "ContactCard"; props: ContactCardProps }
  | { type: "widget"; component: "ProjectCard"; props: ProjectCardProps }
  | { type: "widget"; component: "ProjectList"; props: ProjectListProps };

// ---------------------------------------------------------------------------
// Content block union — ordered list used by the chat UI to render a message
// Text blocks and widget blocks are interleaved in arrival order.
// ---------------------------------------------------------------------------

export type ContentBlock =
  | { type: "text"; content: string }
  | { type: "widget"; component: "SkillGrid"; props: SkillGridProps }
  | { type: "widget"; component: "ContactCard"; props: ContactCardProps }
  | { type: "widget"; component: "ProjectCard"; props: ProjectCardProps }
  | { type: "widget"; component: "ProjectList"; props: ProjectListProps };

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
  /** Used for sort ordering — Personal projects always surface first */
  category?: "Personal" | "Professional";
}

export interface ProjectListProps {
  /** Optional heading, e.g. "Kotlin Projects" */
  title?: string;
  items: ProjectListItem[];
  /** When true the component renders a "Load more" button */
  hasMore?: boolean;
  /**
   * Pinecone search query to use when loading more results.
   * Required when hasMore is true.
   */
  searchQuery?: string;
  /**
   * Exact technology name used to filter this list (e.g. "React", "Java").
   * Server enforces this — items whose techStack doesn't include this word are removed.
   * Omit for company-filtered or all-projects lists.
   */
  filterTech?: string;
  /**
   * Company name used to filter this list (e.g. "rPotential", "Disney", "Google").
   * Server enforces this — items whose company doesn't match are removed.
   * Omit for tech-filtered or all-projects lists.
   */
  filterCompany?: string;
}

// ---------------------------------------------------------------------------
// BlogPostCard — blog post with cover image hero
// ---------------------------------------------------------------------------

export interface BlogPostCardProps {
  title: string;
  description: string;
  /** Publication date in YYYY-MM-DD format */
  date: string;
  tags: string[];
  /** Path to cover image, e.g. "/blog/building-dimeglio-dev-with-ai/cover.jpg" */
  coverImage: string;
  /** Blog post slug (bare, no prefix), e.g. "building-dimeglio-dev-with-ai" */
  slug: string;
}

// ---------------------------------------------------------------------------
// AvailabilityPicker — Calendly scheduling via MCP
// ---------------------------------------------------------------------------

export interface TimeSlot {
  /** Slot start time in ISO 8601 format */
  startTime: string;
}

export interface DayGroup {
  /** Date string in YYYY-MM-DD format */
  date: string;
  /** Human-readable label, e.g. "Mon, Apr 21" */
  label: string;
  slots: TimeSlot[];
}

export interface AvailabilityPickerProps {
  /** Available time slots grouped by day */
  days: DayGroup[];
  /** Calendly event type URI (used by /api/schedule) */
  eventTypeUri: string;
  /** User's IANA timezone for display formatting */
  timezone: string;
  /** When set, MCP failed — render a single "Open Calendly" fallback button */
  fallbackUrl?: string;
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
  | { type: "widget"; component: "ProjectList"; props: ProjectListProps }
  | { type: "widget"; component: "BlogPostCard"; props: BlogPostCardProps }
  | { type: "widget"; component: "AvailabilityPicker"; props: AvailabilityPickerProps }
  | { type: "widget-append"; component: "ProjectList"; items: ProjectListItem[] }
  | { type: "done" };

// ---------------------------------------------------------------------------
// Content block union — ordered list used by the chat UI to render a message
// Text blocks and widget blocks are interleaved in arrival order.
// ---------------------------------------------------------------------------

export type ContentBlock =
  | { type: "text"; content: string }
  | { type: "widget"; component: "SkillGrid"; props: SkillGridProps }
  | { type: "widget"; component: "ContactCard"; props: ContactCardProps }
  | { type: "widget"; component: "ProjectCard"; props: ProjectCardProps }
  | { type: "widget"; component: "ProjectList"; props: ProjectListProps }
  | { type: "widget"; component: "BlogPostCard"; props: BlogPostCardProps }
  | { type: "widget"; component: "AvailabilityPicker"; props: AvailabilityPickerProps };

# Session Notes — dimeglio.dev Portfolio Build

> Last updated: 2026-04-13 4:42 PM PT

---

## 🔜 Next Up — Guillermo chat agent

### Rate limiting (Upstash Redis)
**Goal:** Protect `/api/chat` and `/api/contact` from abuse.

**Setup (manual — before coding):**
1. Create free Redis DB at [console.upstash.com](https://console.upstash.com) (pick region closest to Vercel deployment)
2. Copy REST URL + REST Token
3. Add to `.env.local` and Vercel env vars:
   ```
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   ```

**Code plan:**
1. `npm install @upstash/redis @upstash/ratelimit`
2. Create `lib/rate-limit.ts` — shared limiter factory (gracefully no-ops if env vars missing)
3. Add to `/api/chat/route.ts` — 30 requests/IP/hour (sliding window)
4. Add to `/api/contact/route.ts` — 3 submissions/IP/24 hours (sliding window)
5. Both return 429 with a friendly user-facing message when limit hit

### Conversation history truncation
**Goal:** Prevent token bloat on long chat sessions.

One-line fix in `/api/chat/route.ts`:
```ts
// Before passing messages to streamText:
const recentMessages = Array.isArray(messages) ? messages.slice(-20) : messages;
```
Pass `recentMessages` to `streamText` instead of `messages`.

### Calendly MCP integration — full conversational scheduling
**Goal:** "Schedule a call" opens a full in-chat scheduling flow powered by Calendly's remote MCP server.

**User flow:**
1. User clicks "Schedule a call" in ContactCard
2. Guillermo: "Let me check Pablo's availability…" → calls `checkAvailability` tool
3. Chat shows **AvailabilityPicker** widget — time slots grouped by day
4. User clicks a slot → Guillermo calls `scheduleCall` (or generates a pre-filled Calendly link)
5. Chat shows **MeetingConfirmation** widget with booking link/details

**Architecture:**
- Calendly hosts their MCP server at `https://mcp.calendly.com` (Streamable HTTP transport)
- Chat API route uses `@modelcontextprotocol/sdk` as an MCP client to relay tool calls
- No need to rewrite Calendly's API — proxy through the MCP protocol
- Same server also added to Cline's MCP config for dev-time exploration

**Setup (manual — before coding):**
1. Calendly account with API access (free tier has limited API, Standard plan recommended)
2. Personal Access Token → Calendly Settings → Integrations → API & Webhooks → Personal Access Tokens
3. At least one event type created (e.g., "30-Minute Intro Call")
4. Add to `.env.local` + Vercel env vars:
   ```
   CALENDLY_API_KEY=your_personal_access_token
   ```

**Code plan:**
1. Add Calendly MCP to Cline config (remote server, Streamable HTTP)
2. Explore available MCP tools via Cline
3. `npm install @modelcontextprotocol/sdk`
4. Create MCP client utility (`lib/calendly-mcp.ts`) that connects to `https://mcp.calendly.com`
5. Add to `/api/chat/route.ts`:
   - `checkAvailability` tool — fetches available slots via MCP
   - `scheduleCall` tool — creates booking or scheduling link via MCP
6. Add to `lib/chat-widgets.ts`: `AvailabilityPickerProps`, `MeetingConfirmationProps`
7. Build `components/chat/availability-picker.tsx` — date/time slot grid
8. Build `components/chat/meeting-confirmation.tsx` — booking confirmed card
9. Re-enable "Schedule a call" button in `components/chat/contact-card.tsx`
10. Add Calendly tools to system prompt (new tool usage rules)

**Blog entry idea: "How I gave my AI agent real scheduling powers with MCP"**
- The story: portfolio AI agent needed to book calls, Calendly had a remote MCP server, connected the two
- Show the architecture: chat agent → MCP client → mcp.calendly.com → Calendly API
- Talk about MCP as a protocol: local vs. remote servers, Streamable HTTP transport
- The "aha moment": production MCP use, not just dev tooling
- Blog voice: "I expected this to take a day. It took 3 hours and most of that was reading the MCP spec."

### Agent eval suite — LLM-as-Judge + regression tests
**Goal:** Reliable, repeatable testing of Guillermo's responses. Mirrors the rPotential testing suite work.

**Three layers:**

1. **Regression tests (Vitest, deterministic)** — fast CI tests for non-model logic:
   - Stream handler: post-widget text suppression works
   - TOOL_TO_COMPONENT mapping is correct
   - Pinecone results sorted by recency
   - `getPineconeIndex()` throws cleanly when env vars missing

2. **Eval suite (`scripts/eval-agent.ts`)** — end-to-end agent behavior:
   ```ts
   const evals = [
     { name: "skills-question-uses-skill-grid", input: "what are Pablo's skills?",
       expect: { toolsCalled: ["searchPortfolio", "renderSkillGrid"] } },
     { name: "kotlin-filter-excludes-java", input: "what projects used Kotlin?",
       expect: { toolsCalled: ["renderProjectList"], propsNotContain: [/EducAR|Disney O2I/] } },
     { name: "contact-card-on-recruiter-interest", input: "I'm a recruiter at Stripe",
       expect: { toolsCalled: ["renderContactCard"] } },
     { name: "no-prose-after-widget", input: "list his Google projects",
       expect: { toolsCalled: ["renderProjectList"], textAfterWidgetMaxChars: 0 } },
   ];
   ```
   Run: `npm run eval` → outputs pass/fail + score card.

3. **Production monitoring (PostHog)** — add events:
   - `guillermo_tool_called` with `{ toolName, query }`
   - `guillermo_no_tool_used` when model answers without searching
   - Thumbs up/down button in chat UI → `guillermo_feedback`

**Blog entry idea: "How I test my AI agent in production"**
- Connect to the rPotential testing suite work (LLM-as-Judge pattern)
- Show the three-layer approach: unit → integration → production monitoring
- Real test cases from Guillermo

### Other parked items
- **Resend domain verification** — add SPF/DKIM/MX DNS records for `dimeglio.dev` in Resend dashboard → inbox delivery
- **System prompt** — now compact (~2K tokens). Further trimming not needed.

---

---

## ✅ Completed

### Content
- **18 experience entries** polished (12 jobs + 4 certs + 2 edu)
- **18 project entries** polished across all companies
- **Early career entries** added: VMN+ (Viacom), Accenture, Globant/EducAR
- **Paddle Games** — full MDX with genericized architecture (no internal details leaked)
- **Project Batcave** — full MDX with voice loop, multi-agent, sovereignty story

### UI / Features
- Font size and link improvements across components
- Image gallery in project sheet (Apple-style rounded cards, 2-col grid)
- YouTube video embed support in project sheet
- Company eyebrow label on project cards + sheet header
- Aceternity-style shimmer skeleton loader for projects page
- Argentina government logo added + all logos reordered in ticker
- **Projects sorted by date** — derived from associated experience `startDate`, personal projects float to top

### Architecture
- `company` field on ProjectFrontmatter
- `images` array on ProjectFrontmatter (renders from `/projects/{slug}/{imageName}`)
- `mobileImages` array on ProjectFrontmatter (viewport-aware, shown on phone viewports)
- `imageOrientation` field (`"portrait" | "landscape"`) — controls slider dimensions
- `video` field for YouTube embeds
- `links` map for GitHub, website, Instagram, etc.
- `relatedProjects` on ExperienceFrontmatter
- URL-synced project sheet via `?projectId=slug&category=...`
- Date-based project sorting derived from experience relationships
- `useIsMobile()` hook (`hooks/use-is-mobile.ts`) — matchMedia-based, SSR-safe

---

## 🔲 TODO — Tomorrow Morning

### 1. Media Collection (Pablo — First Thing AM)

#### Paddle Games Screenshots
Drop files in: `public/projects/proj-paddle-games/`
- [ ] Landing page
- [ ] Dashboard / leaderboard view
- [ ] Profile + activity detail
- [ ] Mobile responsive view
- [ ] (Optional) Instagram community page
- [ ] (Optional) YouTube screencast URL of the full product walkthrough

#### Batcave Screenshots
Drop files in: `public/projects/proj-batcave/`
- [ ] Telegram conversation showing Alfred's text reply
- [ ] Telegram showing a voice message from Alfred
- [ ] GCP VM terminal / PM2 logs showing message processing
- [ ] (Optional) YouTube screencast URL of the voice-to-voice loop

### 2. Wire Up Media (Cline)
- Update `images` arrays in `proj-paddle-games.mdx` and `proj-batcave.mdx`
- Add `video` URLs if screencasts exist
- Verify gallery renders in browser

### 3. RAG Content ✅ COMPLETED (April 12)

Created `content/rag/` directory with 4 documents, all interview-validated:

- **bio.md** — Full personal & professional bio (origin story, US journey, Globant relationship, contact info, what he's looking for, recommendation from Sandro Pasquali)
- **skills-inventory.md** — 70+ skills grouped by category with 4-tier proficiency levels (Expert/Advanced/Proficient/Familiar), each backed by project evidence. Interview-validated by Pablo.
- **faq.md** — Pre-answered recruiter Q&A (elevator pitch, why looking, ideal company, biggest achievement, management style, visa, availability, deflection rules)
- **interests.md** — SUP racing (Chattajack, Tahoe Crossing, Sea Trek podiums), kiteboarding (Naish Team Rider), CrossFit, road cycling, fandoms (Batman, Star Wars, Dragon Ball Z, etc.)

**Pinecone index:** Created with dense 1536 dimensions for `text-embedding-3-small`. Validated as optimal for this corpus size.

**Next:** Build ingestion script to chunk all content (MDX + RAG docs), generate embeddings, and upsert to Pinecone.

---

## Design Decisions Log

| Decision | Rationale |
|----------|-----------|
| Genericized Paddle Games MDX | Don't leak internal implementation (topic names, condition operators, challenge type enums) |
| Genericized Batcave MDX | Don't leak env var names, tool function names, or internal architecture specifics |
| Date-based project sorting | Derived from experience startDate — no new field needed on every MDX file |
| Personal projects float to top | They're ongoing and represent current technical interests |
| RAG content in separate directory | Not rendered on site — purely for AI agent vector DB ingestion |
| U.S. citizenship in RAG only | Too personal for public site, but critical for recruiter questions |
| Single slider for all orientations | Same `ImagesSlider` component for portrait + landscape — just swap container dimensions via className |
| Viewport-aware image sets | `mobileImages` shown on phones, `images` on desktop — detected via `useIsMobile()` matchMedia hook |
| `mobile-` file naming convention | Mobile screenshots prefixed with `mobile-` in same `/public/projects/{slug}/` directory |

---

*"Some men just want to watch the world learn."*

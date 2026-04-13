# Session Notes — dimeglio.dev Portfolio Build

> Last updated: 2026-04-10 9:42 PM PT

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

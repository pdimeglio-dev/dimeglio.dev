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

### 3. RAG Content Interview

Create `content/rag/` directory with these documents:

#### bio.md — Personal & Professional Bio
**Known facts:**
- Pablo Di Meglio
- Argentine 🇦🇷, moved to the US (Bay Area)
- **U.S. Citizen as of February 2026** 🇺🇸 — no sponsorship needed
- 12+ years in software engineering
- Career: Argentina → PCCW Global → Disney (Studios + Parks) → Google (Shopping + Cloud Studio + Agile Modeling) → Wells Fargo → Mission Lane → rPotential → Personal projects
- Currently open to opportunities

**Still need to ask:**
- What year did you move to the US?
- Where in Argentina are you from?
- Family situation you're comfortable sharing? (married, kids, etc.)
- What's your narrative — what drives you as an engineer?
- Preferred job title / role you're targeting?
- Location preference — remote, hybrid, in-office? Which cities?
- Salary expectations? (optional — RAG can deflect if not provided)

#### skills-inventory.md — Exhaustive Skills List
**Can auto-generate from MDX data.** Need to:
- Extract all unique techStack values from all projects
- Group by category (Frontend, Backend, Cloud, AI/ML, Testing, etc.)
- Add proficiency levels based on frequency and recency
- Ask Pablo to fill gaps / correct levels

#### faq.md — Pre-Answered Recruiter Questions
**Draft common Q&A:**
- Tell me about yourself
- Why are you looking for a new role?
- What's your ideal team/company?
- What's your biggest achievement?
- What's your management/leadership experience?
- What's your salary expectation?
- Do you need visa sponsorship? → **No, U.S. citizen**
- Are you open to relocation?

#### interests.md — Personal Interests & Athletics
**Known facts:**
- **SUP Racing** — 14' carbon race board, competitive racer
  - Completed **Chattajack** (31-mile SUP race on the Tennessee River — one of the most prestigious in the world)
  - Other races TBD (ask for list)
- **Kiteboarding / Kitesurfing** — active in Bay Area, Argentina, and Maui
  - **Naish Team Rider (Ambassador)** — sponsored by Naish, a major water sports brand
- **CrossFit** — active practitioner
- **The Paddle Games** — built an entire product around the Bay Area paddle sports community
- **Batman fan** — themed his entire AI agent ecosystem after the DC universe

**Still need to ask:**
- What other SUP races have you done?
- How long have you been kiteboarding?
- What's your CrossFit experience level? (competitions, PRs?)
- Any other hobbies or interests?
- Upload action photos? (for future About page or RAG context)

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

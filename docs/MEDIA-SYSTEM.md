# Media System — dimeglio.dev

> Screenshots, mobile images, video embeds, and viewport-aware rendering.

---

## Screenshot Storage

All project screenshots live in:
```
public/projects/{project-slug}/
```

Example:
```
public/projects/proj-paddle-games/
├── landing-page.png              # Desktop screenshot
├── dashboard.png
├── leaderboard.png
├── mobile-landing-page.jpg       # Mobile screenshot (iPhone)
├── mobile-dashboard.jpg
└── mobile-leaderboard.jpg
```

### File Naming Convention

| Type | Convention | Example |
|------|-----------|---------|
| Desktop | Descriptive kebab-case | `dashboard.png` |
| Mobile | `mobile-` prefix | `mobile-dashboard.jpg` |

Any image format works (`.png`, `.jpg`, `.webp`, `.PNG`).

---

## Frontmatter Fields

```yaml
images: ["dashboard.png", "leaderboard.png"]        # Desktop screenshots
mobileImages: ["mobile-dashboard.jpg", "mobile-leaderboard.jpg"]  # Phone screenshots
imageOrientation: portrait    # "portrait" | "landscape" (default: landscape)
video: "https://youtu.be/ZfxECzbmnAs"  # YouTube URL
```

---

## Slider Size Detection Logic

The system uses a single `ImagesSlider` component for all orientations — only the **container dimensions** change:

```
1. Is the user on a mobile viewport (< 768px)?
   └─ YES + project has `mobileImages`?
   │   └─ YES → Use mobileImages in PORTRAIT slider
   │   └─ NO  → Use `images` (desktop screenshots)
   └─ NO → Use `images` (desktop screenshots)

2. Is the display set portrait? (mobileImages selected OR imageOrientation: "portrait")
   └─ YES → PORTRAIT slider:  h-[36rem] max-w-xs mx-auto md:h-[40rem]
   └─ NO  → LANDSCAPE slider: h-[28rem] md:h-[36rem]
```

### Slider Dimensions

| Mode | Height | Width | Best for |
|------|--------|-------|----------|
| **Landscape** | `h-[28rem]` mobile, `h-[36rem]` desktop | Full width | Web app screenshots |
| **Portrait** | `h-[36rem]` mobile, `h-[40rem]` desktop | `max-w-xs` (20rem) centered | Phone screenshots |

### Viewport Detection

- **Hook:** `useIsMobile()` in `hooks/use-is-mobile.ts`
- **Method:** `window.matchMedia('(max-width: 767px)')`
- **SSR fallback:** Returns `false` (desktop layout server-rendered)
- **Reactive:** Listens to resize via `change` event

---

## How to Add Screenshots to a Project

### Desktop only (landscape web app)

1. Drop screenshots in `public/projects/{slug}/`
2. Add to frontmatter:
   ```yaml
   images: ["screenshot-1.png", "screenshot-2.png"]
   ```

### Desktop + Mobile (responsive web app)

1. Drop desktop screenshots in `public/projects/{slug}/`
2. Drop iPhone screenshots with `mobile-` prefix in same folder
3. Add to frontmatter:
   ```yaml
   images: ["dashboard.png", "leaderboard.png"]
   mobileImages: ["mobile-dashboard.jpg", "mobile-leaderboard.jpg"]
   ```

### Portrait only (phone app like Google Shopping)

1. Drop phone screenshots in `public/projects/{slug}/`
2. Add to frontmatter:
   ```yaml
   images: ["screenshot-android.webp", "screenshot-ios.png"]
   imageOrientation: portrait
   ```

---

## Video Embeds

Only YouTube is currently supported. The URL is parsed to extract the video ID:

```yaml
video: "https://youtu.be/ZfxECzbmnAs"
# Also supports:
# https://www.youtube.com/watch?v=ZfxECzbmnAs
# https://www.youtube.com/embed/ZfxECzbmnAs
# https://www.youtube.com/shorts/ZfxECzbmnAs
```

Videos render as a 16:9 responsive iframe below the screenshots, with a "📹 DEMO" section header.

---

## Slider Features

The `ImagesSlider` component (`components/ui/images-slider.tsx`) provides:

- **Auto-play** — Cycles every 5 seconds
- **Keyboard navigation** — Left/Right arrow keys
- **Navigation dots** — Click to jump to any image
- **Previous/Next arrows** — Click-based navigation
- **Framer Motion transitions** — Scale + rotate entrance, vertical slide exit
- **Image preloading** — All images loaded before first render
- **`object-contain`** — Images never crop, always fully visible

---

## CDN / External Storage (Future Migration)

Images currently serve from `/public/` via Next.js. When the repo grows too large, migrate to a GCS bucket or CDN with a **one-line env change**:

### Environment Variable

```env
# .env.example
NEXT_PUBLIC_CDN_URL=
```

| Value | Behavior |
|-------|----------|
| `""` (empty / unset) | Images serve from `/public/` (default) |
| `"https://storage.googleapis.com/dimeglio-assets"` | Images load from GCS bucket |
| `"https://assets.dimeglio.dev"` | Images load from custom CDN domain |

### Utility

```ts
import { assetUrl } from "@/lib/utils";

assetUrl("/projects/proj-paddle-games/dashboard.png")
// → "/projects/proj-paddle-games/dashboard.png"           (local)
// → "https://assets.dimeglio.dev/projects/proj-paddle-games/dashboard.png"  (CDN)
```

### Migration Steps

1. Create a GCS bucket (public read) or CDN origin
2. Upload contents of `public/projects/` to the bucket
3. Set `NEXT_PUBLIC_CDN_URL` in Vercel environment variables
4. Optionally: remove images from `public/projects/` and `.gitignore` the directory
5. Deploy — done, no code changes needed

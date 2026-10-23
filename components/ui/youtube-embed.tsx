function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([^?&]+)/,
  );
  return match?.[1] ?? null;
}

interface YouTubeEmbedProps {
  src: string;
  title?: string;
  /** 9:16 phone-shaped player for Shorts and screen recordings. */
  vertical?: boolean;
}

export function YouTubeEmbed({ src, title, vertical = false }: YouTubeEmbedProps) {
  const videoId = getYouTubeId(src);
  if (!videoId) return null;

  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-800 ${vertical ? "mx-auto max-w-xs" : ""}`}
    >
      <div
        className="relative w-full"
        style={{ paddingBottom: vertical ? "177.78%" : "56.25%" }}
      >
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${videoId}`}
          title={title ?? "Video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </div>
  );
}

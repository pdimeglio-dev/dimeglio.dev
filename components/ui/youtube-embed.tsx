function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([^?&]+)/,
  );
  return match?.[1] ?? null;
}

interface YouTubeEmbedProps {
  src: string;
  title?: string;
}

export function YouTubeEmbed({ src, title }: YouTubeEmbedProps) {
  const videoId = getYouTubeId(src);
  if (!videoId) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${videoId}`}
          title={title ?? "Video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

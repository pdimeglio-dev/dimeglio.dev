import { ImageResponse } from "next/og";

/**
 * Dynamic favicon / PWA icon — generates multiple sizes.
 * Next.js auto-generates /icon-192x192.png, /icon-512x512.png etc.
 * Uses the same "PD" monogram as the Apple touch icon.
 */

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background:
            "linear-gradient(135deg, #000000 0%, #0a0a1a 50%, #0f172a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          borderRadius: "96px",
        }}
      >
        <div
          style={{
            fontSize: 240,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.04em",
          }}
        >
          PD
        </div>
      </div>
    ),
    { ...size },
  );
}

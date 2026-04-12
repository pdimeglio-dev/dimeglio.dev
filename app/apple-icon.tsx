import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Apple Touch Icon — dynamic 180×180px icon for iOS home screen bookmarks.
 * Renders a branded "PD" monogram on a dark background.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #000000 0%, #0a0a1a 50%, #0f172a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          borderRadius: "36px",
        }}
      >
        <div
          style={{
            fontSize: 80,
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

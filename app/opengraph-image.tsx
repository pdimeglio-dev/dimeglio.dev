import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt =
  "Pablo Di Meglio — Senior Full Stack Engineer · AI Native";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #000000 0%, #0a0a1a 50%, #0f172a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle gradient accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            Pablo Di Meglio
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#94a3b8",
              letterSpacing: "0.05em",
            }}
          >
            Senior Full Stack Engineer · AI Native
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#64748b",
              marginTop: "8px",
            }}
          >
            dimeglio.dev
          </div>
        </div>

        {/* Bottom border accent */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #a78bfa, #8b5cf6, #6366f1)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}

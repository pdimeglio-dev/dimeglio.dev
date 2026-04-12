import { ImageResponse } from "next/og";

/**
 * Dynamic favicon / PWA icon — "</>" closing tag symbol.
 * Classic developer branding for dimeglio.dev.
 */

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#000000",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "96px",
        }}
      >
        {/* SVG </> icon — clean geometric code brackets with slash */}
        <svg
          width="360"
          height="360"
          viewBox="0 0 360 360"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* < bracket */}
          <path
            d="M120 80 L30 180 L120 280"
            stroke="white"
            strokeWidth="32"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* / slash */}
          <path
            d="M210 60 L150 300"
            stroke="#6366f1"
            strokeWidth="28"
            strokeLinecap="round"
            fill="none"
          />
          {/* > bracket */}
          <path
            d="M240 80 L330 180 L240 280"
            stroke="white"
            strokeWidth="32"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}

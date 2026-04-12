import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Apple Touch Icon — 180×180px "</>" icon for iOS home screen bookmarks.
 * Matches the main favicon branding.
 */
export default function AppleIcon() {
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
          borderRadius: "36px",
        }}
      >
        <svg
          width="128"
          height="128"
          viewBox="0 0 360 360"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* < bracket */}
          <path
            d="M120 80 L30 180 L120 280"
            stroke="white"
            strokeWidth="36"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* / slash */}
          <path
            d="M210 60 L150 300"
            stroke="#6366f1"
            strokeWidth="32"
            strokeLinecap="round"
            fill="none"
          />
          {/* > bracket */}
          <path
            d="M240 80 L330 180 L240 280"
            stroke="white"
            strokeWidth="36"
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

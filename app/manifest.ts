import type { MetadataRoute } from "next";

/**
 * Web App Manifest — basic PWA metadata.
 * Next.js serves this at /manifest.webmanifest automatically.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "dimeglio.dev — Pablo Di Meglio",
    short_name: "dimeglio.dev",
    description:
      "Personal portfolio and blog of Pablo Di Meglio — Senior Full Stack Engineer and AI Native.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "16x16 32x32",
        type: "image/x-icon",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

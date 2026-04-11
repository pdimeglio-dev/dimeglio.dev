import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Base URL for static assets (project screenshots, etc.).
 * - Local dev / default: "" (serves from /public/)
 * - Production CDN: "https://assets.dimeglio.dev" or GCS bucket URL
 *
 * Set via NEXT_PUBLIC_CDN_URL environment variable.
 */
export const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL ?? "";

/**
 * Build a full asset URL. When CDN_URL is empty, returns the path as-is
 * (served from Next.js /public/). When set, prefixes with the CDN origin.
 *
 * @example assetUrl("/projects/proj-paddle-games/dashboard.png")
 * // local:  "/projects/proj-paddle-games/dashboard.png"
 * // cdn:    "https://assets.dimeglio.dev/projects/proj-paddle-games/dashboard.png"
 */
export function assetUrl(path: string): string {
  return `${CDN_URL}${path}`;
}

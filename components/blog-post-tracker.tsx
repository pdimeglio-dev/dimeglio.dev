"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

interface BlogPostTrackerProps {
  slug: string;
  title: string;
  tags: string[];
}

/**
 * Invisible client component that fires analytics events for a blog post:
 * - `blog_post_viewed` on mount
 * - `blog_post_scroll_depth` at 25%, 50%, 75%, and 100% thresholds
 *
 * Drop this into any blog post page as a sibling of the article content.
 */
export function BlogPostTracker({ slug, title, tags }: BlogPostTrackerProps) {
  const firedDepths = useRef(new Set<number>());

  // Fire blog_post_viewed on mount
  useEffect(() => {
    trackEvent({
      event: "blog_post_viewed",
      properties: { slug, title, tags },
    });
  }, [slug, title, tags]);

  // Scroll depth tracking
  useEffect(() => {
    const thresholds = [25, 50, 75, 100];

    function handleScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;

      const percent = Math.round((scrollTop / docHeight) * 100);

      for (const threshold of thresholds) {
        if (percent >= threshold && !firedDepths.current.has(threshold)) {
          firedDepths.current.add(threshold);
          trackEvent({
            event: "blog_post_scroll_depth",
            properties: { slug, percent: threshold },
          });
        }
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [slug]);

  return null;
}

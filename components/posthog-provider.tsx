"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initPostHog, trackPageView } from "@/lib/analytics";

/**
 * PostHog analytics provider.
 *
 * - Initialises PostHog on mount (once).
 * - Fires a `$pageview` event on every Next.js route change.
 * - Wrap this around your app content in layout.tsx.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialised = useRef(false);

  // Initialise PostHog once
  useEffect(() => {
    if (!initialised.current) {
      initPostHog();
      initialised.current = true;
    }
  }, []);

  // Track page views on route changes
  useEffect(() => {
    if (!initialised.current) return;

    const url = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    trackPageView(url);
  }, [pathname, searchParams]);

  return <>{children}</>;
}

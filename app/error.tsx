"use client";

import { useEffect } from "react";
import Link from "next/link";
import { captureError, trackEvent } from "@/lib/analytics";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    captureError(error);
    trackEvent({
      event: "error_boundary_displayed",
      properties: {
        error_message: error.message,
        digest: error.digest,
      },
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      <p className="max-w-md text-muted-foreground">
        An unexpected error occurred. You can try again or head back to the home
        page.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => unstable_retry()}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

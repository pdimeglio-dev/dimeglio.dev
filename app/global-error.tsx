"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/analytics";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    captureError(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <h2 className="text-2xl font-semibold">Something went wrong</h2>
          <p className="max-w-md text-neutral-400">
            An unexpected error occurred. You can try again or head back to the
            home page.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => unstable_retry()}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
            >
              Try again
            </button>
            <button
              onClick={() => { window.location.href = "/"; }}
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-800"
            >
              Go home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

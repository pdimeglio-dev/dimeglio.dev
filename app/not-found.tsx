import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you're looking for doesn't exist.",
};

/**
 * Custom 404 page — branded dark theme with helpful navigation.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        404
      </p>
      <h1 className="mt-4 text-4xl font-bold tracking-tighter sm:text-5xl">
        Page not found
      </h1>
      <p className="mt-4 max-w-md text-base text-zinc-400 leading-relaxed">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
        >
          Go home
        </Link>
        <Link
          href="/blog"
          className="rounded-lg border border-slate-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:border-slate-700"
        >
          Read the blog
        </Link>
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Menu, Download } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/experience", label: "Experience" },
  { href: "/projects", label: "Projects" },
  { href: "/blog", label: "Blog" },
];

const RESUME_URL = "/pablo-di-meglio-resume.pdf";

/**
 * Sticky frosted-glass top navigation bar.
 * Desktop: inline nav links + Download CV button.
 * Mobile: hamburger → slide-out Sheet with nav + Download CV.
 */
export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-slate-800 bg-black/50 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="transition-opacity hover:opacity-80"
          aria-label="Home"
          onClick={() =>
            trackEvent({
              event: "nav_link_clicked",
              properties: { href: "/", label: "Home (icon)", from_page: pathname },
            })
          }
        >
          <Home className="h-5 w-5" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          <ul className="flex items-center gap-1">
            {navLinks.map(({ href, label }) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname.startsWith(href);

              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "text-white"
                        : "text-muted-foreground hover:text-white",
                    )}
                    onClick={() =>
                      trackEvent({
                        event: "nav_link_clicked",
                        properties: { href, label, from_page: pathname },
                      })
                    }
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Download CV button */}
          <a
            href={RESUME_URL}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="ml-4 inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-slate-500 hover:text-white"
            onClick={() =>
              trackEvent({
                event: "resume_downloaded",
                properties: {},
              })
            }
          >
            <Download className="h-3.5 w-3.5" />
            Resume
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="p-2 text-white transition-opacity hover:opacity-80 md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Mobile sheet */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="right"
            className="w-64 border-slate-800 bg-black"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <nav className="flex flex-col gap-2 pt-8">
              {navLinks.map(({ href, label }) => {
                const isActive =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);

                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => {
                      setMobileOpen(false);
                      trackEvent({
                        event: "nav_link_clicked",
                        properties: { href, label, from_page: pathname },
                      });
                    }}
                    className={cn(
                      "rounded-md px-4 py-3 text-base transition-colors",
                      isActive
                        ? "text-white bg-slate-800/50"
                        : "text-muted-foreground hover:text-white hover:bg-slate-800/30",
                    )}
                  >
                    {label}
                  </Link>
                );
              })}

              {/* Mobile Download CV */}
              <a
                href={RESUME_URL}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="mt-4 flex items-center gap-2 rounded-md border border-slate-700 px-4 py-3 text-base text-muted-foreground transition-colors hover:border-slate-500 hover:text-white"
                onClick={() => {
                  setMobileOpen(false);
                  trackEvent({
                    event: "resume_downloaded",
                    properties: {},
                  });
                }}
              >
                <Download className="h-4 w-4" />
                Download Resume
              </a>
            </nav>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}

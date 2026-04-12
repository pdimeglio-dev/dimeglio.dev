"use client";

import Link from "next/link";
import { IconBrandLinkedin, IconBrandGithub, IconRss } from "@tabler/icons-react";
import { trackEvent } from "@/lib/analytics";

const socialLinks = [
  {
    href: "https://www.linkedin.com/in/dimegliopablo/",
    label: "LinkedIn",
    icon: IconBrandLinkedin,
  },
  {
    href: "https://github.com/pdimeglio-dev",
    label: "GitHub",
    icon: IconBrandGithub,
  },
  {
    href: "/feed.xml",
    label: "RSS Feed",
    icon: IconRss,
  },
] as const;

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/experience", label: "Experience" },
  { href: "/projects", label: "Projects" },
  { href: "/blog", label: "Blog" },
] as const;

/**
 * Site-wide footer — social links, secondary navigation, and copyright.
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-black">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 py-12 md:flex-row md:justify-between">
        {/* Nav links */}
        <nav className="flex flex-wrap items-center justify-center gap-6">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-muted-foreground transition-colors hover:text-white"
              onClick={() =>
                trackEvent({
                  event: "nav_link_clicked",
                  properties: { href, label, from_page: "footer" },
                })
              }
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Social icons */}
        <div className="flex items-center gap-4">
          {socialLinks.map(({ href, label, icon: Icon }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="text-muted-foreground transition-colors hover:text-white"
              aria-label={label}
              onClick={() =>
                trackEvent({
                  event: "social_link_clicked",
                  properties: { platform: label, href },
                })
              }
            >
              <Icon className="h-5 w-5" stroke={1.5} />
            </a>
          ))}
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-slate-800/50 px-6 py-4">
        <p className="text-center text-xs text-muted-foreground/60">
          © {currentYear} Pablo Di Meglio. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

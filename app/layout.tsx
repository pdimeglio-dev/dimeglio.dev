import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { PostHogProvider } from "@/components/posthog-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AIOrb } from "@/components/ai-orb";
import { JsonLd, websiteSchema } from "@/components/json-ld";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: {
    default: "Pablo Di Meglio — Senior Full Stack Engineer · AI Native",
    template: "%s | Pablo Di Meglio",
  },
  description:
    "Personal portfolio and blog of Pablo Di Meglio — Senior Full Stack Engineer and AI Native. Building software that thinks.",
  metadataBase: new URL("https://dimeglio.dev"),
  keywords: [
    "Pablo Di Meglio",
    "full stack engineer",
    "AI native",
    "senior software engineer",
    "portfolio",
    "React",
    "TypeScript",
    "Next.js",
    "Angular",
    "Node.js",
    "Google Cloud",
    "AI architecture",
    "system design",
  ],
  alternates: {
    canonical: "https://dimeglio.dev",
    types: {
      "application/rss+xml": "https://dimeglio.dev/feed.xml",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "dimeglio.dev",
    title: "Pablo Di Meglio — Senior Full Stack Engineer · AI Native",
    description:
      "Personal portfolio and blog of Pablo Di Meglio — Senior Full Stack Engineer and AI Native. Building software that thinks.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pablo Di Meglio — Senior Full Stack Engineer · AI Native",
    description:
      "Personal portfolio and blog. Building software that thinks.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen overflow-x-hidden bg-background text-foreground antialiased">
        {/* Skip-to-content link for keyboard/screen-reader users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-black"
        >
          Skip to content
        </a>
        <JsonLd data={websiteSchema()} />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          disableTransitionOnChange
        >
          <Suspense fallback={null}>
            <PostHogProvider>
              <Header />
              <div id="main-content" className="pt-16">{children}</div>
              <Footer />
              <AIOrb />
            </PostHogProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}

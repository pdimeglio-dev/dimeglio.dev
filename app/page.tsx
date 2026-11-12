import type { Metadata } from "next";
import { Hero } from "@/components/hero";
import { BentoGrid } from "@/components/bento-grid";
import { FeaturedBuilds } from "@/components/home/featured-builds";
import { LogoTicker } from "@/components/home/logo-ticker";
import { SkillsMarquee } from "@/components/home/skills-marquee";
import { JsonLd, personSchema } from "@/components/json-ld";
// import { AIOrb } from "@/components/ai-orb";

export const metadata: Metadata = {
  description:
    "Pablo Di Meglio is a Full Stack Engineer and AI Native with 17 years of experience at Google, Disney, Wells Fargo, and more. Building software that thinks.",
  alternates: {
    canonical: "https://dimeglio.dev",
  },
};

export default function Home() {
  return (
    <main className="flex flex-col gap-24 pb-24 md:gap-32 md:pb-32">
      <JsonLd data={personSchema()} />
      <Hero />
      <FeaturedBuilds />
      <BentoGrid />
      <LogoTicker />
      <SkillsMarquee />
      {/* <AIOrb /> */}
    </main>
  );
}

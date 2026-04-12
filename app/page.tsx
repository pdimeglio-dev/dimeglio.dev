import { Hero } from "@/components/hero";
import { BentoGrid } from "@/components/bento-grid";
import { LogoTicker } from "@/components/home/logo-ticker";
import { SkillsMarquee } from "@/components/home/skills-marquee";
// import { AIOrb } from "@/components/ai-orb";

export default function Home() {
  return (
    <main className="flex flex-col gap-24 pb-24 md:gap-32 md:pb-32">
      <Hero />
      <BentoGrid />
      <LogoTicker />
      <SkillsMarquee />
      {/* <AIOrb /> */}
    </main>
  );
}

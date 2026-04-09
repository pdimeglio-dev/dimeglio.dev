import { Hero } from "@/components/hero";
import { BentoGrid } from "@/components/bento-grid";
import { AIOrb } from "@/components/ai-orb";

export default function Home() {
  return (
    <main>
      <Hero />
      <BentoGrid />
      <AIOrb />
    </main>
  );
}

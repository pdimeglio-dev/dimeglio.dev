import { getAllUniqueSkills } from "@/lib/mdx";
import { InfiniteMovingSkills } from "@/components/ui/infinite-moving-skills";

/**
 * Skills marquee — fetches all unique tech skills from every project's
 * techStack and renders them as an infinitely scrolling pill strip
 * using the Aceternity animation pattern.
 */
export function SkillsMarquee() {
  const skills = getAllUniqueSkills();

  return (
    <section className="mx-auto max-w-5xl px-6">
      <p className="text-center text-sm uppercase tracking-widest text-muted-foreground">
        Building blocks
      </p>

      <div className="mt-6 flex justify-center">
        <InfiniteMovingSkills
          items={skills}
          direction="left"
          speed="slow"
        />
      </div>
    </section>
  );
}

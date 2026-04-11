import Image from "next/image";
import Link from "next/link";

/**
 * Logo data: each entry maps a company logo to its experience timeline anchor.
 * SVGs in /public/logos/ are pre-cropped (no internal padding), so a single
 * uniform height + max-width constraint handles all aspect ratios cleanly.
 *
 * When adding a new company, add its SVG to /public/logos/ and add an entry here.
 */
const logos = [
  { src: "/logos/google.svg", alt: "Google", href: "/experience#exp-google-agile-modeling" },
  { src: "/logos/disney.svg", alt: "Disney", href: "/experience#exp-disney-studios" },
  { src: "/logos/globant.svg", alt: "Globant", href: "/experience" },
  { src: "/logos/rpotential.svg", alt: "rPotential", href: "/experience#exp-rpotential" },
  { src: "/logos/mission-lane.svg", alt: "Mission Lane", href: "/experience#exp-mission-lane" },
  { src: "/logos/wells-fargo.svg", alt: "Wells Fargo", href: "/experience#exp-wells-fargo" },
  { src: "/logos/pccw-global.svg", alt: "PCCW Global", href: "/experience#exp-pccw-global" },
  { src: "/logos/argentina-gob-ar.svg", alt: "Argentina Gobierno", href: "/experience#exp-globant-educar" },
] as const;

/**
 * "Where I've built" logo strip — displays company logos in a centered flex row.
 * Each logo links to the corresponding experience timeline anchor.
 */
export function LogoTicker() {
  return (
    <section id="logos" className="mx-auto max-w-5xl px-6">
      <p className="text-center text-sm uppercase tracking-widest text-muted-foreground">
        Where I&apos;ve built
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-6 md:gap-10">
        {logos.map((logo) => (
          <Link
            key={logo.alt}
            href={logo.href}
            className="flex-shrink-0"
          >
            <Image
              src={logo.src}
              alt={logo.alt}
              width={200}
              height={60}
              className="h-7 md:h-9 w-auto max-w-28 md:max-w-40 object-contain grayscale opacity-50 transition-all duration-300 hover:grayscale-0 hover:opacity-100"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}

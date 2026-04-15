/**
 * Exhaustive list of valid content slugs for the chat widgets.
 * These are derived from the actual filenames in /content/projects/ and /content/experience/.
 *
 * If you add a new MDX file, add its slug here too — otherwise the chat widget
 * will not link to it (better: a broken link that goes nowhere).
 */

export const VALID_PROJECT_SLUGS = new Set([
  "proj-assursoft-insurance",
  "proj-batcave",
  "proj-disney-o2i-support",
  "proj-disney-o2i",
  "proj-disney-parks-api",
  "proj-educar-mi-escritorio",
  "proj-google-ams",
  "proj-google-outfits",
  "proj-google-shopping",
  "proj-iberdrola-f3",
  "proj-mission-lane-infra",
  "proj-paddle-games",
  "proj-pccw-migration",
  "proj-rpotential-cli",
  "proj-rpotential-genui",
  "proj-rpotential-sdui-library",
  "proj-rpotential-testing",
  "proj-wells-fargo-modernization",
]);

export const VALID_EXPERIENCE_SLUGS = new Set([
  "exp-accenture",
  "exp-disney-parks",
  "exp-disney-studios",
  "exp-globant-educar",
  "exp-google-agile-modeling",
  "exp-google-cloud-studio",
  "exp-google-shopping",
  "exp-mission-lane",
  "exp-pccw-global",
  "exp-rpotential",
  "exp-vmn-plus",
  "exp-wells-fargo",
  // certifications & education (anchor targets on /experience)
  "cert-ai-engineer",
  "cert-ai-leader",
  "cert-gcp",
  "cert-rxjs",
  "edu-info-systems",
  "edu-systems-analyst",
]);

/**
 * Logo files available in /public/logos/, mapping basename → extension.
 * Personal-project logos live here alongside company logos.
 */
export const KNOWN_LOGOS: Record<string, "svg" | "png"> = {
  "argentina-gob-ar": "svg",
  batcave: "svg",
  disney: "svg",
  globant: "svg",
  google: "svg",
  "mission-lane": "svg",
  "paddle-games": "png",
  "pccw-global": "svg",
  rpotential: "svg",
  "wells-fargo": "svg",
};

export function getLogoSrc(logoFile?: string): string | null {
  if (!logoFile) return null;
  const ext = KNOWN_LOGOS[logoFile];
  return ext ? `/logos/${logoFile}.${ext}` : null;
}

/**
 * Returns a deep link href if the slug is a known valid content slug,
 * or null if the slug is hallucinated / unknown.
 *
 *   exp-* → /experience#{slug}
 *   proj-* → /projects?projectId={slug}
 */
export function getValidHref(slug?: string): string | null {
  if (!slug) return null;
  if (VALID_EXPERIENCE_SLUGS.has(slug)) return `/experience#${slug}`;
  if (VALID_PROJECT_SLUGS.has(slug)) return `/projects?projectId=${slug}`;
  return null; // slug not in known content — suppress the link
}

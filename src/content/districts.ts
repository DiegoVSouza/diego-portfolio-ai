import type { Text } from "colagem-ui";

/**
 * The home is a journey through six districts of one city. Each district holds some projects (by slug) or a part of the page.
 * No digit appears in the copy: numbers come from the district's position, never from text (EV-001).
 */
export type DistrictId = "arrival" | "ops" | "core" | "platform" | "craft" | "terminal";

export interface District {
  id: DistrictId;
  /** Projects this district holds, in the order they appear. */
  slugs: string[];
  name: Text;
  /** One line for the menu's description box. */
  blurb: Text;
}

const t = (en: string, pt: string): Text => ({ en, pt });

export const districts: District[] = [
  { id: "arrival", slugs: [], name: t("Arrival", "Chegada"), blurb: t("Who I am, the proof, and where to start.", "Quem sou, a prova e por onde começar.") },
  { id: "ops", slugs: ["supportops"], name: t("SupportOps", "SupportOps"), blurb: t("The flagship: a live refund flow where AI drafts and a second person approves.", "O carro-chefe: um fluxo de reembolso ao vivo em que a IA rascunha e uma segunda pessoa aprova.") },
  { id: "core", slugs: ["foundation", "agents", "toolkit"], name: t("AI core", "Núcleo de IA"), blurb: t("The contracts, the agents and the safety layer every project shares.", "Os contratos, os agentes e a camada de segurança que todo projeto compartilha.") },
  { id: "platform", slugs: ["observability", "async"], name: t("Platform", "Plataforma"), blurb: t("See what an agent did, and work that survives a dead worker.", "Ver o que um agente fez, e trabalho que sobrevive a um worker morto.") },
  { id: "craft", slugs: ["design-system", "harness"], name: t("Craft", "Ofício"), blurb: t("This site, its design system, and the harness that built it.", "Este site, seu design system e o harness que o construiu.") },
  { id: "terminal", slugs: [], name: t("Terminal", "Terminal"), blurb: t("About me, and how to reach me.", "Sobre mim e como falar comigo.") },
];

/** Index of the district that holds a project. A project in no district opens the first stop. */
export function districtOf(slug: string): number {
  const i = districts.findIndex((d) => d.slugs.includes(slug));
  return i < 0 ? 0 : i;
}

/**
 * The journey has one stop per card: the camera parks at each, and the card hangs in that part of the city. A district is a part of the
 * city that holds one or more stops; the menu lists districts, the keys step through stops.
 */
export interface Stop {
  id: string;
  /** Index into `districts`. */
  district: number;
  /** The project this stop shows; none for the arrival and the terminal. */
  slug?: string;
  /** A wider card (the hero and the terminal). */
  wide?: boolean;
}

export const stops: Stop[] = [
  { id: "arrival", district: 0, wide: true },
  { id: "supportops", district: 1, slug: "supportops" },
  { id: "foundation", district: 2, slug: "foundation" },
  { id: "agents", district: 2, slug: "agents" },
  { id: "toolkit", district: 2, slug: "toolkit" },
  { id: "observability", district: 3, slug: "observability" },
  { id: "async", district: 3, slug: "async" },
  { id: "design-system", district: 4, slug: "design-system" },
  { id: "harness", district: 4, slug: "harness" },
  { id: "terminal", district: 5, wide: true },
];

/** Index of the stop that shows a project (the first stop when there is none). */
export function stopOf(slug: string): number {
  const i = stops.findIndex((s) => s.slug === slug);
  return i < 0 ? 0 : i;
}

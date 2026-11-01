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

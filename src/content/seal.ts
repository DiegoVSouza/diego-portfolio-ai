import raw from "../data/catalog.generated.json";
import type { Text } from "colagem-ui";

export type SealKind = "full" | "partial" | "warn" | "none" | "fail";
export interface CatalogFeature {
  id: string;
  description: string;
  status: string;
  evidence: string;
  state: "verified" | "claimed" | "partial" | "open" | "unrecorded";
}
export interface Catalog {
  meta: Record<string, { version: string; repo: string }>;
  projects: Record<string, CatalogFeature[]>;
}

/** Which catalog records a card speaks for. The seal reads these records and nothing else. */
export const CARD_PROJECTS: Record<string, string[]> = {
  supportops: ["p05", "p06"],
  foundation: ["p00"],
  agents: ["p01"],
  toolkit: ["p02"],
  observability: ["p03"],
  async: ["p04"],
  "design-system": ["p07", "p08"],
  harness: ["lab"],
};

// Words for the tokens the feature lists use. A token with no entry is shown as written, in English, never dropped.
const WORDS: Record<string, Text> = {
  "live smoke": { en: "live smoke", pt: "smoke live" },
  "fly deploy": { en: "Fly deploy", pt: "deploy no Fly" },
  "real stack e2e": { en: "real-stack e2e", pt: "e2e na stack real" },
  "pages deploy": { en: "Pages deploy", pt: "deploy no Pages" },
  "external idp acceptance": { en: "third-party IdP", pt: "IdP de terceiro" },
  "external idp": { en: "third-party IdP", pt: "IdP de terceiro" },
  "external identity": { en: "external identity", pt: "identidade externa" },
  "semantic quality": { en: "semantic quality", pt: "qualidade semântica" },
  "model quality and human review": { en: "model quality and human review", pt: "qualidade do modelo e revisão humana" },
  production: { en: "production", pt: "produção" },
  "production acceptance": { en: "production acceptance", pt: "aceitação em produção" },
  "review and promotion": { en: "review and promotion", pt: "revisão e promoção" },
  "service integration": { en: "service integration", pt: "integração de serviços" },
  "screen reader": { en: "screen reader", pt: "leitor de tela" },
  "device fps": { en: "device FPS", pt: "FPS em aparelho" },
  "third party idp": { en: "third-party IdP", pt: "IdP de terceiro" },
  "turnstile start flow": { en: "Turnstile start flow", pt: "fluxo de início com Turnstile" },
  provisional: { en: "provisional failure", pt: "reprovação provisória" },
  "clean tree deploy": { en: "clean-tree deploy", pt: "deploy com árvore limpa" },
  "hosted ci p07": { en: "P07 hosted CI", pt: "CI hospedado do P07" },
  "p07 hosted ci": { en: "P07 hosted CI", pt: "CI hospedado do P07" },
  "finding triage": { en: "secret-finding triage", pt: "triagem dos achados de segredo" },
  "local service e2e": { en: "local service e2e", pt: "e2e de serviços locais" },
};

function humanize(token: string): string {
  return token
    .replace(/^(INCOMPLETE|PENDING|FAIL)_/i, "")
    .replace(/_(PENDING|INCOMPLETE)$/i, "")
    .replace(/_/g, " ")
    .toLowerCase()
    .trim();
}

function readable(id: string): string {
  return id.replace(/[-_]/g, " ").toLowerCase();
}

/** The open axes of a set of features, in record order and without repeats. */
export function axesOf(features: CatalogFeature[]): string[] {
  const out: string[] = [];
  for (const f of features) {
    if (f.state === "verified") continue;
    const tokens = f.status
      .split(";")
      .map((s) => s.trim())
      .filter((s) => /PENDING|INCOMPLETE|FAIL|incomplete/.test(s));
    const names = tokens.length
      ? tokens.map((tok) => (/^(PENDING|INCOMPLETE|incomplete)$/.test(tok) || /^passes: /.test(tok) ? readable(f.id) : humanize(tok)))
      : [readable(f.id)];
    for (const name of names) if (!out.includes(name)) out.push(name);
  }
  return out;
}

const SHOWN = 3;

export function sealFor(ids: string[], catalog: Catalog = raw as unknown as Catalog): { kind: SealKind; label: Text } {
  const features = ids.flatMap((id) => catalog.projects[id] ?? []);
  if (!features.length) return { kind: "none", label: { en: "no feature record", pt: "sem registro de funcionalidades" } };
  const verified = features.filter((f) => f.state === "verified").length;
  const axes = axesOf(features);
  const shown = axes.slice(0, SHOWN);
  const more = axes.length - shown.length;
  const en = (a: string) => WORDS[a]?.en ?? a;
  const pt = (a: string) => WORDS[a]?.pt ?? a;
  const tail = (fn: (a: string) => string, word: string) => (shown.length ? `; ${word}: ${shown.map(fn).join(", ")}${more > 0 ? ` +${more}` : ""}` : "");
  const kind: SealKind = features.some((f) => /FAIL/.test(f.status)) ? "fail" : verified === features.length ? "full" : "partial";
  return {
    kind,
    label: {
      en: `${verified} of ${features.length} features verified${tail(en, "open")}`,
      pt: `${verified} de ${features.length} funcionalidades verificadas${tail(pt, "em aberto")}`,
    },
  };
}

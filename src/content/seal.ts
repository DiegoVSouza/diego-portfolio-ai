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

// What a visitor reads for each open axis. Several raw tokens can mean one thing to a reader, so each maps to one group and the group
// is shown once. An axis with no entry is shown as written (English), and status-truth.test.ts fails while any axis in the catalog has none.
const G = (en: string, pt: string): Text => ({ en, pt });
const GROUPS: Record<string, Text> = {
  idp: G("a third-party identity provider", "um provedor de identidade de terceiro"),
  quality: G("model-quality evaluation with human review", "avaliação de qualidade do modelo com revisão humana"),
  toolkitQuality: G("cost, latency and quality against a real model", "custo, latência e qualidade com modelo real"),
  rag: G("RAG and refusal against a real model", "RAG e recusa com modelo real"),
  frameworkQuality: G("a quality comparison between frameworks", "comparação de qualidade entre frameworks"),
  modelMetrics: G("model metrics", "métricas do modelo"),
  prodMetrics: G("production metrics", "métricas em produção"),
  prodAcceptance: G("acceptance in production", "aceitação em produção"),
  serviceIntegration: G("service integration of the privacy checks", "integração de serviços nas checagens de privacidade"),
  provisional: G("a provisional failure awaiting review", "uma reprovação provisória aguardando revisão"),
  localServices: G("a run against local services", "uma execução contra serviços locais"),
  review: G("a screen-reader pass and an owner review", "passagem com leitor de tela e revisão do dono"),
  turnstile: G("the human-check start flow, end to end", "o fluxo de início com verificação humana, de ponta a ponta"),
  fps: G("frame rate on a real phone", "taxa de quadros em um celular real"),
  threeD: G("the 3D level as a package feature", "o nível 3D como recurso do pacote"),
  checklists: G("open verification checklists", "listas de verificação em aberto"),
  linuxScript: G("a tested Linux clean-check script", "script de checagem limpa no Linux testado"),
  liveSmoke: G("a live smoke run", "um smoke live"),
  flyDeploy: G("a Fly deploy", "deploy no Fly"),
  stackE2e: G("an end-to-end run on the real stack", "e2e na stack real"),
  pagesDeploy: G("a Pages deploy", "deploy no Pages"),
  cleanDeploy: G("a deploy from a clean tree", "deploy com árvore limpa"),
  hostedCi: G("a green hosted CI", "CI hospedado verde"),
  findings: G("triage of the secret-scan findings", "triagem dos achados do scan de segredos"),
};
const AXIS_GROUP: Record<string, string> = {
  "log content privacy and production metrics": "prodAcceptance",
  "triaged 34 files; evidence and independent review": "checklists",
  "triaged 34 files": "checklists", "evidence and independent review": "checklists",
  "third party idp": "idp", "external idp": "idp", "external idp acceptance": "idp", "external identity": "idp", "external idp and queued job revocation": "idp",
  "semantic quality": "quality", "real model evaluation": "quality", "model quality and human review": "quality",
  "cost latency model quality": "toolkitQuality", "external rag and model refusal": "rag", "framework quality metrics": "frameworkQuality",
  "p04 model metrics": "modelMetrics", "production metrics": "prodMetrics", "production acceptance": "prodAcceptance", production: "prodAcceptance",
  "service integration": "serviceIntegration", provisional: "provisional", "review and promotion": "provisional", "local service e2e": "localServices",
  "screen reader and owner squint review": "review", "screen reader": "review", "squint review by owner": "review",
  "turnstile start flow": "turnstile", "device fps": "fps", "level 2 3d": "threeD", "verify checklists closed": "checklists", "linux clean check script": "linuxScript",
  "live smoke": "liveSmoke", "fly deploy": "flyDeploy", "real stack e2e": "stackE2e", "pages deploy": "pagesDeploy", "clean tree deploy": "cleanDeploy",
  "hosted ci p07": "hostedCi", "p07 hosted ci": "hostedCi", "hosted ci": "hostedCi", "finding triage": "findings",
};

/** The group an open axis reads as, and its text. An axis nobody described reads as itself. */
export function describeAxis(axis: string): { key: string; text: Text; known: boolean } {
  const key = AXIS_GROUP[axis];
  return key ? { key, text: GROUPS[key]!, known: true } : { key: axis, text: { en: axis, pt: axis }, known: false };
}

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
  const groups = new Map<string, Text>();
  for (const axis of axesOf(features)) {
    const d = describeAxis(axis);
    if (!groups.has(d.key)) groups.set(d.key, d.text);
  }
  const all = [...groups.values()];
  const shown = all.slice(0, SHOWN);
  const more = all.length - shown.length;
  const tail = (lang: "en" | "pt", word: string) => (shown.length ? `; ${word}: ${shown.map((g) => g[lang]).join(", ")}${more > 0 ? ` +${more}` : ""}` : "");
  const kind: SealKind = features.some((f) => /FAIL/.test(f.status)) ? "fail" : verified === features.length ? "full" : "partial";
  return {
    kind,
    label: {
      en: `${verified} of ${features.length} features verified${tail("en", "open")}`,
      pt: `${verified} de ${features.length} funcionalidades verificadas${tail("pt", "em aberto")}`,
    },
  };
}

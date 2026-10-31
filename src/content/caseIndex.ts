import type { Text } from "colagem-ui";

export type Seal = "full" | "partial" | "warn" | "none" | "fail";

/** What a card and the shell need: on every page, and on the home page. Case detail lives in cases.ts. */
export interface CaseCard {
  slug: string;
  /** Project number(s) as shown on the card, e.g. "05". */
  n: string;
  ids: string;
  repo: string;
  /** Repository key for permalinks (p05 ...). */
  repoKey: string;
  name: Text;
  outcome: Text;
  hook: Text;
  group: Text;
  seal: { kind: Seal; label: Text };
}

const t = (en: string, pt: string): Text => ({ en, pt });

export const caseCards: CaseCard[] = [
  {
    slug: "supportops",
    n: "05",
    ids: "P05 + P06",
    repo: "supportops-platform",
    repoKey: "p05",
    name: t("SupportOps", "SupportOps"),
    outcome: t("A support platform where AI can draft a refund, but only a second person can approve it.", "Uma plataforma de suporte em que a IA pode rascunhar um reembolso, mas só uma segunda pessoa pode aprová-lo."),
    hook: t("Try to approve your own refund.", "Tente aprovar o seu próprio reembolso."),
    group: t("Flagship", "Carro-chefe"),
    seal: { kind: "partial", label: t("verified offline, live smoke pending", "verificado offline, smoke live pendente") },
  },
  {
    slug: "foundation",
    n: "00",
    ids: "P00",
    repo: "supportops-foundation",
    repoKey: "p00",
    name: t("Foundation and live evals", "Foundation e evals live"),
    outcome: t("The contracts every project shares, and the evaluation that told me my agent was not ready.", "Os contratos que todo projeto compartilha, e a avaliação que me disse que meu agente não estava pronto."),
    hook: t("The failure is the proof.", "A falha é a prova."),
    group: t("AI core", "Núcleo de IA"),
    seal: { kind: "fail", label: t("failed provisionally, reported", "reprovado provisoriamente, publicado") },
  },
  {
    slug: "agents",
    n: "01",
    ids: "P01",
    repo: "supportops-agents",
    repoKey: "p01",
    name: t("Multi-agent orchestration", "Orquestração multiagente"),
    outcome: t("Multi-agent triage with a bounded loop, compared across frameworks on the same contract.", "Triagem multiagente com laço limitado, comparada entre frameworks no mesmo contrato."),
    hook: t("Agents need a stop condition.", "Agentes precisam de uma condição de parada."),
    group: t("AI core", "Núcleo de IA"),
    seal: { kind: "partial", label: t("offline verified, quality pending", "verificado offline, qualidade pendente") },
  },
  {
    slug: "toolkit",
    n: "02",
    ids: "P02",
    repo: "supportops-ai-toolkit",
    repoKey: "p02",
    name: t("Production AI toolkit", "Toolkit de IA para produção"),
    outcome: t("The boring safety layer that keeps an agent from hurting production.", "A camada chata de segurança que impede um agente de machucar a produção."),
    hook: t("Retries are a safety decision.", "Retry é uma decisão de segurança."),
    group: t("AI core", "Núcleo de IA"),
    seal: { kind: "partial", label: t("fixtures verified, quality not claimed", "fixtures verificadas, qualidade não afirmada") },
  },
  {
    slug: "observability",
    n: "03",
    ids: "P03",
    repo: "supportops-observability",
    repoKey: "p03",
    name: t("Agent observability", "Observabilidade de agentes"),
    outcome: t("See what an agent did without storing what users said.", "Ver o que um agente fez sem guardar o que os usuários disseram."),
    hook: t("Observability without surveillance.", "Observabilidade sem vigilância."),
    group: t("Platform", "Plataforma"),
    seal: { kind: "partial", label: t("service gate verified, production telemetry pending", "gate de serviços verificado, telemetria de produção pendente") },
  },
  {
    slug: "async",
    n: "04",
    ids: "P04",
    repo: "supportops-async",
    repoKey: "p04",
    name: t("Durable async workflows", "Workflows assíncronos duráveis"),
    outcome: t("Agent work that survives a worker dying mid-task.", "Trabalho de agente que sobrevive à morte de um worker no meio da tarefa."),
    hook: t("Kill the worker. The task continues.", "Mate o worker. A tarefa continua."),
    group: t("Platform", "Plataforma"),
    seal: { kind: "partial", label: t("isolated gate verified, no cloud run", "gate isolado verificado, sem execução em nuvem") },
  },
  {
    slug: "design-system",
    n: "07",
    ids: "P07 + P08",
    repo: "diego-portfolio-ai",
    repoKey: "p07",
    name: t("This site and its design system", "Este site e seu design system"),
    outcome: t("A design system with contrast checked by tests, and a site that refuses unproven numbers.", "Um design system com contraste verificado por testes, e um site que recusa números sem prova."),
    hook: t("This page has tests too.", "Esta página também tem testes."),
    group: t("Craft", "Ofício"),
    seal: { kind: "partial", label: t("local gates pass, not published yet", "gates locais passam, ainda não publicado") },
  },
  {
    slug: "harness",
    n: "08",
    ids: "Lab",
    repo: "ai-engineer-lab",
    repoKey: "lab",
    name: t("The engineering harness", "O harness de engenharia"),
    outcome: t("The engineering system that built all of the above with coding agents.", "O sistema de engenharia que construiu tudo isso com agentes de código."),
    hook: t("How I direct AI to build.", "Como eu dirijo a IA para construir."),
    group: t("Craft", "Ofício"),
    seal: { kind: "partial", label: t("process in use, outcome per project", "processo em uso, resultado por projeto") },
  },
];

export const cardBySlug = (slug: string): CaseCard | undefined => caseCards.find((c) => c.slug === slug);

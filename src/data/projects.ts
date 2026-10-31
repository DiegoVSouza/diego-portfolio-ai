import raw from "./catalog.generated.json";

export type Lang = "en" | "pt";
export type State = "verified" | "claimed" | "partial" | "open";
export type Text = Record<Lang, string>;

export interface Feature {
  id: string;
  description: string;
  status: string;
  evidence: string;
  state: State;
}

export interface Project {
  id: string;
  name: string;
  role: Text;
  summary: Text;
  proves: Text;
  version: string;
  repo: string;
  features: Feature[];
  limits: Limit[];
}

// A limit the project's own docs state, shown even when its feature list has no open item.
export interface Limit {
  text: Text;
  source: string;
}

// Curated text only. Version, repository and every feature row come from the generated catalog.
const curated: Record<string, { name: string; role: Text; summary: Text; proves: Text }> = {
  p00: {
    name: "SupportOps Foundation",
    role: { en: "Shared contracts", pt: "Contratos compartilhados" },
    summary: {
      en: "Versioned Python library with domain models, deterministic datasets, a testkit and provider-neutral LLM contracts.",
      pt: "Biblioteca Python versionada com modelos de domínio, datasets determinísticos, testkit e contratos de LLM neutros a provedor.",
    },
    proves: {
      en: "Fake, replay and live modes share one budget ledger, so control logic is testable without a provider.",
      pt: "Os modos fake, replay e live compartilham um ledger de orçamento, então a lógica de controle é testável sem provedor.",
    },
  },
  p01: {
    name: "SupportOps Agents",
    role: { en: "Multi-agent orchestration", pt: "Orquestração multiagente" },
    summary: {
      en: "Deterministic supervisor-worker runner behind a common TriageRunner contract, with framework adapters.",
      pt: "Runner supervisor-worker determinístico atrás de um contrato TriageRunner comum, com adaptadores de frameworks.",
    },
    proves: {
      en: "Bounded loops and stop conditions, with the same ticket triaged by several runners.",
      pt: "Laços limitados e condições de parada, com o mesmo ticket triado por vários runners.",
    },
  },
  p02: {
    name: "SupportOps AI Toolkit",
    role: { en: "Production AI toolkit", pt: "Toolkit de IA para produção" },
    summary: {
      en: "Standard-library toolkit for tool schemas, resilient execution, code-first evals, safety controls and cost helpers.",
      pt: "Toolkit em biblioteca padrão para schemas de tools, execução resiliente, evals code-first, controles de segurança e custo.",
    },
    proves: {
      en: "Safe retries, step and time limits, and an adversarial suite. Fixtures are not production measurements.",
      pt: "Retries seguros, limites de passos e tempo, e suíte adversarial. Fixtures não são medições de produção.",
    },
  },
  p03: {
    name: "SupportOps Observability",
    role: { en: "Agent observability", pt: "Observabilidade de agentes" },
    summary: {
      en: "OpenTelemetry traces, trace-correlated logs, Prometheus metrics and deterministic loop detection for agent workflows.",
      pt: "Traces OpenTelemetry, logs correlacionados, métricas Prometheus e detecção determinística de loops para workflows de agentes.",
    },
    proves: {
      en: "Content capture is off by default, and span status text stays content-free.",
      pt: "A captura de conteúdo vem desligada e o texto de status dos spans não carrega conteúdo.",
    },
  },
  p04: {
    name: "SupportOps Async Platform",
    role: { en: "Durable async workflows", pt: "Workflows assíncronos duráveis" },
    summary: {
      en: "FastAPI and worker service for durable, asynchronous support workflows with leases, retries and recovery.",
      pt: "Serviço FastAPI e worker para workflows de suporte assíncronos e duráveis, com leases, retries e recuperação.",
    },
    proves: {
      en: "Redis Streams and SQS-style retry/DLQ paths pass service tests. Model metrics stay PENDING.",
      pt: "Caminhos Redis Streams e retry/DLQ estilo SQS passam em testes de serviço. Métricas de modelo seguem PENDING.",
    },
  },
  p05: {
    name: "SupportOps Platform",
    role: { en: "Tenant-scoped support API", pt: "API de suporte multi-tenant" },
    summary: {
      en: "Tenant-scoped API with deterministic RAG, an MCP tool boundary, async tasks and human approval for refunds.",
      pt: "API multi-tenant com RAG determinístico, fronteira de tools via MCP, tarefas assíncronas e aprovação humana de reembolsos.",
    },
    proves: {
      en: "Dual control: a requester cannot approve their own refund. External identity provider acceptance is still open.",
      pt: "Controle duplo: quem pede o reembolso não aprova. A aceitação em provedor de identidade externo ainda está aberta.",
    },
  },
  p06: {
    name: "SupportOps Console",
    role: { en: "Browser console", pt: "Console no navegador" },
    summary: {
      en: "React console for P05: sign-in with PKCE, tickets, triage tasks and refund approvals.",
      pt: "Console React para o P05: login com PKCE, tickets, tarefas de triagem e aprovações de reembolso.",
    },
    proves: {
      en: "Contract-generated client, axe with zero violations and a bundle budget, checked in a real browser.",
      pt: "Cliente gerado do contrato, axe sem violações e orçamento de bundle, verificados em navegador real.",
    },
  },
};

const limits: Record<string, Limit[]> = {
  p06: [
    {
      text: {
        en: "Not covered: a screen-reader pass by a person, silent token renewal past the five-minute lifetime in a browser, and the full P05 service gate on 0.4.4.",
        pt: "Não coberto: passagem com leitor de tela feita por uma pessoa, renovação silenciosa do token além dos cinco minutos em navegador, e o gate de serviços completo do P05 na 0.4.4.",
      },
      source: ".planning/phases/001-console/VERIFY.md",
    },
  ],
};

const order: Record<State, number> = { open: 0, partial: 1, claimed: 2, verified: 3 };

export const projects: Project[] = Object.entries(curated).map(([id, c]) => {
  const meta = (raw.meta as Record<string, { version: string; repo: string }>)[id];
  const features = ((raw.projects as Record<string, Feature[]>)[id] ?? []).slice();
  features.sort((a, b) => order[a.state] - order[b.state]);
  return { id, ...c, version: meta?.version ?? "", repo: meta?.repo ?? "", features, limits: limits[id] ?? [] };
});

export function countStates(features: Feature[]): Record<State, number> {
  const out: Record<State, number> = { verified: 0, claimed: 0, partial: 0, open: 0 };
  for (const f of features) out[f.state] += 1;
  return out;
}

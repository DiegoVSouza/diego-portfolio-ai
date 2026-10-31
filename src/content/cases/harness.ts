import type { CaseDetail } from "../cases";
import { t } from "./t";

export const detail: CaseDetail = {
  slug: "harness",
  summary: t(
    "Specs before code, scoped write paths, gated checks, evals, budget ledgers, and saved evidence for every claim, following AI engineering best practices. Coding agents did the volume. The harness is why the result can be trusted, and every phase is in the repository to read.",
    "Spec antes de código, caminhos de escrita delimitados, gates, evals, ledgers de orçamento e evidência salva para cada afirmação, seguindo as melhores práticas de engenharia de AI. Agentes de código fizeram o volume. O harness é o motivo de o resultado ser confiável, e cada fase está no repositório para leitura.",
  ),
  tldr: {
    problem: t("Coding agents write fast and claim more than they checked. Speed without a gate produces confident, unverified work.", "Agentes de código escrevem rápido e afirmam mais do que checaram. Velocidade sem gate produz trabalho confiante e não verificado."),
    role: t("I wrote the rules, the phase template and the gates, and I review what the agents produce.", "Escrevi as regras, o template de fase e os gates, e reviso o que os agentes produzem."),
    stack: "Markdown specs, Python gates, Git hooks, Conventional Commits",
    result: t("The rules are in `AGENTS.md`: no result is called done without a command, an exit code and saved output, and a number comes only from a recorded run.", "As regras estão em `AGENTS.md`: nenhum resultado é chamado de pronto sem comando, exit code e saída salva, e um número só vem de uma execução registrada."),
  },
  decisions: [
    {
      title: t("Evidence or it is incomplete", "Evidência ou fica incompleto"),
      body: t("A task is done when a command ran, its exit code and output are saved, and the diff was reviewed. Without that, the result is marked incomplete.", "Uma tarefa está pronta quando um comando rodou, o exit code e a saída estão salvos e o diff foi revisado. Sem isso, o resultado é marcado como incompleto."),
      code: { repo: "lab", path: "AGENTS.md" },
      rejected: t("Accepting an agent's statement that it works.", "Aceitar a declaração de um agente de que funciona."),
    },
    {
      title: t("Write paths are declared per plan", "Caminhos de escrita são declarados por plano"),
      body: t("Each plan lists the paths it may change and the changes it may not make. A product phase cannot edit the shared kit.", "Cada plano lista os caminhos que pode mudar e as mudanças que não pode fazer. Uma fase de produto não pode editar o kit compartilhado."),
      code: { repo: "lab", path: "harness/GSD-LITE-PLUS.md" },
      rejected: t("Letting an agent edit whatever it needs.", "Deixar um agente editar o que precisar."),
    },
  ],
  measured: [],
  notMeasured: [
    t("How much faster the harness makes delivery. I have no controlled comparison.", "O quanto o harness acelera a entrega. Não tenho comparação controlada."),
    t("Whether the process transfers to a team.", "Se o processo se transfere para um time."),
  ],
  failures: [
    {
      what: t("A full gate was marked incomplete after repeated attempts.", "Um gate completo foi marcado como incompleto após tentativas repetidas."),
      cause: t("A stale literal in a test no longer matched a policy value that had changed.", "Um literal antigo em um teste não batia mais com um valor de política que tinha mudado."),
      change: t("The attempts are recorded, no live call was made on a red gate, and the stale value was fixed in its own task.", "As tentativas estão registradas, nenhuma chamada live foi feita com gate vermelho, e o valor antigo foi corrigido em tarefa própria."),
    },
  ],
  validate: { command: "python scripts/harness/verify.py", expected: t("The lab's structural checks pass.", "As checagens estruturais do lab passam.") },
  differently: t("I would version the phase template and show a diff between versions, to make process changes as reviewable as code changes.", "Eu versionaria o template de fase e mostraria o diff entre versões, para mudanças de processo serem tão revisáveis quanto mudanças de código."),
  next: "supportops",
};

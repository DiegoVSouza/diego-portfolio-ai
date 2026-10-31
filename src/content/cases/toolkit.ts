import type { CaseDetail } from "../cases";
import { t } from "./t";

export const detail: CaseDetail = {
  slug: "toolkit",
  summary: t(
    "Tool schemas, safe retries, step and time limits, code-first evals, an adversarial suite and cost helpers, in the Python standard library. It separates what is proven from what is not: fixtures test control logic, and they are never presented as model quality.",
    "Schemas de tools, retries seguros, limites de passos e tempo, evals code-first, suíte adversarial e helpers de custo, só com a biblioteca padrão do Python. Separa o que está provado do que não está: fixtures testam lógica de controle e nunca são apresentadas como qualidade de modelo.",
  ),
  tldr: {
    problem: t("A tool call needs a schema, a bound and a refusal path before a model can act on it.", "Uma chamada de ferramenta precisa de schema, limite e caminho de recusa antes de um modelo agir sobre ela."),
    role: t("I designed the library and its adversarial suite.", "Projetei a biblioteca e a suíte adversarial."),
    stack: "Python (standard library only)",
    result: t("The locked fake gate passes: {ev:p02-tests}.", "O gate fake travado passa: {ev:p02-tests}."),
  },
  decisions: [
    {
      title: t("No dependencies", "Sem dependências"),
      body: t("The library uses only the standard library, so adopting it never drags a transitive dependency into a service.", "A biblioteca usa só a biblioteca padrão, então adotá-la nunca arrasta uma dependência transitiva para um serviço."),
      code: { repo: "p02", path: "supportops_toolkit/__init__.py" },
      rejected: t("Wrapping a popular validation library.", "Embrulhar uma biblioteca de validação popular."),
    },
    {
      title: t("Limits are consumed, not advised", "Limites são consumidos, não sugeridos"),
      body: t("Steps, tokens and seconds are consumed from one budget, and an exhausted budget raises.", "Passos, tokens e segundos são consumidos de um só orçamento, e um orçamento esgotado levanta erro."),
      code: { repo: "p02", path: "supportops_toolkit/guardrails.py" },
      rejected: t("Logging a warning when a limit is passed.", "Registrar um aviso quando um limite é ultrapassado."),
    },
  ],
  measured: ["p02-tests"],
  notMeasured: [
    t("Model quality. The evals run on fixtures.", "Qualidade de modelo. Os evals rodam sobre fixtures."),
    t("Adversarial coverage against a real model.", "Cobertura adversarial contra um modelo real."),
  ],
  failures: [
    {
      what: t("The first real completion returned a bad-request error and was not retried.", "A primeira conclusão real devolveu um erro de requisição inválida e não foi repetida."),
      cause: t("The exact cause was not established, because the response body was deliberately not retained.", "A causa exata não foi estabelecida, porque o corpo da resposta não foi retido de propósito."),
      change: t("The request now sets the completion-token cap and a low reasoning effort, a regression test checks both, and a corrective real evaluation passed.", "A requisição agora define o teto de tokens de conclusão e esforço de raciocínio baixo, um teste de regressão confere os dois, e uma avaliação real corretiva passou."),
    },
    {
      what: t("A lock test read a held lease file on Windows and failed.", "Um teste de lock lia um arquivo de lease em uso no Windows e falhava."),
      cause: t("Windows locks prevent reading a file another process owns.", "O Windows impede a leitura de um arquivo que outro processo possui."),
      change: t("The test reads sanitized metadata after the lease is released, and still proves concurrent acquisition is blocked.", "O teste lê metadados saneados depois de o lease ser liberado, e ainda prova que a aquisição concorrente é bloqueada."),
    },
  ],
  validate: { command: "uv sync --locked && uv run --locked python scripts/check_full.py", expected: t("The full gate passes with fixtures and the adversarial suite.", "O gate completo passa com fixtures e a suíte adversarial.") },
  differently: t("I would add a provider-neutral retry classification table with a test per row, so each retry rule is a visible decision.", "Eu adicionaria uma tabela de classificação de retry neutra a provedor, com um teste por linha, para cada regra de retry ser uma decisão visível."),
  next: "observability",
};

import type { CaseDetail } from "../cases";
import { t } from "./t";

export const detail: CaseDetail = {
  slug: "foundation",
  summary: t(
    "Domain models, a seeded dataset, a testkit and one budget ledger across fake, replay and live. Then the honest part: a real-model campaign, reported with its pass rate, its confidence interval and the families that failed. The verdict was `FAIL_PROVISIONAL`, and I kept the held-out budget untouched instead of tuning until the number looked good.",
    "Modelos de domínio, dataset com semente, testkit e um só ledger de orçamento entre fake, replay e live. Depois vem a parte honesta: uma campanha com modelo real, publicada com taxa de acerto, intervalo de confiança e as famílias que falharam. O veredito foi `FAIL_PROVISIONAL`, e mantive o orçamento de holdout intacto em vez de ajustar até o número ficar bonito.",
  ),
  tldr: {
    problem: t("Independent services need one vocabulary for tickets, invoices and tools, and an honest way to test a model against it.", "Serviços independentes precisam de um vocabulário só para tickets, faturas e ferramentas, e de um jeito honesto de testar um modelo contra ele."),
    role: t("I wrote the contracts, the testkit and the campaign runner, and ran the evaluation.", "Escrevi os contratos, o testkit e o runner de campanha, e rodei a avaliação."),
    stack: "Python, Pydantic, uv, pytest",
    result: t(
      "{ev:p00-trials} real-model trials passed, and {ev:p00-cases} unique cases passed all three trials (confidence interval {ev:p00-wilson}). Verdict `FAIL_PROVISIONAL`.",
      "{ev:p00-trials} trials com modelo real aprovados, e {ev:p00-cases} casos únicos passaram nos três trials (intervalo de confiança {ev:p00-wilson}). Veredito `FAIL_PROVISIONAL`.",
    ),
  },
  decisions: [
    {
      title: t("Unknown fields are errors", "Campos desconhecidos são erros"),
      body: t("Models reject unknown fields and require timezones, so a contract change shows up in a consumer's tests before it shows up in production.", "Os modelos rejeitam campos desconhecidos e exigem fuso horário, então uma mudança de contrato aparece nos testes de um consumidor antes de aparecer em produção."),
      code: { repo: "p00", path: "supportops_foundation/domain/models.py" },
      rejected: t("Loose dictionaries passed between services.", "Dicionários soltos passados entre serviços."),
    },
    {
      title: t("One interface for fake, replay and live", "Uma interface para fake, replay e live"),
      body: t("A factory picks the mode, and the live mode reserves budget before any transport. Control logic is testable with no provider.", "Uma fábrica escolhe o modo, e o modo live reserva orçamento antes de qualquer transporte. A lógica de controle é testável sem provedor."),
      code: { repo: "p00", path: "supportops_foundation/llm/factory.py" },
      rejected: t("A separate code path for evaluation.", "Um caminho de código separado para avaliação."),
    },
    {
      title: t("Report the failure, protect the held-out set", "Publicar a falha e proteger o holdout"),
      body: t("When the campaign failed, I did not rerun it against the protected budget. The report states the failing families and stops. {ev:p00-protected}.", "Quando a campanha falhou, não a rodei de novo contra o orçamento protegido. O relatório traz as famílias que falharam e para. {ev:p00-protected}."),
      code: { repo: "p00", path: "scripts/run_live_campaign.py" },
      rejected: t("Tuning the prompt against the held-out cases until the number passes.", "Ajustar o prompt contra os casos de holdout até o número passar."),
    },
  ],
  measured: ["p00-trials", "p00-cases", "p00-wilson", "p00-errors", "p00-protected"],
  notMeasured: [
    t("Held-out and confirmation performance. Those budgets were not spent.", "Desempenho em holdout e confirmação. Esses orçamentos não foram gastos."),
    t("Human review of the answers. It is pending.", "Revisão humana das respostas. Está pendente."),
    t("Provider latency under load.", "Latência do provedor sob carga."),
  ],
  failures: [
    {
      what: t("A resumed campaign could start a provider client after an earlier provider error.", "Uma campanha retomada podia iniciar um cliente de provedor depois de um erro anterior do provedor."),
      cause: t("An existing completed error outcome did not block initialization on resume.", "Um resultado de erro já concluído não bloqueava a inicialização na retomada."),
      change: t("Resume now refuses before any client is created and requires a review.", "A retomada agora recusa antes de criar qualquer cliente e exige revisão."),
    },
    {
      what: t("Two development cases disagreed with the generic prompt.", "Dois casos de desenvolvimento discordavam do prompt genérico."),
      cause: t("The prompt encourages a lookup for concrete issues, while one case expects a clarifying question first.", "O prompt incentiva uma consulta em casos concretos, enquanto um caso espera uma pergunta de esclarecimento primeiro."),
      change: t("Recorded as a contract tension for a person to resolve. The dataset was not edited to pass.", "Registrado como tensão de contrato para uma pessoa resolver. O dataset não foi editado para passar."),
    },
  ],
  validate: { command: "uv sync --locked && uv run --locked python scripts/check_fast.py", expected: t("The fast gate passes. Live commands need a funded campaign and are not part of it.", "O gate rápido passa. Comandos live exigem uma campanha com orçamento e não fazem parte dele.") },
  differently: t("I would split the prompt contract before the campaign, not after it failed, so the two disagreeing cases never counted against the model.", "Eu separaria o contrato do prompt antes da campanha, não depois de ela falhar, para os dois casos em desacordo nunca contarem contra o modelo."),
  next: "agents",
};

import type { CaseDetail } from "../cases";
import { t } from "./t";

export const detail: CaseDetail = {
  slug: "observability",
  summary: t(
    "OpenTelemetry traces, correlated logs, Prometheus metrics and deterministic loop detection. Content capture is off by default, and tests prove that span status stays content-free. In the live demo, this is what you are looking at.",
    "Traces OpenTelemetry, logs correlacionados, métricas Prometheus e detecção determinística de loops. A captura de conteúdo vem desligada, e testes provam que o status dos spans não carrega conteúdo. No demo live, é isto que você está vendo.",
  ),
  tldr: {
    problem: t("An agent can repeat, retry and spend across services, and teams should not need to collect prompts to see it.", "Um agente pode repetir, tentar de novo e gastar entre serviços, e as equipes não deveriam precisar coletar prompts para enxergar isso."),
    role: t("I built the instrumentation, the metrics and the loop detector.", "Construí a instrumentação, as métricas e o detector de loops."),
    stack: "Python, OpenTelemetry, Prometheus, Grafana, Jaeger",
    result: t("The full fake service gate passed: {ev:p03-tests}.", "O gate fake de serviços completo passou: {ev:p03-tests}."),
  },
  decisions: [
    {
      title: t("Content capture is off by default", "A captura de conteúdo vem desligada"),
      body: t("Spans carry timing, status and token counts. A test checks that span status never carries content.", "Os spans carregam tempo, status e contagem de tokens. Um teste confere que o status do span nunca carrega conteúdo."),
      code: { repo: "p03", path: "supportops_obs/instrumentation.py" },
      rejected: t("Capturing prompts and trimming them later.", "Capturar prompts e aparar depois."),
    },
    {
      title: t("Loop detection is deterministic", "A detecção de loops é determinística"),
      body: t("A repeated-action detector flags loops from the action sequence, with no model in the loop.", "Um detector de ação repetida sinaliza loops a partir da sequência de ações, sem modelo no meio."),
      code: { repo: "p03", path: "supportops_obs/loopdetect.py" },
      rejected: t("Asking a model whether the agent is stuck.", "Perguntar a um modelo se o agente travou."),
    },
  ],
  measured: ["p03-tests"],
  notMeasured: [
    t("Production telemetry volume and cost.", "Volume e custo de telemetria em produção."),
    t("Privacy for every integration, only for the paths the tests cover.", "Privacidade em toda integração, só nos caminhos que os testes cobrem."),
  ],
  failures: [
    {
      what: t("The first Docker gate exceeded its wait for the synthetic alerts.", "O primeiro gate com Docker estourou a espera pelos alertas sintéticos."),
      cause: t("A cold start took longer than the configured wait. All alerts fired later.", "Uma partida a frio demorou mais que a espera configurada. Todos os alertas dispararam depois."),
      change: t("The wait is configurable and was raised without changing any threshold.", "A espera é configurável e foi aumentada sem mudar nenhum limiar."),
    },
  ],
  validate: { command: "uv sync --locked --extra dev && uv run --locked python scripts/check_full.py", expected: t("The unit tests pass. The service part needs Docker.", "Os testes unitários passam. A parte de serviços precisa de Docker.") },
  differently: t("I would add the loop detector's thresholds to the trace as attributes from the start, so tuning them is visible.", "Eu colocaria os limiares do detector de loops no trace como atributos desde o início, para ajustá-los ser visível."),
  next: "async",
};

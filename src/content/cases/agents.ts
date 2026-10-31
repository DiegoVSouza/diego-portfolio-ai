import type { CaseDetail } from "../cases";
import { t } from "./t";

export const detail: CaseDetail = {
  slug: "agents",
  summary: t(
    "A supervisor delegates to specialist workers with shared state, hard step limits and explicit stop conditions. The same ticket runs through several framework adapters behind one `TriageRunner` contract, so the choice of framework is a measured decision, not a preference.",
    "Um supervisor delega para workers especialistas com estado compartilhado, limite rígido de passos e condições de parada explícitas. O mesmo ticket passa por vários adaptadores de framework atrás de um contrato `TriageRunner`, então a escolha de framework vira decisão medida, não preferência.",
  ),
  tldr: {
    problem: t("Framework demos rarely show how to keep contracts, retries, approval pauses and termination comparable.", "Demos de framework raramente mostram como manter contratos, retries, pausas de aprovação e término comparáveis."),
    role: t("I built the supervisor, the shared contract and the adapters, and the accounting for the live operation.", "Construí o supervisor, o contrato compartilhado e os adaptadores, e a contabilidade da operação live."),
    stack: "Python, LangGraph, CrewAI, AutoGen, LlamaIndex, Semantic Kernel",
    result: t("One live synthetic workflow ran with four provider attempts and {ev:p01-tokens} tokens. That shows the transport and the accounting work. It says nothing about answer quality.", "Um workflow sintético live rodou com quatro tentativas ao provedor e {ev:p01-tokens} tokens. Isso mostra que transporte e contabilidade funcionam. Não diz nada sobre qualidade de resposta."),
  },
  decisions: [
    {
      title: t("One contract, many frameworks", "Um contrato, vários frameworks"),
      body: t("Every adapter implements `TriageRunner`, and a shared test runs each of them against the same cases.", "Todo adaptador implementa `TriageRunner`, e um teste compartilhado roda cada um contra os mesmos casos."),
      code: { repo: "p01", path: "src/supportops_agents/contracts.py" },
      rejected: t("Comparing frameworks by their own demos.", "Comparar frameworks pelos próprios demos."),
    },
    {
      title: t("The stop condition belongs to the supervisor", "A condição de parada pertence ao supervisor"),
      body: t("A hard step limit ends the run whatever a worker returns, so a looping model cannot extend its own budget.", "Um limite rígido de passos encerra a execução seja o que for que um worker devolva, então um modelo em laço não estende o próprio orçamento."),
      code: { repo: "p01", path: "src/supportops_agents/core.py" },
      rejected: t("Trusting the model to say it is done.", "Confiar que o modelo diga que terminou."),
    },
  ],
  measured: ["p01-tokens"],
  notMeasured: [
    t("Which framework is best. The comparison runs offline on fixtures.", "Qual framework é o melhor. A comparação roda offline sobre fixtures."),
    t("Answer quality of the live workflow.", "Qualidade da resposta do workflow live."),
  ],
  failures: [
    {
      what: t("A completed call with missing usage replaced its reservation with zeros.", "Uma chamada concluída sem uso informado trocava a reserva por zeros."),
      cause: t("Cumulative accounting treated unknown usage as no usage.", "A contabilidade acumulada tratava uso desconhecido como nenhum uso."),
      change: t("Unknown usage keeps the original reservation, with a regression test.", "Uso desconhecido mantém a reserva original, com teste de regressão."),
    },
    {
      what: t("An older adapter rotated to another key after a transient failure and bypassed the accounting.", "Um adaptador antigo rodava para outra chave após uma falha transitória e contornava a contabilidade."),
      cause: t("It built provider clients itself instead of using the shared receipt boundary.", "Ele criava os clientes do provedor em vez de usar a fronteira de recibos compartilhada."),
      change: t("Red tests were written first, then the adapter was moved behind the accounted boundary.", "Escrevi primeiro os testes vermelhos, depois movi o adaptador para trás da fronteira contabilizada."),
    },
  ],
  validate: { command: "uv sync --locked --all-groups && uv run --locked python scripts/check_fast.py", expected: t("The offline suite passes. One test that compares against a lab-only module is skipped, with its reason printed, outside the lab.", "A suíte offline passa. Um teste que compara com um módulo exclusivo do lab é pulado, com o motivo impresso, fora do lab.") },
  differently: t("I would write the stop condition as a separate small module with its own tests before writing any worker.", "Eu escreveria a condição de parada como um módulo pequeno e separado, com testes próprios, antes de escrever qualquer worker."),
  next: "toolkit",
};

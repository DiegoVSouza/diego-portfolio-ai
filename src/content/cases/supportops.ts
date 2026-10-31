import type { CaseDetail } from "../cases";
import { t } from "./t";

export const detail: CaseDetail = {
  slug: "supportops",
  summary: t(
    "Tickets arrive, a team of agents triages them against tenant-scoped knowledge, and every answer cites its sources. Money is the line the model cannot cross: it proposes, a deterministic gate checks, and a human decides. The requester cannot approve their own refund. Open the console and try to.",
    "Tickets chegam, um time de agentes faz a triagem sobre conhecimento isolado por tenant, e cada resposta cita suas fontes. Dinheiro é a linha que o modelo não cruza: ele propõe, um gate determinístico confere e uma pessoa decide. Quem pediu o reembolso não pode aprová-lo. Abra o console e tente.",
  ),
  tldr: {
    problem: t(
      "Support automation crosses tenant data, tools, background work and money. A model that can approve its own refund is a liability, so the system has to make that impossible by construction, not by prompt.",
      "Automação de suporte cruza dados de tenant, ferramentas, trabalho em segundo plano e dinheiro. Um modelo que aprova o próprio reembolso é um risco, então o sistema precisa tornar isso impossível por construção, não por prompt.",
    ),
    role: t("I designed and built the API, the retrieval, the approval flow, the accounted live path and the console, with coding agents under a spec-first harness.", "Projetei e construí a API, a busca, o fluxo de aprovação, o caminho live contabilizado e o console, com agentes de código sob um harness que começa pela spec."),
    stack: "Python, FastAPI, PostgreSQL, pgvector, Redis, MCP, Keycloak, React, TypeScript, Fly.io, Cloudflare Pages",
    result: t(
      "{ev:p05-tests} in its latest recorded suite run, and {ev:p05-demo-live} for the live ledger and key failover, run against PostgreSQL 16. The live demo itself has not been measured yet.",
      "{ev:p05-tests} na última execução registrada da suíte, e {ev:p05-demo-live} para o ledger live e o failover de chaves, rodados contra PostgreSQL 16. O demo live em si ainda não foi medido.",
    ),
  },
  decisions: [
    {
      title: t("Tenant and role come from the token", "Tenant e papel vêm do token"),
      body: t(
        "The API reads tenant and role from the signed token. A browser token can carry scopes its user's role must not use, so scopes are narrowed by role on the server.",
        "A API lê tenant e papel do token assinado. Um token de navegador pode carregar escopos que o papel do usuário não pode usar, então os escopos são reduzidos por papel no servidor.",
      ),
      code: { repo: "p05", path: "supportops_platform/api/app.py" },
      rejected: t("Trusting a tenant id or scope list sent by the client.", "Confiar em um tenant id ou lista de escopos enviados pelo cliente."),
    },
    {
      title: t("The model proposes; a gate and a person decide", "O modelo propõe; um gate e uma pessoa decidem"),
      body: t(
        "A refund request goes through a deterministic tool and becomes an approval that a different principal must decide. The amount comes from that tool, not from the model.",
        "Um pedido de reembolso passa por uma ferramenta determinística e vira uma aprovação que outro principal precisa decidir. O valor vem dessa ferramenta, não do modelo.",
      ),
      code: { repo: "p05", path: "supportops_platform/service_runtime.py" },
      rejected: t("Letting model output set the amount or approve.", "Deixar a saída do modelo definir o valor ou aprovar."),
    },
    {
      title: t("Reserve the cost before the call", "Reservar o custo antes da chamada"),
      body: t(
        "Each model call reserves its worst-case cost in a Postgres ledger with one atomic statement that also checks the ceiling. A rate-limit answer moves to the next key and bills nothing; an uncertain call keeps its reservation.",
        "Cada chamada ao modelo reserva o custo do pior caso em um ledger no Postgres, com uma única instrução atômica que também confere o teto. Uma resposta de limite de taxa passa para a próxima chave e não cobra nada; uma chamada incerta mantém a reserva.",
      ),
      code: { repo: "p05", path: "supportops_platform/agents/demo_live.py" },
      rejected: t("Adding up spend after the fact.", "Somar o gasto depois do fato."),
    },
  ],
  measured: ["p05-tests", "p05-demo-live", "p05-dual-control"],
  notMeasured: [
    t("Semantic quality of the answers. Retrieval fixtures prove control flow, not meaning.", "Qualidade semântica das respostas. Fixtures de busca provam fluxo de controle, não significado."),
    t("Cost and latency of the live demo. No public live run exists yet.", "Custo e latência do demo live. Ainda não existe execução live pública."),
    t("Throughput under load.", "Vazão sob carga."),
  ],
  failures: [
    {
      what: t("The first accounted path stopped all later work after any failed attempt.", "O primeiro caminho contabilizado parava todo trabalho seguinte depois de qualquer tentativa que falhasse."),
      cause: t("It was built for one reviewed local operation, where a failure should block until a person looks. A public service cannot work that way.", "Foi feito para uma operação local revisada, em que uma falha deve bloquear até alguém olhar. Um serviço público não funciona assim."),
      change: t("The public path releases the reservation when a provider answered with an error, and keeps it only when the outcome is unknown.", "O caminho público libera a reserva quando o provedor respondeu com erro, e só a mantém quando o resultado é desconhecido."),
    },
    {
      what: t("A clean clone could not install the project.", "Um clone limpo não conseguia instalar o projeto."),
      cause: t("An ignore file excluded every locally built wheel, including the ones the lock file points to.", "Um arquivo de ignore excluía todas as wheels geradas localmente, inclusive as que o lock aponta."),
      change: t("The five wheels the lock names are tracked and their hashes checked against the lock.", "As cinco wheels que o lock cita estão versionadas e seus hashes conferidos contra o lock."),
    },
    {
      what: t("Triage failed from the console with a generic worker failure.", "A triagem falhava no console com uma falha genérica do worker."),
      cause: t("The worker runs on the caller's scopes, and the console did not request the scopes its tools need.", "O worker roda com os escopos de quem chama, e o console não pedia os escopos que as ferramentas precisam."),
      change: t("Console scopes now match the agent's scopes, with a note to update both when a tool is added.", "Os escopos do console agora seguem os do agente, com um aviso para atualizar os dois ao adicionar uma ferramenta."),
    },
  ],
  validate: { command: "uv sync --locked && uv run --locked pytest", expected: t("The suite passes. The service gate (`scripts/check_full.py`) needs Docker.", "A suíte passa. O gate de serviços (`scripts/check_full.py`) precisa de Docker.") },
  differently: t(
    "The refund amount is a fixed tool value. I would let the proposal carry a bounded amount read from the ticket, so the model's work shows up in the money decision.",
    "O valor do reembolso é um valor fixo da ferramenta. Eu deixaria a proposta carregar um valor limitado lido do ticket, para o trabalho do modelo aparecer na decisão sobre dinheiro.",
  ),
  next: "foundation",
};

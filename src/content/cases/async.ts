import type { CaseDetail } from "../cases";
import { t } from "./t";

export const detail: CaseDetail = {
  slug: "async",
  summary: t(
    "An API and workers for long-running AI jobs, with leases, retries, a dead-letter path and crash recovery, tested against real Redis Streams and an SQS-compatible service. A stuck task is a state I designed for, not an incident.",
    "API e workers para tarefas longas de IA, com leases, retries, dead-letter e recuperação de crash, testados com Redis Streams real e um serviço compatível com SQS. Tarefa travada é um estado que eu projetei, não um incidente.",
  ),
  tldr: {
    problem: t("Work continues after the HTTP response, and brokers deliver a message more than once.", "O trabalho continua depois da resposta HTTP, e brokers entregam uma mensagem mais de uma vez."),
    role: t("I designed the task states, the lease model and the effect record.", "Projetei os estados da tarefa, o modelo de lease e o registro de efeito."),
    stack: "Python, FastAPI, Redis Streams, PostgreSQL, SQS-compatible service, Terraform",
    result: t("The isolated full fake gate passed: {ev:p04-tests}.", "O gate fake completo e isolado passou: {ev:p04-tests}."),
  },
  decisions: [
    {
      title: t("An effect is recorded once", "Um efeito é registrado uma vez"),
      body: t("A redelivered message finds the recorded effect and does not repeat it.", "Uma mensagem reentregue encontra o efeito registrado e não o repete."),
      code: { repo: "p04", path: "supportops_async/queue/contracts.py" },
      rejected: t("Relying on the broker for exactly-once delivery.", "Confiar no broker para entrega exatamente uma vez."),
    },
  ],
  measured: ["p04-tests"],
  notMeasured: [
    t("Behavior in a cloud deployment of this service alone. Terraform was planned, never applied.", "Comportamento em um deploy em nuvem só deste serviço. O Terraform foi planejado, nunca aplicado."),
    t("Throughput.", "Vazão."),
  ],
  failures: [
    {
      what: t("An outbox event failed with an `UnboundLocalError`.", "Um evento de outbox falhou com `UnboundLocalError`."),
      cause: t("A function-local import shadowed the module import.", "Um import local à função sombreava o import do módulo."),
      change: t("The local imports were removed and the suite passes.", "Os imports locais foram removidos e a suíte passa."),
    },
    {
      what: t("An offline install could not resolve a pinned dependency.", "Uma instalação offline não resolvia uma dependência fixada."),
      cause: t("The ad hoc install ignored the lock file.", "A instalação avulsa ignorava o lock."),
      change: t("Installs go through the lock file, so the same set of packages is reproduced.", "As instalações passam pelo lock, então o mesmo conjunto de pacotes é reproduzido."),
    },
  ],
  validate: { command: "uv sync --locked", expected: t("The environment installs from the lock. The service gate needs Docker and the compose files named in the workflow.", "O ambiente instala a partir do lock. O gate de serviços precisa de Docker e dos arquivos compose citados no workflow.") },
  differently: t("I would write the crash-recovery scenario as the first test, before the happy path.", "Eu escreveria o cenário de recuperação de crash como o primeiro teste, antes do caminho feliz."),
  next: "design-system",
};

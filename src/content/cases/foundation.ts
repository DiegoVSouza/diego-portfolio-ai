import type { CaseDetail } from "../cases";
import { t } from "./t";

export const detail: CaseDetail = {
  slug: "foundation",
  summary: t(
    "Domain models, a seeded dataset, a testkit and one budget ledger across fake, replay and live. Then the measured part: a real-model evaluation reported with its numbers, its intervals and what failed. My first design scored {ev:p00-holdout-old} on a sealed holdout. I rebuilt the evaluation, and the final design scored {ev:p00-final-trials} on a split I never tuned against.",
    "Modelos de domínio, dataset com semente, testkit e um só ledger de orçamento entre fake, replay e live. Depois vem a parte medida: uma avaliação com modelo real, publicada com os números, os intervalos e o que falhou. Meu primeiro desenho fez {ev:p00-holdout-old} num holdout selado. Reconstruí a avaliação, e o desenho final fez {ev:p00-final-trials} numa rodada contra a qual nunca ajustei nada.",
  ),
  tldr: {
    problem: t("Independent services need one vocabulary for tickets, invoices and tools, and an honest way to test a model against it.", "Serviços independentes precisam de um vocabulário só para tickets, faturas e ferramentas, e de um jeito honesto de testar um modelo contra ele."),
    role: t("I wrote the contracts, the testkit, the campaign runner and the ticket director, and ran the evaluations.", "Escrevi os contratos, o testkit, o runner de campanha e o diretor de tickets, e rodei as avaliações."),
    stack: "Python, Pydantic, uv, pytest",
    result: t(
      "{ev:p00-final-trials} trials passed on a final split used once ({ev:p00-final-wilson}), and {ev:p00-final-cases} cases passed all three trials. That is the whole system, model plus code, not the bare model.",
      "{ev:p00-final-trials} trials aprovados numa rodada final usada uma vez ({ev:p00-final-wilson}), e {ev:p00-final-cases} casos passaram nos três trials. É o sistema inteiro, modelo mais código, não o modelo sozinho.",
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
      title: t("Let code decide what code can decide", "Deixar o código decidir o que o código pode decidir"),
      body: t(
        "The model returns a category, an action and a rationale. Code sets the escalation flag, picks the read-only lookup that belongs to the category, and a deterministic director with no model call corrects two cases: a bare pointer such as \"it\" or \"isso\" cannot be answered, and the user's own refund demand escalates. On the recorded development trials the director moves {ev:p00-dev-alone} to {ev:p00-dev-director}, and that figure is in-sample.",
        "O modelo devolve categoria, ação e justificativa. O código define o sinal de escalação, escolhe a consulta somente leitura da categoria, e um diretor determinístico sem chamada de modelo corrige dois casos: uma referência vazia como \"it\" ou \"isso\" não pode ser respondida, e o pedido de reembolso do próprio usuário escala. Nos trials de desenvolvimento gravados, o diretor leva {ev:p00-dev-alone} a {ev:p00-dev-director}, e esse valor é dentro da amostra.",
      ),
      code: { repo: "p00", path: "scripts/director.py" },
      rejected: t("Asking the model to choose tools and escalation flags itself, or adding a second model call that rewrites the ticket.", "Pedir ao modelo para escolher ferramentas e sinais de escalação, ou somar uma segunda chamada de modelo que reescreve o ticket."),
    },
    {
      title: t("Spend the final split once, and bind it to the candidate", "Gastar a rodada final uma vez e amarrá-la ao candidato"),
      body: t(
        "The final cases were written once and kept out of prompt design. The authorization names the exact calls it allows and the hash of the prompt, schema, dataset, rubric and director, so an edited candidate cannot spend them. The result is {ev:p00-final-trials}, and I did not tune after reading it.",
        "Os casos finais foram escritos uma vez e ficaram fora do desenho do prompt. A autorização nomeia as chamadas exatas que permite e o hash do prompt, do schema, do dataset, da rubrica e do diretor, então um candidato editado não consegue gastá-las. O resultado é {ev:p00-final-trials}, e não ajustei nada depois de lê-lo.",
      ),
      code: { repo: "p00", path: "scripts/campaign_execution.py" },
      rejected: t("Reusing the same cases while iterating on the prompt, which turns the final number into a development number.", "Reusar os mesmos casos enquanto itero o prompt, o que transforma o número final num número de desenvolvimento."),
    },
  ],
  measured: ["p00-final-trials", "p00-final-wilson", "p00-final-cases", "p00-final-actions", "p00-dev-alone", "p00-dev-director", "p00-dev-feature", "p00-holdout-old"],
  notMeasured: [
    t("The bare model without the director on the final split. The model outputs before the director were not stored.", "O modelo sozinho, sem o diretor, na rodada final. As saídas do modelo antes do diretor não foram guardadas."),
    t("Independent review of the dataset. I reviewed the cases and labels myself under one written rule and waived a second reviewer, so no outside person has checked them. Promotion is still pending.", "Revisão independente do dataset. Eu mesmo revisei os casos e os rótulos sob uma regra escrita e dispensei um segundo revisor, então nenhuma pessoa de fora os conferiu. A promoção segue pendente."),
    t("Provider latency under load and billed cost. The keys are on a free plan and the cost figures in the repository are economic estimates.", "Latência do provedor sob carga e custo faturado. As chaves são de um plano gratuito e os valores de custo no repositório são estimativas econômicas."),
    t("Real customer tickets. Every case is synthetic.", "Tickets reais de clientes. Todos os casos são sintéticos."),
  ],
  failures: [
    {
      what: t("The first sealed holdout scored {ev:p00-holdout-old}, far below the development set.", "O primeiro holdout selado fez {ev:p00-holdout-old}, muito abaixo do conjunto de desenvolvimento."),
      cause: t("The development set had no account-access or technical cases, so the prompt had never seen those domains, and the model chose tools badly in them.", "O conjunto de desenvolvimento não tinha casos de acesso à conta nem técnicos, então o prompt nunca tinha visto esses domínios, e o modelo escolheu mal as ferramentas neles."),
      change: t("A new, larger dataset covering every category in English and Portuguese, a separate final split, and a tool that code derives from the category.", "Um dataset novo e maior cobrindo todas as categorias em inglês e português, uma rodada final separada, e uma ferramenta que o código deriva da categoria."),
    },
    {
      what: t("A free-tier proxy ranked the candidates wrongly.", "Um proxy de plano gratuito ranqueou os candidatos errado."),
      cause: t("The same model on another inference stack preferred the feature-report prompt, but on the real stack it scored {ev:p00-dev-feature}, below the {ev:p00-dev-alone} of the prompt it was meant to beat.", "O mesmo modelo em outra pilha de inferência preferiu o prompt de relatório de fatos, mas na pilha real ele fez {ev:p00-dev-feature}, abaixo dos {ev:p00-dev-alone} do prompt que devia superar."),
      change: t("The real stack is the only evidence; the proxy only proposes candidates.", "A pilha real é a única evidência; o proxy só propõe candidatos."),
    },
    {
      what: t("Two prompt rewrites moved errors between answering and asking for detail instead of reducing them.", "Duas reescritas de prompt moveram erros entre responder e pedir detalhe em vez de reduzi-los."),
      cause: t("A small open-weights model does not separate \"it has not arrived\" from \"my order shows shipped but I have not received it\" from wording alone.", "Um modelo pequeno de pesos abertos não separa \"ele não chegou\" de \"meu pedido consta como enviado e não recebi\" só pelas palavras."),
      change: t("The distinction moved into the deterministic director, which is tested on tickets outside the dataset.", "A distinção passou para o diretor determinístico, testado em tickets fora do dataset."),
    },
    {
      what: t("A resumed campaign could start a provider client after an earlier provider error.", "Uma campanha retomada podia iniciar um cliente de provedor depois de um erro anterior do provedor."),
      cause: t("An existing completed error outcome did not block initialization on resume.", "Um resultado de erro já concluído não bloqueava a inicialização na retomada."),
      change: t("Resume now refuses before any client is created and requires a review.", "A retomada agora recusa antes de criar qualquer cliente e exige revisão."),
    },
  ],
  validate: { command: "uv sync --locked && uv run --locked python scripts/check_fast.py", expected: t("The fast gate passes. Live commands need a funded campaign and are not part of it.", "O gate rápido passa. Comandos live exigem uma campanha com orçamento e não fazem parte dele.") },
  differently: t("I would write the final cases and the single labeling rule before touching the prompt, and put every domain in the development set from the start. The first holdout showed what a development set that skips two domains hides.", "Eu escreveria os casos finais e a regra única de rotulagem antes de mexer no prompt, e poria todos os domínios no conjunto de desenvolvimento desde o início. O primeiro holdout mostrou o que um conjunto de desenvolvimento que pula dois domínios esconde."),
  next: "agents",
};

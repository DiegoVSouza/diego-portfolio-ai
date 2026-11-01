import type { Lang } from "colagem-ui";

/** Interface strings. EN and pt-BR must have the same keys (I18N-001); a test enforces it. Digits only through evidence tokens. */
export interface Strings {
  skip: string;
  brand: string;
  nav: string;
  navHome: string;
  navDemo: string;
  navEvidence: string;
  navMethod: string;
  navExperience: string;
  navDesign: string;
  language: string;
  credits: string;
  keys: string;
  heroTitle: string;
  heroLead: string;
  heroCta: string;
  navTour: string;
  aboutTitle: string;
  tourTitle: string;
  tourLead: string;
  tourStart: string;
  railDemo: string;
  railRun: string;
  railFlow: string;
  railReadme: string;
  heroCtaSecond: string;
  band: string[];
  heroSteps: string[];
  openDemo: string;
  tryNow: string;
  copy: string;
  copied: string;
  accountsReady: string;
  tourHint: string;
  techDetails: string;
  testsEvidence: string;
  portfolioTitle: string;
  portfolioLead: string;
  openProject: string;
  flowHint: string;
  stackStatus: string;
  heroStepsLabel: string;
  proofTitle: string;
  mapTitle: string;
  mapLead: string;
  flagshipTitle: string;
  projectsTitle: string;
  methodTitle: string;
  methodLead: string;
  methodBody: string;
  experienceTitle: string;
  contactTitle: string;
  contactLead: string;
  contactWhatsapp: string;
  contactPhone: string;
  seeCase: string;
  seeAll: string;
  caseLinksLabel: string;
  linkDemo: string;
  linkCode: string;
  linkDocs: string;
  pending: string;
  header: string;
  tldr: string;
  problem: string;
  role: string;
  stack: string;
  result: string;
  seeItRun: string;
  seeItRunBody: string;
  how: string;
  decisions: string;
  rejected: string;
  results: string;
  measured: string;
  notMeasured: string;
  failures: string;
  failWhat: string;
  failCause: string;
  failChange: string;
  validate: string;
  validateExpected: string;
  differently: string;
  next: string;
  commit: string;
  lastVerified: string;
  metric: string;
  value: string;
  mode: string;
  source: string;
  evidenceTitle: string;
  evidenceLead: string;
  evidenceFilterMode: string;
  evidenceFilterProject: string;
  all: string;
  command: string;
  exit: string;
  featuresTitle: string;
  featuresLead: string;
  methodRules: [string, string][];
  methodAi: string;
  methodAiBody: string;
  demoTitle: string;
  demoLead: string;
  demoStatus: string;
  demoAsleep: string;
  demoAwake: string;
  demoUnknown: string;
  demoStart: string;
  demoStartWhy: string;
  demoNoWake: string;
  demoNeedChallenge: string;
  demoAccounts: string;
  sceneLabel: string;
  metroLabel: string;
  metroPrev: string;
  metroNext: string;
  simpleVersion: string;
  backToSurface: string;
  stepsLabel: string;
  stepDemo: string;
  stepFlow: string;
  stepReadme: string;
  projectOf: string;
  nextToFlow: string;
  nextToReadme: string;
  nextProject: string;
  nextContact: string;
  demoReplay: string;
  demoReplayBody: string;
  readmeLead: string;
  readmeOpen: string;
  flowLead: string;
  flowRegion: string;
  sceneAnnounce: string;
  sceneHalftone: string;
  paletteOpen: string;
  paletteTitle: string;
  paletteHint: string;
  paletteEmpty: string;
  sceneQuality: string;
  sceneQualityAuto: string;
  sceneQualityHigh: string;
  sceneQualityLow: string;
  sceneMotion: string;
  demoAccountsBody: string;
  demoTour: string;
  demoSteps: [string, string][];
  demoRuns: string;
  demoRunsEmpty: string;
  demoBudget: string;
  demoLimitNote: string;
  demoPublic: string;
  runLog: { step: string; project: string; model: string; latency: string; tokens: string; cost: string; empty: string };
  flowLabels: {
    play: string; pause: string; previous: string; next: string; reset: string; step: string; scenarios: string; allSteps: string;
    detailClose: string; code: string; docs: string; project: string; listTitle: string; diagramLabel: string; then: string;
  };
  experienceLead: string;
  careerNote: string;
  careerTitle: string;
  education: string;
  publications: string;
  certifications: string;
  languages: string;
  skills: string;
  draftNote: string;
  resume: string;
  dsTitle: string;
  dsLead: string;
  notFound: string;
  backHome: string;
  sceneNote: string;
  sceneModes: { quality: string; dots: string; motion: string };
}

const en: Strings = {
  skip: "Skip to content",
  brand: "Diego Souza · AI Engineer",
  nav: "Main",
  navHome: "Home",
  navDemo: "Live demo",
  navEvidence: "Evidence",
  navMethod: "Method",
  navExperience: "Experience",
  navDesign: "Design system",
  language: "Language",
  credits: "Fonts: Anton, Courier Prime, Playfair Display and Special Elite (SIL OFL). Design system: Colagem Urbana Noite. Three.js (MIT). Truck and motorcycle models: Kenney, public domain. Everything else in the scene is generated by code; no logo or brand asset.",
  keys: "Keys",
  heroTitle: "AI Engineer building agents you can verify.",
  heroLead: "I build AI agents for customer support and prove they work. Below is a real system you can run: press a button, watch each step, then open the code and the test results.",
  heroCta: "Start the tour",
  navTour: "Tour",
  aboutTitle: "About me",
  tourTitle: "The tour",
  tourLead: "Eight projects, in order. Each has three stops: how to run it, an interactive flow, and the README explained. Only SupportOps has a live demo; the others you run yourself with one command. Press the button at the end of each stop to move on.",
  tourStart: "Start with SupportOps",
  railDemo: "Demo",
  railRun: "Run it",
  railFlow: "Flow",
  railReadme: "README",
  heroCtaSecond: "Read the flagship case",
  band: ["verify", "evidence", "pending stays pending", "trace every step"],
  openDemo: "Open live demo",
  tryNow: "Try it now",
  copy: "Copy",
  copied: "Copied",
  accountsReady: "Ready to use. Sign in with one of these accounts.",
  tourHint: "Hover a step to read it. On touch, tap.",
  techDetails: "Technical details",
  testsEvidence: "Tests and evidence",
  portfolioTitle: "An interactive portfolio",
  portfolioLead: "Every project here runs, shows its flow and links to its code. Open one to see it work; the tests and numbers are tucked inside each card.",
  openProject: "View project",
  flowHint: "Press Play, or click any box to see what it does. The pulse follows the current step.",
  stackStatus: "Stack status and start",
  heroStepsLabel: "How to read this site",
  heroSteps: ["Try the live demo of one project", "Follow the guided tour: run it, see the flow, read the README", "Check the evidence: every number links to a commit"],
  proofTitle: "What you can check here",
  mapTitle: "One ticket, every project",
  mapLead: "The projects are not separate demos. They are the parts of one system. Press play, or open a node to see the code at its exact commit.",
  flagshipTitle: "Flagship",
  projectsTitle: "Projects",
  methodTitle: "How I build with AI",
  methodLead: "Built with coding agents under an engineering harness: specs before code, gated checks, evals, budget ledgers and saved evidence, following AI engineering best practices. Every number here links to the run that produced it.",
  methodBody: "Open the method",
  experienceTitle: "Experience",
  contactTitle: "Contact",
  contactLead: "Remote, from Crato, CE, Brazil. WhatsApp is the fastest way to reach me; email, LinkedIn and GitHub also work.",
  contactWhatsapp: "Message me on WhatsApp",
  contactPhone: "Phone",
  seeCase: "Open case",
  seeAll: "All projects",
  caseLinksLabel: "Links for this case",
  linkDemo: "Live demo",
  linkCode: "Code",
  linkDocs: "Docs",
  pending: "PENDING",
  header: "Case",
  tldr: "TL;DR",
  problem: "Problem",
  role: "My role",
  stack: "Stack",
  result: "Result",
  seeItRun: "See it run",
  seeItRunBody: "The live demo runs this system against a real model and shows every step.",
  how: "How it works",
  decisions: "Decisions",
  rejected: "Rejected:",
  results: "Results",
  measured: "Measured",
  notMeasured: "Not measured, so not claimed",
  failures: "Failure gallery",
  failWhat: "What happened",
  failCause: "Cause",
  failChange: "What changed",
  validate: "Validate it yourself",
  validateExpected: "Expected",
  differently: "What I would do differently",
  next: "Next project",
  commit: "Commit",
  lastVerified: "Last verified",
  metric: "Metric",
  value: "Value",
  mode: "Mode",
  source: "Source",
  evidenceTitle: "Evidence",
  evidenceLead: "Every number on this site is one of these records, copied from a saved file at an exact commit. If it is not here, it is not claimed.",
  evidenceFilterMode: "Mode",
  evidenceFilterProject: "Project",
  all: "All",
  command: "Command",
  exit: "Exit code",
  featuresTitle: "Feature status, as each project records it",
  featuresLead: "Copied from each project's own feature list. Nothing is rounded up: PENDING stays PENDING.",
  methodRules: [
    ["Evidence before done", "A result needs a command, an exit code and saved output. Without it, the result is incomplete."],
    ["Numbers only from runs", "Metrics, cost and benchmarks come from recorded runs. Without a run, PENDING."],
    ["A red test is a signal", "Fix the root cause. Never delete or weaken the test to make it pass."],
    ["Authorized external effects", "No deploy, publish, push or spend beyond budget without explicit approval."],
    ["Prompts and tools are code", "They live in the repository, have contract tests, and every change goes through regression."],
    ["One source of truth", "Profile, builder state, agent contract and run metrics each have exactly one home."],
  ],
  methodAi: "AI assistance statement",
  methodAiBody: "Coding agents wrote most of the code in this portfolio. I wrote the specs, set the write paths and the gates, reviewed every diff and decided what counts as evidence. The agents never decide that something is done.",
  demoTitle: "Live demo",
  demoLead: "A real multi-agent run against a real model. Nothing here is a recording unless it is labelled with its date.",
  demoStatus: "Stack status",
  demoAsleep: "Asleep. Opening this page did not wake anything.",
  demoAwake: "Awake and ready.",
  demoUnknown: "Status unavailable right now.",
  demoStart: "Start live demo",
  demoStartWhy: "Starting wakes the services in order and takes a short while.",
  demoNoWake: "Waking is available once the demo is deployed.",
  demoNeedChallenge: "Confirm that you are human above to enable the button.",
  demoAccounts: "Demo accounts",
  sceneLabel: "Background scene",
  metroLabel: "Project line",
  metroPrev: "Previous project",
  metroNext: "Next project",
  simpleVersion: "Simple version",
  backToSurface: "Back to the surface",
  stepsLabel: "Stops of this project",
  stepDemo: "Live demo",
  stepFlow: "Interactive flow",
  stepReadme: "The README, explained",
  projectOf: "Project {n} of {total}",
  nextToFlow: "Next: the interactive flow",
  nextToReadme: "Next: the README, explained",
  nextProject: "Next project",
  nextContact: "Last stop: contact",
  demoReplay: "Reproduce it",
  demoReplayBody: "This project has no live backend on the site. You can run it yourself with the command below, and the measured results are in the README stop.",
  readmeLead: "The README of this project, in reading order: problem, decisions, failures, results and what I would do differently.",
  readmeOpen: "Open the README on GitHub",
  flowRegion: "Interactive diagram",
  flowLead: "Click a node to see what it does and open its code. Play steps through the flow.",
  sceneAnnounce: "Project {n} of {total}: {name}",
  sceneHalftone: "Halftone",
  paletteOpen: "Search pages",
  paletteTitle: "Go to",
  paletteHint: "Type a page or a project",
  paletteEmpty: "Nothing matches",
  sceneQuality: "Quality",
  sceneQualityAuto: "auto",
  sceneQualityHigh: "high",
  sceneQualityLow: "low",
  sceneMotion: "Motion",
  demoAccountsBody: "Accounts are shown here once the demo is deployed. Entries you create are public and temporary.",
  demoTour: "Guided tour",
  demoSteps: [
    ["Sign in as the agent", "Use the demo agent account in the console."],
    ["Create a ticket", "Write one, or pick a sample."],
    ["Run triage on the real model", "Four agents answer, each step with its latency, tokens and model."],
    ["Request a refund", "The model proposes; the gate turns it into an approval."],
    ["Sign in as the approver and approve", "A second person decides."],
    ["Try to approve your own refund", "The requester is refused."],
  ],
  demoRuns: "Recent live runs",
  demoRunsEmpty: "No live run is recorded yet. When there is one, every step appears here with its model, latency, tokens and cost estimate.",
  demoBudget: "Budget left",
  demoLimitNote: "When a limit is reached, the demo says so. It never substitutes made-up output.",
  demoPublic: "Public surface: synthetic data only, refunds are simulated, and no message leaves the system.",
  runLog: { step: "Step", project: "Project", model: "Model", latency: "Latency", tokens: "Tokens", cost: "Cost estimate", empty: "No live run is recorded yet." },
  flowLabels: {
    play: "Play", pause: "Pause", previous: "Previous", next: "Next", reset: "Reset", step: "Step", scenarios: "Failure scenarios", allSteps: "The whole flow. Press play or next to walk through it.",
    detailClose: "Close", code: "Code at this commit", docs: "Docs at this commit", project: "Project", listTitle: "Text version of this diagram", diagramLabel: "Flow", then: "then",
  },
  experienceLead: "Career history, in my own words. These are statements about my work, not results measured on this site.",
  careerNote: "Career history, not a measured result.",
  careerTitle: "Career",
  education: "Education",
  publications: "Publications",
  certifications: "Certifications",
  languages: "Languages",
  skills: "Skills",
  draftNote: "English draft of the CV, pending the owner's review.",
  resume: "Plain-text résumé",
  dsTitle: "Design system",
  dsLead: "colagem-ui is the design system this site is built on. Its tokens, components and a machine-checked contrast table live in their own repository.",
  notFound: "This page does not exist.",
  backHome: "Back to the home page",
  sceneNote: "The background is a 3D scene. It pauses when the tab is hidden and is replaced by a flat version when your device cannot run it.",
  sceneModes: { quality: "quality", dots: "halftone", motion: "motion" },
};

const pt: Strings = {
  skip: "Pular para o conteúdo",
  brand: "Diego Souza · AI Engineer",
  nav: "Principal",
  navHome: "Início",
  navDemo: "Demo ao vivo",
  navEvidence: "Evidências",
  navMethod: "Método",
  navExperience: "Experiência",
  navDesign: "Design system",
  language: "Idioma",
  credits: "Fontes: Anton, Courier Prime, Playfair Display e Special Elite (SIL OFL). Design system: Colagem Urbana Noite. Three.js (MIT). Modelos de caminhão e moto: Kenney, domínio público. O resto da cena é gerado por código; nenhum logo ou asset de marca.",
  keys: "Teclas",
  heroTitle: "AI Engineer construindo agentes que você pode verificar.",
  heroLead: "Eu construo agentes de IA para suporte ao cliente e provo que funcionam. Abaixo está um sistema real que você pode rodar: aperte um botão, veja cada passo e abra o código e os resultados dos testes.",
  heroCta: "Começar o tour",
  navTour: "Tour",
  aboutTitle: "Sobre mim",
  tourTitle: "O tour",
  tourLead: "Oito projetos, em ordem. Cada um tem três paradas: como rodar, um fluxo interativo e o README explicado. Só o SupportOps tem demo ao vivo; os outros você roda com um comando. Aperte o botão no fim de cada parada para seguir.",
  tourStart: "Começar pelo SupportOps",
  railDemo: "Demo",
  railRun: "Rodar",
  railFlow: "Fluxo",
  railReadme: "README",
  heroCtaSecond: "Ler o case principal",
  band: ["verificar", "evidência", "pendente continua pendente", "rastreie cada passo"],
  openDemo: "Abrir demo ao vivo",
  tryNow: "Teste agora",
  copy: "Copiar",
  copied: "Copiado",
  accountsReady: "Pronto para usar. Entre com uma destas contas.",
  tourHint: "Passe o mouse sobre um passo para ler. No toque, toque nele.",
  techDetails: "Detalhes técnicos",
  testsEvidence: "Testes e evidências",
  portfolioTitle: "Um portfólio interativo",
  portfolioLead: "Cada projeto aqui roda, mostra seu fluxo e aponta para o código. Abra um para vê-lo funcionando; os testes e números ficam dentro de cada cartão.",
  openProject: "Ver projeto",
  flowHint: "Aperte Play, ou clique em qualquer caixa para ver o que ela faz. O pulso acompanha o passo atual.",
  stackStatus: "Estado da stack e início",
  heroStepsLabel: "Como ler este site",
  heroSteps: ["Teste a demo ao vivo de um projeto", "Siga o tour guiado: rode, veja o fluxo, leia o README", "Confira as evidências: cada número aponta para um commit"],
  proofTitle: "O que você pode conferir aqui",
  mapTitle: "Um ticket, todos os projetos",
  mapLead: "Os projetos não são demos separados. São as partes de um só sistema. Aperte play, ou abra um nó para ver o código no commit exato.",
  flagshipTitle: "Carro-chefe",
  projectsTitle: "Projetos",
  methodTitle: "Como eu construo com IA",
  methodLead: "Construído com agentes de código sob um harness de engenharia: spec antes de código, gates, evals, ledgers de orçamento e evidência salva, seguindo as melhores práticas de engenharia de AI. Todo número aqui leva à execução que o produziu.",
  methodBody: "Abrir o método",
  experienceTitle: "Experiência",
  contactTitle: "Contato",
  contactLead: "Remoto, de Crato, CE, Brasil. O WhatsApp é o jeito mais rápido de falar comigo; email, LinkedIn e GitHub também funcionam.",
  contactWhatsapp: "Fale comigo no WhatsApp",
  contactPhone: "Telefone",
  seeCase: "Abrir case",
  seeAll: "Todos os projetos",
  caseLinksLabel: "Links deste case",
  linkDemo: "Demo ao vivo",
  linkCode: "Código",
  linkDocs: "Docs",
  pending: "PENDENTE",
  header: "Case",
  tldr: "Resumo",
  problem: "Problema",
  role: "Meu papel",
  stack: "Stack",
  result: "Resultado",
  seeItRun: "Veja rodando",
  seeItRunBody: "O demo ao vivo roda este sistema contra um modelo real e mostra cada passo.",
  how: "Como funciona",
  decisions: "Decisões",
  rejected: "Descartado:",
  results: "Resultados",
  measured: "Medido",
  notMeasured: "Não medido, então não afirmado",
  failures: "Galeria de falhas",
  failWhat: "O que aconteceu",
  failCause: "Causa",
  failChange: "O que mudou",
  validate: "Valide você mesmo",
  validateExpected: "Esperado",
  differently: "O que eu faria diferente",
  next: "Próximo projeto",
  commit: "Commit",
  lastVerified: "Última verificação",
  metric: "Métrica",
  value: "Valor",
  mode: "Modo",
  source: "Fonte",
  evidenceTitle: "Evidências",
  evidenceLead: "Todo número deste site é um destes registros, copiado de um arquivo salvo em um commit exato. Se não está aqui, não é afirmado.",
  evidenceFilterMode: "Modo",
  evidenceFilterProject: "Projeto",
  all: "Todos",
  command: "Comando",
  exit: "Exit code",
  featuresTitle: "Status das features, como cada projeto registra",
  featuresLead: "Copiado da lista de features de cada projeto. Nada é arredondado para cima: PENDING continua PENDING.",
  methodRules: [
    ["Evidência antes de pronto", "Um resultado precisa de comando, exit code e saída salva. Sem isso, está incompleto."],
    ["Números só de execuções", "Métricas, custo e benchmarks vêm de execuções registradas. Sem execução, PENDING."],
    ["Teste vermelho é sinal", "Corrija a causa raiz. Nunca apague nem enfraqueça o teste para passar."],
    ["Efeitos externos autorizados", "Sem deploy, publicação, push ou gasto acima do orçamento sem aprovação explícita."],
    ["Prompt e tool são código", "Vivem no repositório, têm teste de contrato, e toda mudança passa por regressão."],
    ["Uma fonte de verdade", "Perfil, estado do builder, contrato do agente e métricas de execução têm cada um exatamente um lar."],
  ],
  methodAi: "Declaração de uso de IA",
  methodAiBody: "Agentes de código escreveram a maior parte do código deste portfólio. Eu escrevi as specs, defini os caminhos de escrita e os gates, revisei cada diff e decidi o que conta como evidência. Os agentes nunca decidem que algo está pronto.",
  demoTitle: "Demo ao vivo",
  demoLead: "Uma execução multiagente real contra um modelo real. Nada aqui é gravação, a menos que esteja rotulado com a data.",
  demoStatus: "Estado da stack",
  demoAsleep: "Dormindo. Abrir esta página não acordou nada.",
  demoAwake: "Acordada e pronta.",
  demoUnknown: "Estado indisponível agora.",
  demoStart: "Iniciar demo ao vivo",
  demoStartWhy: "Iniciar acorda os serviços em ordem e leva um tempo curto.",
  demoNoWake: "Acordar fica disponível quando o demo estiver publicado.",
  demoNeedChallenge: "Confirme acima que você é humano para habilitar o botão.",
  demoAccounts: "Contas de demo",
  sceneLabel: "Cena de fundo",
  metroLabel: "Linha dos projetos",
  metroPrev: "Projeto anterior",
  metroNext: "Próximo projeto",
  simpleVersion: "Versão simples",
  backToSurface: "Voltar à superfície",
  stepsLabel: "Paradas deste projeto",
  stepDemo: "Demo ao vivo",
  stepFlow: "Fluxo interativo",
  stepReadme: "O README, explicado",
  projectOf: "Projeto {n} de {total}",
  nextToFlow: "Próximo: o fluxo interativo",
  nextToReadme: "Próximo: o README, explicado",
  nextProject: "Próximo projeto",
  nextContact: "Última parada: contato",
  demoReplay: "Reproduza",
  demoReplayBody: "Este projeto não tem backend ao vivo no site. Você roda ele mesmo com o comando abaixo, e os resultados medidos estão na parada do README.",
  readmeLead: "O README deste projeto, em ordem de leitura: problema, decisões, falhas, resultados e o que eu faria diferente.",
  readmeOpen: "Abrir o README no GitHub",
  flowRegion: "Diagrama interativo",
  flowLead: "Clique num nó para ver o que ele faz e abrir o código. Reproduza o fluxo passo a passo.",
  sceneAnnounce: "Projeto {n} de {total}: {name}",
  sceneHalftone: "Pontilhado",
  paletteOpen: "Buscar páginas",
  paletteTitle: "Ir para",
  paletteHint: "Digite uma página ou um projeto",
  paletteEmpty: "Nada encontrado",
  sceneQuality: "Qualidade",
  sceneQualityAuto: "auto",
  sceneQualityHigh: "alta",
  sceneQualityLow: "baixa",
  sceneMotion: "Movimento",
  demoAccountsBody: "As contas aparecem aqui quando o demo estiver publicado. O que você criar é público e temporário.",
  demoTour: "Tour guiado",
  demoSteps: [
    ["Entre como agente", "Use a conta de agente do demo no console."],
    ["Crie um ticket", "Escreva um, ou escolha um exemplo."],
    ["Rode a triagem no modelo real", "Quatro agentes respondem, cada passo com latência, tokens e modelo."],
    ["Peça um reembolso", "O modelo propõe; o gate transforma em uma aprovação."],
    ["Entre como aprovador e aprove", "Uma segunda pessoa decide."],
    ["Tente aprovar o seu próprio reembolso", "Quem pediu é recusado."],
  ],
  demoRuns: "Execuções live recentes",
  demoRunsEmpty: "Ainda não há execução live registrada. Quando houver, cada passo aparece aqui com modelo, latência, tokens e estimativa de custo.",
  demoBudget: "Orçamento restante",
  demoLimitNote: "Quando um limite é atingido, o demo diz isso. Ele nunca troca por uma saída inventada.",
  demoPublic: "Superfície pública: só dados sintéticos, reembolsos são simulados e nenhuma mensagem sai do sistema.",
  runLog: { step: "Passo", project: "Projeto", model: "Modelo", latency: "Latência", tokens: "Tokens", cost: "Estimativa de custo", empty: "Ainda não há execução live registrada." },
  flowLabels: {
    play: "Tocar", pause: "Pausar", previous: "Anterior", next: "Próximo", reset: "Reiniciar", step: "Passo", scenarios: "Cenários de falha", allSteps: "O fluxo inteiro. Aperte tocar ou próximo para percorrer.",
    detailClose: "Fechar", code: "Código neste commit", docs: "Docs neste commit", project: "Projeto", listTitle: "Versão em texto deste diagrama", diagramLabel: "Fluxo", then: "depois",
  },
  experienceLead: "Histórico de carreira, nas minhas palavras. São afirmações sobre o meu trabalho, não resultados medidos neste site.",
  careerNote: "Histórico de carreira, não é resultado medido.",
  careerTitle: "Carreira",
  education: "Formação",
  publications: "Publicações",
  certifications: "Certificações",
  languages: "Idiomas",
  skills: "Habilidades",
  draftNote: "Rascunho do CV em inglês, pendente de revisão do dono.",
  resume: "Currículo em texto puro",
  dsTitle: "Design system",
  dsLead: "O colagem-ui é o design system sobre o qual este site é construído. Tokens, componentes e uma tabela de contraste verificada por máquina vivem em um repositório próprio.",
  notFound: "Esta página não existe.",
  backHome: "Voltar para o início",
  sceneNote: "O fundo é uma cena 3D. Ela pausa quando a aba fica oculta e é trocada por uma versão plana quando o dispositivo não consegue rodá-la.",
  sceneModes: { quality: "qualidade", dots: "pontilhado", motion: "movimento" },
};

export const strings: Record<Lang, Strings> = { en, pt };

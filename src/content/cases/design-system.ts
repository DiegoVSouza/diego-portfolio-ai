import type { CaseDetail } from "../cases";
import { t } from "./t";

export const detail: CaseDetail = {
  slug: "design-system",
  summary: t(
    "`colagem-ui` is my own React design system: tokens, components and a contrast table verified in code and in a real browser. This portfolio is built on it, and its build fails when a project number has no evidence behind it.",
    "`colagem-ui` é meu design system em React: tokens, componentes e uma tabela de contraste verificada em código e em navegador real. Este portfólio é construído sobre ele, e o build falha quando um número de projeto não tem evidência.",
  ),
  tldr: {
    problem: t("A portfolio makes claims. Without a rule that ties each number to a saved run, it drifts toward marketing.", "Um portfólio faz afirmações. Sem uma regra que ligue cada número a uma execução salva, ele deriva para marketing."),
    role: t("I designed the system, the components, the evidence pipeline and the pages.", "Projetei o sistema, os componentes, o pipeline de evidência e as páginas."),
    stack: "React, TypeScript, Vite, Three.js, ELK (build time), Playwright, axe, Cloudflare Pages",
    result: t("Contrast is checked by axe in real Chrome in both themes, at a wide and a narrow viewport. The checks are in the repository, not in this sentence.", "O contraste é conferido pelo axe em Chrome real nos dois temas, em viewport largo e estreito. As checagens estão no repositório, não nesta frase."),
  },
  decisions: [
    {
      title: t("A number needs a record", "Um número precisa de um registro"),
      body: t("Evidence records are generated from files in the project repositories at an exact commit. A test fails on a digit in case text that has no record.", "Os registros de evidência são gerados a partir de arquivos nos repositórios dos projetos em um commit exato. Um teste falha com um dígito no texto de um case que não tenha registro."),
      code: { repo: "p07", path: "scripts/evidence.mjs" },
      rejected: t("Typing numbers into the page by hand.", "Digitar números na página à mão."),
    },
    {
      title: t("Diagrams are laid out at build time", "Diagramas são posicionados no build"),
      body: t("ELK computes the layout during the build, and React draws SVG from the result. No layout engine reaches the browser.", "O ELK calcula o layout durante o build, e o React desenha SVG a partir do resultado. Nenhum motor de layout chega ao navegador."),
      code: { repo: "p07", path: "scripts/flows.mjs" },
      rejected: t("Mermaid, D2 and React Flow in the browser, which I measured under this site's CSP.", "Mermaid, D2 e React Flow no navegador, que medi sob a CSP deste site."),
    },
  ],
  measured: [],
  notMeasured: [
    t("Real-user performance. No traffic yet.", "Desempenho com usuários reais. Ainda sem tráfego."),
    t("Frame rate of the 3D scene on an entry-level phone. It is pending a device test.", "Taxa de quadros da cena 3D em um celular de entrada. Pendente de teste em aparelho."),
  ],
  failures: [
    {
      what: t("Real Chrome found contrast defects that unit tests could not see.", "O Chrome real achou defeitos de contraste que testes unitários não enxergavam."),
      cause: t("jsdom does not compute contrast. Links and panels designed for the dark theme ended up on dark surfaces in the light theme.", "O jsdom não calcula contraste. Links e painéis pensados para o tema escuro acabaram sobre superfícies escuras no tema claro."),
      change: t("The fixes are in the component CSS, and the browser test stays in the gate.", "As correções estão no CSS dos componentes, e o teste no navegador continua no gate."),
    },
    {
      what: t("Wrapped diagram labels failed an accessibility rule.", "Rótulos quebrados de diagrama falhavam em uma regra de acessibilidade."),
      cause: t("Line breaks in SVG text dropped the spaces, so the visible name no longer matched the accessible name.", "Quebras de linha no texto SVG perdiam os espaços, então o nome visível não batia com o nome acessível."),
      change: t("Each wrapped line carries its trailing space.", "Cada linha quebrada carrega o seu espaço final."),
    },
  ],
  validate: { command: "npm ci && python scripts/check_fast.py", expected: t("Lint, types, the evidence, flow and catalog checks, and the unit tests pass.", "Lint, tipos, as checagens de evidência, fluxo e catálogo, e os testes unitários passam.") },
  differently: t("I would have written the evidence pipeline before the first page, so no draft ever held a typed number.", "Eu teria escrito o pipeline de evidência antes da primeira página, para nenhum rascunho nunca ter tido um número digitado."),
  next: "harness",
};

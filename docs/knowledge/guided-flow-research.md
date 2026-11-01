# Pesquisa: navegação e fluxo guiado do portfólio

Data: 2026-11-01. Fase: `.planning/phases/004-guided-flow/`. Motivo: o dono avaliou a navegação e o fluxo do site como "terríveis" e pediu um caminho único: **Sobre mim, depois cada projeto com live demo e fluxograma interativo, depois a explicação do README, tudo em um fluxo fácil de acompanhar**.

Complementa `../../../../docs/knowledge/portfolios-de-ai.md` (o que um portfólio de AI deve provar) e `../../../../docs/knowledge/diagramas-no-portfolio.md` (diagramas). Aqui o foco é só **navegação e ordem de leitura**.

## Confiabilidade das fontes

- **Forte:** páginas do NN/g (pesquisa com observação de usuários) e READMEs de repositórios que li direto.
- **Médio:** documentação de bibliotecas (Scrollama, GSAP, View Transitions) e páginas de skill.
- **Fraco, tratado como folclore:** "30 segundos por portfólio", "76% dos recrutadores dizem que o portfólio decide a entrevista" (um post de LinkedIn, autodeclarado) e testes de formulário "12% melhor" (citação secundária, formulário não é portfólio). Nenhum desses números entra no site nem nas decisões.
- As buscas web devolveram muito blog de curso e página de registro de skill. Onde só vi o resumo da busca, está marcado como **não inspecionado**.
- Não achei estudo revisado por pares comparando "página única" com "várias páginas" para portfólios.

## O que o NN/g diz e vale usar

| Achado | Fonte | Efeito no desenho |
| --- | --- | --- |
| A atenção cai forte abaixo da dobra: cerca de 57% do tempo de visualização fica acima da dobra em 2018 (20% abaixo em 2010). O padrão de queda repete nos dois estudos | [Scrolling and Attention](https://www.nngroup.com/articles/scrolling-and-attention/) | A primeira tela de cada estação precisa dizer onde a pessoa está e qual é o próximo passo, sem exigir rolagem |
| "Ilusão de completude": a pessoa acha que já viu tudo. Sinalizar com conteúdo cortado ou um marcador de "há mais" | [Illusion of Completeness](https://www.nngroup.com/videos/illusion-completeness/) | Mostrar o progresso "passo 2 de 3" e o botão "Próximo" sempre visíveis |
| Scrolljacking prejudica mais do que ajuda. Só vale se revelar informação aos poucos. Texto importante fora do trecho sequestrado. Navegação fixa dá saída | [Scrolljacking 101](https://www.nngroup.com/articles/scrolljacking-101/) | **A cena 3D nunca captura a roda.** Rolagem natural. O fluxo é conduzido por botão e trilha, não por sequestro de scroll |
| Animação disparada por scroll atrasa a leitura. Usar em conteúdo secundário e só na primeira vez | [Scroll-Triggered Text Animations](https://www.nngroup.com/articles/scroll-animations/) | Sem texto principal animado por scroll |
| Sumário fixo (em coluna lateral) ajuda; destacar a seção atual dá noção de progresso. Sumário fixo no corpo concorre com a navegação global | [Table of Contents](https://www.nngroup.com/articles/table-of-contents/) | A linha de metrô lateral é o sumário. O destaque da estação atual já existe |
| Links dentro da página servem a conteúdo longo e pouco a páginas curtas. O elemento fixo não pode cobrir o título depois do salto | [In-Page Links](https://www.nngroup.com/articles/in-page-links/), [In-Page Links for Content Navigation](https://www.nngroup.com/articles/in-page-links-content-navigation/) | Passos de uma estação viram âncoras com `scroll-margin-top` maior que a barra fixa |
| Cabeçalho fixo: 5 formas de melhorar | [Sticky Headers](https://www.nngroup.com/articles/sticky-headers/) | Cabeçalho fino; o botão "Continuar" fica na trilha, não no cabeçalho |
| Páginas longas continuam problemáticas. Alternativas: botão "carregar mais", paginação integrada, páginas tradicionais | [Scrolling and Attention](https://www.nngroup.com/articles/scrolling-and-attention/) | Uma estação por URL (página tradicional) e passos empilhados nela. Sem página única gigante |

Não encontrei no NN/g (nas buscas desta sessão) um guia sobre indicador de progresso em páginas longas. A decisão de mostrar "projeto N de 8, passo M de 3" vem do desenho de fluxo linear (skill `ux-flow`) e não de um estudo.

## Padrões de arquitetura de informação

Três opções aparecem na skill `interactive-portfolio`: página única com rolagem, várias páginas (uma por projeto), e **híbrido** (seções principais numa página, estudo de caso em página própria). O híbrido é o que o pedido do dono pede. As recomendações da skill sobre "30 segundos" não têm fonte primária e não foram usadas.

Da skill `ux-flow` (padrões de fluxo, lidos): **linear** (passo 1, 2, 3) para sequência fixa, **hub e spoke** para exploração, **máximo de 3 toques para qualquer função-chave**, entrada e saída claras, **divulgação progressiva**, e a Lei de Hick (menos opções por tela, decisão mais rápida). A skill `ux-audit` (heurísticas de Nielsen) e `design-ux` servem para auditar antes e depois.

## Repositórios abertos de portfólio de AI (lidos ou listados)

| Repositório | Padrão que interessa | Estado |
| --- | --- | --- |
| [Alielber1010/ai-portfolio](https://github.com/Alielber1010/ai-portfolio) | Registro de sistemas (uma linha cada), **explorador de arquitetura** como grafo vivo com trace passo a passo de uma requisição real, página "como eu construo". Usa React Flow, conteúdo em `lib/projects.ts` | README lido |
| [apoorvrajdev/ai-engineer-portfolio](https://github.com/apoorvrajdev/ai-engineer-portfolio) | Página única de rolagem **mais** página de caso por projeto (híbrido), projeto principal com painel de evidência, todo número ligado à população medida, conteúdo tipado em `data/*.ts`, paleta ⌘K | README lido |
| [longda/ai-engineer](https://github.com/longda/ai-engineer) | Laboratório com demos interativos e harness de avaliação ao vivo | Só resumo de busca, **não inspecionado** |
| [SemePro/ai-engineering-portfolio](https://github.com/SemePro/ai-engineering-portfolio) | Diagrama ASCII de arquitetura no README, um serviço por projeto | Só resumo de busca, **não inspecionado** |
| [djessijorge9-ship-it/architecture-evaluation-portfolio](https://github.com/djessijorge9-ship-it/architecture-evaluation-portfolio) | Ordem fixa do README: diagrama, guardrails e estado, como rodar offline, tabela de telemetria com limites ao lado de cada número | Só resumo de busca, **não inspecionado** |
| [abraar64mak/AI-Engineer-Portfolio](https://github.com/abraar64mak/AI-Engineer-Portfolio) | "Live lab" com dados sintéticos declarados como tal e aprovação humana | Só resumo de busca, **não inspecionado** |
| [AbhinavDanthuri/AI_portfolio](https://github.com/AbhinavDanthuri/AI_portfolio) | SVG de arquitetura feito à mão, regra de listar só resultado medido | Só resumo de busca, **não inspecionado** |

O que converge: **um registro curto na entrada**, **uma página por sistema**, **o diagrama dentro do caso (não numa página à parte)** e **evidência com limite declarado**. Nenhum deles tem o fluxo guiado com botão "Continuar" que o dono quer; isso é desenho próprio.

## Bibliotecas e técnicas avaliadas

| Opção | Veredito | Motivo |
| --- | --- | --- |
| **IntersectionObserver direto** | **Usar** (já em uso na linha de metrô) | Sem custo de pacote; não lê layout durante o scroll |
| Scrollama ([repo](https://github.com/russellgoldenberg/scrollama)) | Descartar | Resolve gráfico fixo com passos de texto, que seria scrollytelling. O NN/g desaconselha sequestro; o observador nativo já basta |
| GSAP ScrollTrigger | Descartar por agora | Cerca de 23 KB (uma fonte, não verificado) para fixação e linhas do tempo que não vamos usar. Orçamento do site é 100 KB gzip |
| React Flow | Descartar | O `FlowDiagram` do `colagem-ui` 0.4.4 já tem detalhe por nó, autoplay, links de código e doc, texto equivalente e roda no prerender. React Flow acrescentaria peso e perderia o texto sem JS |
| View Transitions entre documentos (`@view-transition { navigation: auto; }`) | **Aprimoramento progressivo** | Chrome e Edge 126+, Safari 18.2+; Firefox sem suporte (fontes secundárias, **confirmar em MDN e caniuse antes de depender**). Sem JavaScript. Desligar com `prefers-reduced-motion` |
| Navegação por teclado (`j`/`k`) | Manter | Já implementado e testado |

## Skills, agentes e assets inventariados

**Skills locais úteis** (nomes e descrições lidos, salvo onde indicado):

- `interactive-portfolio`, `ux-flow`, `site-architecture`, `scroll-experience`, `ux-audit`, `design-ux`, `uxui-principles`: desenho do fluxo e auditoria heurística.
- `react-flow-architect`, `react-flow-node-ts`, `threejs-*`, `gsap-scrolltrigger`, `fixing-motion-performance`, `frontend-lighthouse`, `web-perf`, `accesslint-audit`, `screen-reader-testing`, `e2e-testing-patterns`, `playwright-skill`: estão no registro, **não lidas**. Entram só se o plano precisar.

**Agentes:** `caveman:cavecrew-reviewer` (revisão do diff), `vercel:performance-optimizer` (só como referência de Core Web Vitals; o hosting é Cloudflare Pages), `Explore` e `Plan` para varreduras. Nenhum será usado sem necessidade; o trabalho é pequeno e local.

**Assets:** o site usa `assets/game/models/moto.glb` e `truck.glb` (CC0, no `assets/ledger.json`). Nenhum asset novo é necessário para esta fase. Se surgir, usar `node tools/assets.mjs` e registrar no ledger, só CC0.

## Diagnóstico do fluxo atual (do código, 2026-11-01)

1. **Ordem invertida.** A home abre com herói, depois uma faixa de números, depois um diagrama do sistema, depois o projeto principal e a grade, e só então método, **Sobre/experiência quase no fim** e contato. O pedido é Sobre primeiro.
2. **Cinco sistemas de navegação ao mesmo tempo:** cabeçalho com quatro páginas (Live demo, Evidence, Method, Experience), linha de metrô, paleta ⌘K, controles da cena e abas dentro do caso. Cada um responde a "para onde vou?" de um jeito.
3. **A demo e o fluxograma não pertencem ao projeto.** `/demo/` é uma página global; o diagrama do sistema aparece na home e na demo (duplicado). O visitante precisa ligar demo, diagrama e caso por conta própria.
4. **O README some atrás de abas.** O caso esconde Arquitetura, Decisões e Números atrás de abas (`CaseTabs`). Quem quer "a explicação do README" não vê sequência nenhuma, e conteúdo atrás de aba sofre a ilusão de completude.
5. **Sem "próximo passo" explícito.** O metrô tem Anterior e Próximo entre projetos, mas dentro de um projeto não há trilha de passos.
6. **Páginas Evidence, Method e Experience competem com a trilha** em vez de servir a ela.

## Pontos fortes a preservar

Prerender com texto sem JavaScript, EN e PT, `FlowDiagram` acessível com texto equivalente, números só de evidência, metrô com estação ativa, teclado, orçamento de 100 KB, axe limpo, Versão simples.

## Perguntas que a pesquisa não fecha

- O que é "live demo" para projetos que não são o SupportOps? A stack ao vivo é só da principal. Para os outros o site não pode simular: a proposta é **replay de execução registrada** com a origem citada, ou `PENDING`. Isso é decisão de produto no PLAN, com padrão escolhido.
- Se o visitante prefere ler antes de rodar, a ordem fixa "demo, fluxo, README" atrapalha? Mitigação no PLAN: os três passos são âncoras na mesma página, e o botão "Continuar" só sugere a ordem.

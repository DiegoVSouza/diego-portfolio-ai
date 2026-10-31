# Diego Souza, AI Engineer: portfólio

<!-- case:start -->
## O case

- **Problema.** Um portfólio faz afirmações. Sem uma regra que ligue cada número a uma execução salva, ele deriva para marketing.
- **Decisão.** Um site React pré-renderizado em que todo número é um registro de evidência copiado de um repositório de projeto em um commit exato. Um teste falha com um dígito no texto de um case que não tenha registro. Os diagramas são posicionados pelo ELK no build e desenhados em SVG pelo React; nenhum motor de layout chega ao navegador.
- **Medido.** O Chrome real com axe e contraste passa nas 28 rotas (14 páginas em cada idioma) a 1000 e 360 px. A pior rota carrega 95,1 KB gzip de JavaScript contra um orçamento de 100 KB. Fonte: `artifacts/evidence/portfolio-w7/check-full.txt`.
- **Como rodar.** `npm ci && python scripts/check_fast.py` (depois `python scripts/check_full.py` com Chrome instalado).
- **Limites.** Ainda não publicado. A cena 3D (`SCENE-*`) não foi construída, a taxa de quadros em celular não foi medida, e o demo live não rodou contra uma stack publicada.
- **Docs.** [Arquitetura](docs/architecture.md), [fase 003](.planning/phases/003-real-portfolio/SPEC.md).
<!-- case:end -->

Site React estático de Diego Vieira Gonçalves de Souza, AI Engineer. O texto do CV em inglês em `src/content/profile.ts` é rascunho até o dono revisar; o arquivo do CV nunca entra no Git. O telefone de contato e o link de WhatsApp são publicados de propósito, por instrução explícita do dono em 2026-10-31.

## Desenvolvimento

```powershell
npm ci
python scripts/check_fast.py     # lint, tipos, catálogo, evidência, fluxos e testes unitários
python scripts/check_full.py     # mais build, orçamento por rota e Playwright + axe no Chrome
```

O README em inglês descreve como o site é construído.

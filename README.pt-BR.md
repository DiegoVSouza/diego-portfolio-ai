# Lab Portfolio

Site React estático que apresenta os sete projetos de IA independentes do lab (P00–P06) com o status que cada projeto registra de si mesmo. Nada é arredondado para cima: `PENDING` continua `PENDING`, e cada projeto mostra o que ainda está aberto.

## Desenvolvimento

```powershell
npm ci
npm run dev                      # servidor Vite
npm run catalog:gen              # atualiza src/data/catalog.generated.json a partir dos projetos irmãos
python scripts/check_fast.py     # lint, tipos, drift do catálogo, testes unitários e axe
python scripts/check_full.py     # mais build, orçamento de bundle, Playwright + axe (exige Chrome)
```

## Como o conteúdo é feito

- `src/data/catalog.generated.json` é gerado de `docs/harness/feature_list.json`, `pyproject.toml` ou `package.json` e do remoto Git de cada projeto. Não edite.
- `src/data/projects.ts` guarda só texto curado (EN e pt-BR) e limites declarados, cada um citando um arquivo do projeto.
- Nenhum número é escrito à mão.

Design: `DESIGN_SYSTEM_COLAGEM_URBANA_NOITE.md`, nível 1, tema Breu, preset vermelho, a partir do tarball `colagem-ui` em `vendor/` (fixado em `docs/harness/sources.lock.json`). Orçamento: 100 KB gzip de JS inicial. O destino é Cloudflare Pages (ADR-001); nada é publicado sem autorização do dono.

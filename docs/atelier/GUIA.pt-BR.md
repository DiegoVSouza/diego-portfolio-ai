# Atelier: guia rápido

Bancada local para duas coisas: **consertar e importar modelos** e **ajustar a câmera de cada parada**. Nada disso vai para o site publicado.
O guia completo (reuso do `survive`, pesquisa, fontes) está em [`PLAYBOOK.md`](PLAYBOOK.md).

## Conferir o ambiente

```powershell
npm run atelier -- status
```

Mostra Node, Python, Blender (caminho e versão), se existe um Blender com o addon MCP escutando na porta 9876 e a pasta dos pacotes. O MCP é opcional: os scripts rodam sem ele.

## Modelos

```powershell
# o que existe nos pacotes ainda sem importar
npm run atelier -- candidates

# ver um modelo (ou uma pasta): triângulos, tamanho, origem, texturas e problemas
npm run atelier -- inspect assets/game/models

# limpar um modelo de um pacote (Blender sem janela)
npm run atelier -- improve "Downtown City MegaKit[Standard].zip::Exports/glTF (Godot)/Prop_Bollard.gltf" .cache/atelier-out/bollard.glb --height 1.1 --keep-textures

# textura para cor de vértice (paleta do site) e tira os bytes mortos
npm run atelier -- palette .cache/atelier-out/bollard.glb .cache/atelier-out/bollard-site.glb

# provar o mapeamento de eixos Blender para glTF
npm run atelier -- axis
```

`improve` aceita `--budget N` (reduz triângulos), `--height H` (altura final), `--rotate-y GRAUS` (virar a frente para +Z), `--origin none`, `--keep-textures`.
O resultado de cada `improve` fica em `artifacts/evidence/atelier/`.

Antes de entrar no jogo, o modelo precisa: passar no `inspect` sem problema, ter sido visto na página do atelier, entrar por `node tools/assets.mjs` (para ter registro no `assets/ledger.json`),
ter um plano B procedural no `world.ts` e um screenshot no e2e. A aceitação artística é sua: o `inspect` limpo não prova que ficou bonito.

## Página do atelier (modelos e câmera)

```powershell
npm run atelier:dev
```

Abra `http://localhost:5173/atelier.html` (a porta aparece no terminal).

**Aba Models**: escolha um modelo da lista ou arraste um `.glb`. Botões: original, palette (cores do design system), wire, normals; caixa de limites, turntable, "fit longest side to" (mostra no tamanho em que a cena o escala). O painel mostra os números e os problemas.

**Aba Camera**: escolha a parada, mexa nos sliders (câmera: à frente, lateral, altura; placa: à frente, lateral, base, escala; mira) e clique em **apply and reload preview**. A cena real recarrega ao lado e salta para a parada com o mesmo corte instantâneo do menu.
Os valores são escritos para uma parada do lado direito; a página espelha sozinha para as do lado esquerdo.

Os ajustes valem só no `npm run dev`. Para guardar, copie os números do painel JSON para `baseShot()` em `src/scene/layout.ts`, rode `npx vitest run src/scene` e o e2e `city-fixes`, e **olhe os screenshots**.

Lembrete: o card é HTML fitado nos quatro cantos da placa. Tudo que fica em 3D por trás do card some. Moldura, lâmpadas e carros precisam ficar fora desse retângulo.

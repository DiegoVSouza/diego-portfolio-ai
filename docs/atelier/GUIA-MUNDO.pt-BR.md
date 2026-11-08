# Editor do mundo (aba World do atelier)

Mexe à mão no mundo 3D: torres, postes de rua e props soltos. Só no `npm run atelier:dev`; o editor não vai para o build.

## Abrir

```powershell
npm run atelier:dev
```

Abra `http://localhost:5173/atelier.html` (a porta aparece no terminal) e clique em **World**. A cena real abre na direita com câmera livre (arrastar gira, botão direito move, roda dá zoom).

## O que dá para editar

| Item | Id | O que muda |
|---|---|---|
| Torre (gerada ou prédio importado) | `t<distrito>.<n>`, ex. `t2.7` | mover (x, z), girar, esticar a altura, esconder |
| Poste da avenida | `l<n>`, ex. `l14` | mover, girar, esconder |
| Placa de parada (a placa do prédio) | `b<n>`, ex. `b2` | sliders: ahead, lateral, altura (bottom) e escala. O prédio atrás da placa acompanha. Mexe nos mesmos números da aba Camera, mas grava no `world-edits.json` (`shots`) |
| Prop solto | `p...` | qualquer GLB de `assets/game/models`: posição, altura, giro, escala; apagar |

Fora do editor ficam: ruas, viaduto, molduras das placas, trens e trânsito (continuam procedurais).

## Fluxo

1. Clique numa caixa colorida na cena (ciano = intacto, amarelo = editado, vermelho = escondido, branco = selecionado) ou escolha na lista (filtro por id).
2. **move (w)** / **turn (e)**: gizmo na cena. Ou use os sliders do painel.
3. **hide / show** esconde o item; **reset** volta ao original; **fly to** leva a câmera até ele.
4. Poste bugando: filtre `l`, ache o poste pela posição (x, z na lista) ou clicando nele, e **hide** ou mova.
5. **add at the camera target** coloca um prop onde a câmera está olhando.
6. Placas: aba **boards**, escolha a parada e use os sliders. A caixa da placa só se mexe depois de salvar (o prédio e as molduras são montados na carga).
7. **save to world-edits.json** grava `src/scene/world-edits.json` e recarrega a cena: as torres reais passam a aparecer no novo lugar (elas são geometria fundida, então só mudam depois de salvar).

Depois de salvar, o atelier recarrega sozinho (o Vite vê o arquivo mudar) e volta para a mesma aba. O arquivo é versionado e entra no build. Depois de salvar: `npx vitest run src/scene`, olhe os screenshots (`e2e/city-fixes`) e faça o commit `feat(scene): ...`.

## Regras que o editor respeita

- A edição é aplicada **depois** de o gerador sortear e reservar o espaço. Esconder ou mover uma torre não muda nenhuma outra torre. O espaço reservado (para colisão) continua o original.
- Cada edição guarda a posição original (`at`). Se o gerador mudar e o id deixar de bater, a edição é ignorada com um aviso no console (`world-edits: ... edit skipped`).
- Uma torre escondida leva junto a placa neon, a placa de parede e a luz de topo dela.
- Um prop usa a paleta do site se o GLB tem cor de vértice; senão, cinza.
- Antes de usar um GLB novo no site, passe pelo fluxo de `GUIA.pt-BR.md` (inspect, ledger).

## Desfazer

`git checkout src/scene/world-edits.json` volta ao mundo gerado.

## Modelos building-*

`building-large`, `building-medium` e `building-small` foram refeitos em 2026-11-08 (a receita antiga destruía a malha). `building-sample-013` agora vem do `Building_06.fbx` com `atelier improve --planar 3` (41,6 mil triângulos, 545 KB; é usado em no máximo duas torres). O `building-sample.glb` antigo, simplificado e sem uso no site, foi removido (continua no histórico do git).

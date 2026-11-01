import type { FlowLayout } from "colagem-ui";

type Layer = FlowLayout["horizontal"];

/** Space kept at the left and right of every row, so a return route has a lane to turn in. */
const MARGIN = 40;
/** Space between two rows, where the return route runs. */
const GAP = 76;
/** A diagram wider than this is folded into rows: at the width of the page it would be drawn too small to read. */
const WIDE = 1100;

/**
 * Folds a wide left-to-right layout into rows of whole layers. The same nodes, the same order and the same edges, but the picture is narrower
 * and taller, so at the width of the page every node is drawn about half as large again. A route that stays inside a row keeps its shape; a route
 * that leaves the last layer of a row goes out to the right, down into the gap, back across to the left and into the first layer of the next row.
 * A route that skips a row (rare) keeps its original shape, shifted. Pure: the input is not changed.
 */
export function wrapRows(layer: Layer): Layer {
  const xs = [...new Set(layer.nodes.map((n) => n.x))].sort((a, b) => a - b);
  if (layer.width <= WIDE || xs.length < 4) return layer;
  const rows = Math.ceil(layer.width / WIDE);
  const per = Math.ceil(xs.length / rows);
  const rowOfX = (x: number) => Math.floor(xs.indexOf(x) / per);
  const left = (row: number) => xs[row * per]!;
  const rowHeight = layer.height;
  const top = (row: number) => row * (rowHeight + GAP);
  const nodes = layer.nodes.map((n) => {
    const row = rowOfX(n.x);
    return { ...n, x: n.x - left(row) + MARGIN, y: n.y + top(row) };
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const rowOf = new Map(layer.nodes.map((n) => [n.id, rowOfX(n.x)]));
  const edges = layer.edges.map((edge) => {
    const [from, to] = edge.key.split(">") as [string, string];
    const a = byId.get(from);
    const b = byId.get(to);
    const ra = rowOf.get(from);
    const rb = rowOf.get(to);
    if (!a || !b || ra === undefined || rb === undefined) return edge;
    if (ra === rb) {
      const dx = MARGIN - left(ra);
      return { ...edge, points: edge.points.map(([x, y]) => [x + dx, y + top(ra)] as [number, number]) };
    }
    if (rb === ra + 1) {
      const start: [number, number] = [a.x + a.w, a.y + a.h / 2];
      const end: [number, number] = [b.x, b.y + b.h / 2];
      const lane = top(ra) + rowHeight + GAP / 2;
      return { ...edge, points: [start, [start[0] + MARGIN / 2, start[1]], [start[0] + MARGIN / 2, lane], [end[0] - MARGIN / 2, lane], [end[0] - MARGIN / 2, end[1]], end] as [number, number][] };
    }
    const dx = MARGIN - left(ra);
    return { ...edge, points: edge.points.map(([x, y]) => [x + dx, y + top(ra)] as [number, number]) };
  });
  const width = Math.max(...nodes.map((n) => n.x + n.w)) + MARGIN;
  const height = top(rows - 1) + rowHeight;
  return { ...layer, width, height, nodes, edges };
}

/** Both layouts of a flow: the horizontal one folded when it is too wide, the vertical one as it is. */
export function wrapLayout(layout: FlowLayout): FlowLayout {
  return { ...layout, horizontal: wrapRows(layout.horizontal) };
}

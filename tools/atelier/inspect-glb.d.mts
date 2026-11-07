export interface GlbReport {
  triangles: number;
  vertices: number;
  meshes: number;
  nodes: number;
  materials: number;
  textures: number;
  images: number;
  animations: { name: string; channels: number }[];
  skins: number;
  attributes: string[];
  extensionsUsed: string[];
  bounds: { min: number[]; max: number[]; size: number[] } | null;
  originOffset: { x: number; y: number; z: number } | null;
}
export function parseGlb(bytes: Uint8Array): { doc: Record<string, unknown>; bin: Uint8Array | null };
export function inspect(doc: Record<string, unknown>): GlbReport;
export function judge(report: GlbReport, rules?: { budget?: number; tolerance?: number }): string[];
export function inspectFile(file: string): GlbReport & { file: string; bytes: number };

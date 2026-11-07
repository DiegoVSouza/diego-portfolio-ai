// Dependency-free glTF 2.0 inspector for the atelier: what is in a model, and what would break the site rules.
// The pure part lives in inspect-core.mjs (shared with the browser page); this file adds reading from disk.
import { readFileSync } from "node:fs";
import path from "node:path";
import { inspect, parseGlb } from "./inspect-core.mjs";

export { inspect, judge, parseGlb } from "./inspect-core.mjs";

/** Read a file from disk and inspect it. */
export function inspectFile(file) {
  const bytes = new Uint8Array(readFileSync(file));
  const doc = path.extname(file).toLowerCase() === ".gltf" ? JSON.parse(new TextDecoder().decode(bytes)) : parseGlb(bytes).doc;
  return { file, bytes: bytes.byteLength, ...inspect(doc) };
}

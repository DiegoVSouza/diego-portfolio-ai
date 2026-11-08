/**
 * Dev-server endpoint for the atelier's World tab: POST /__world-edits writes src/scene/world-edits.json, GET reads it.
 * `apply: "serve"` keeps it out of the production build. Only a local Host header is served (a page on another origin cannot rebind to it).
 */
import { Buffer } from "node:buffer";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const FILE = resolve(import.meta.dirname, "../../src/scene/world-edits.json");
const LIMIT = 1_000_000;

/** The same shape rules as parseEdits in src/scene/world-edits.ts, kept here as plain JS: reject, never repair. */
export function validate(value) {
  if (!value || value.version !== 1) return "version must be 1";
  if (!Array.isArray(value.props)) return "props must be a list";
  for (const p of value.props) {
    if (typeof p?.id !== "string" || !/^[\w.-]+\.glb$/.test(String(p.model))) return `bad prop ${JSON.stringify(p)?.slice(0, 80)}`;
    if (![p.x, p.y, p.z, p.ry, p.scale].every(Number.isFinite) || p.scale <= 0) return `bad numbers in prop ${p.id}`;
  }
  for (const key of ["towers", "lamps"]) {
    const map = value[key];
    if (!map || typeof map !== "object" || Array.isArray(map)) return `${key} must be an object`;
    for (const [id, edit] of Object.entries(map)) {
      if (!/^[tl]\d+(\.\d+)?$/.test(id)) return `bad id ${id}`;
      if (!Array.isArray(edit?.at) || edit.at.length !== 2 || !edit.at.every(Number.isFinite)) return `${id}: at must be [x, z]`;
      for (const field of ["dx", "dz", "dry", "hs"]) if (field in edit && !Number.isFinite(edit[field])) return `${id}: ${field} must be a number`;
    }
  }
  return null;
}

const localHost = (host = "") => /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);

export default function worldEditsEndpoint() {
  return {
    name: "world-edits-endpoint",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__world-edits", async (req, res) => {
        const send = (status, body) => {
          res.statusCode = status;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(body));
        };
        if (!localHost(req.headers.host)) return send(403, { error: "local only" });
        if (req.method === "GET") return send(200, JSON.parse(await readFile(FILE, "utf8")));
        if (req.method !== "POST") return send(405, { error: "GET or POST" });
        let size = 0;
        const chunks = [];
        for await (const chunk of req) {
          size += chunk.length;
          if (size > LIMIT) return send(413, { error: "too large" });
          chunks.push(chunk);
        }
        let value;
        try {
          value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch {
          return send(400, { error: "not JSON" });
        }
        const problem = validate(value);
        if (problem) return send(400, { error: problem });
        await writeFile(FILE, `${JSON.stringify(value, null, 2)}\n`, "utf8");
        send(200, { ok: true });
      });
    },
  };
}

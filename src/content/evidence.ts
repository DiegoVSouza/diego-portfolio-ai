import type { Lang, Text } from "colagem-ui";
import raw from "../data/evidence.generated.json";

export type Mode = "fake" | "replay" | "live" | "service";

/** One measured fact, copied from a saved file at an exact commit (EV-001). */
export interface Evidence {
  id: string;
  project: string;
  label: Text;
  value: string;
  mode: Mode;
  command: string;
  exitCode: number;
  commit: string;
  path: string;
  repo: string;
  recordedAt: string;
  caveat?: Text;
}

export const evidence: Evidence[] = (raw as { records: Evidence[] }).records;
const byId = new Map(evidence.map((e) => [e.id, e]));

export function ev(id: string): Evidence {
  const record = byId.get(id);
  if (!record) throw new Error(`no evidence record: ${id}`);
  return record;
}

export const permalink = (e: Pick<Evidence, "repo" | "commit" | "path">): string => `${e.repo}/blob/${e.commit}/${e.path}`;

export const TOKEN = /\{ev:([a-z0-9-]+)\}/g;

/** Replace `{ev:id}` with the record's value. A missing record throws, so a build cannot ship an invented number. */
export function resolve(text: string): string {
  return text.replace(TOKEN, (_, id: string) => ev(id).value);
}

/** Mode shown as a word. A fake record never gets a model-quality label (EV-003). */
export function modeLabel(mode: Mode, lang: Lang): string {
  const words: Record<Mode, Text> = {
    fake: { en: "fake: control logic", pt: "fake: lógica de controle" },
    replay: { en: "replay", pt: "replay" },
    live: { en: "live model", pt: "modelo real" },
    service: { en: "services, fake model", pt: "serviços, modelo fake" },
  };
  return words[mode][lang];
}

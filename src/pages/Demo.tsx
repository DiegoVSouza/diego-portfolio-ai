import { useCallback, useEffect, useRef, useState } from "react";
import { emitPulse } from "../scene/pulse";
import { Button, Command, FlowDiagram, Headline, Lead, Progress, RunLog, Stepper, StatusSeal, WakeNotice, useElapsed, type RunStep } from "colagem-ui";
import { flowLabels, getFlow, getLayout, pinnedLink } from "../content/flows";
import { useLang } from "../site/Shell";

/** What /api/status returns. Reading it wakes nothing (LIVE-004). */
export interface StatusReply {
  state: "asleep" | "awake" | "waking" | "unknown";
  services?: { name: string; state: string }[];
  budget?: { leftUsd: number; ceilingUsd: number } | null;
  turnstileSiteKey?: string | null;
  consoleUrl?: string | null;
  accounts?: { role: string; user: string; password: string }[];
  startAvailable?: boolean;
}

export interface RunsReply {
  runs: { id: string; at: string; steps: (RunStep & { agent: string })[] }[];
}

const EXPECTED_WAKE_SECONDS = 40;

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  try {
    const response = await fetch(url, { signal, headers: { accept: "application/json" } });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Loads the Turnstile widget. The script is requested only here, on /demo/, and only when a site key exists. */
function useTurnstile(siteKey: string | null | undefined, onToken: (token: string) => void) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!siteKey || !box.current) return;
    const target = box.current;
    const w = window as unknown as { turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; remove: (id: string) => void } };
    let id: string | undefined;
    const mount = () => {
      if (w.turnstile && target.isConnected) id = w.turnstile.render(target, { sitekey: siteKey, callback: onToken, theme: "dark" });
    };
    if (w.turnstile) mount();
    else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = mount;
      document.head.appendChild(script);
    }
    return () => {
      if (id && w.turnstile) w.turnstile.remove(id);
    };
  }, [siteKey, onToken]);
  return box;
}

export function DemoPage() {
  const { lang, t } = useLang();
  const [status, setStatus] = useState<StatusReply | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [runs, setRuns] = useState<RunsReply["runs"]>([]);
  const [token, setToken] = useState("");
  const [waking, setWaking] = useState(false);
  const [failed, setFailed] = useState(false);
  const [step, setStep] = useState(0);
  const elapsed = useElapsed(waking);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const reply = await getJson<StatusReply>("/api/status", signal);
    setStatus(reply);
    setLoaded(true);
    return reply;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    void getJson<RunsReply>("/api/runs/latest", controller.signal).then((r) => setRuns(r?.runs ?? []));
    return () => controller.abort();
  }, [refresh]);

  // While the stack is awake the visitor may be running tickets in the console. Poll the run list, and send one
  // scene event per step of a run that appears after the page opened. Runs already listed on arrival make none.
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const known = (list: RunsReply["runs"]) => new Set(list.map((r) => r.id));
    if (seen.current === null && loaded) seen.current = known(runs);
    if (status?.state !== "awake") return undefined;
    const timer = window.setInterval(async () => {
      if (document.hidden) return;
      const reply = await getJson<RunsReply>("/api/runs/latest");
      const list = reply?.runs ?? [];
      const baseline = seen.current ?? new Set<string>();
      for (const run of list.filter((r) => !baseline.has(r.id))) {
        run.steps.forEach((_, i) => window.setTimeout(emitPulse, i * 450));
        baseline.add(run.id);
      }
      seen.current = baseline;
      setRuns(list);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [status?.state, loaded, runs]);

  // While waking, poll the status. Only the click on the start button can start the stack.
  useEffect(() => {
    if (!waking) return;
    const timer = window.setInterval(async () => {
      const reply = await refresh();
      if (reply?.state === "awake") setWaking(false);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [waking, refresh]);
  useEffect(() => {
    if (waking && elapsed > EXPECTED_WAKE_SECONDS * 3) {
      setWaking(false);
      setFailed(true);
    }
  }, [waking, elapsed]);

  const onToken = useCallback((value: string) => setToken(value), []);
  const widget = useTurnstile(status?.turnstileSiteKey, onToken);

  const start = async () => {
    setFailed(false);
    setWaking(true);
    try {
      const response = await fetch("/api/demo/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      if (!response.ok) throw new Error("start refused");
    } catch {
      setWaking(false);
      setFailed(true);
    }
  };

  const state = status?.state ?? "unknown";
  const canStart = Boolean(status?.startAvailable) && Boolean(token) && state !== "awake" && !waking;
  const latest = runs[0];
  const system = getFlow("system");
  const live: Record<string, string> = {};
  for (const s of latest?.steps ?? []) {
    const node = system.runStep?.[s.agent];
    if (node) live[node] = `${s.latencyMs} ms · ${s.tokens} tok`;
  }

  return (
    <>
      <Headline>{t.demoTitle}</Headline>
      <Lead>{t.demoLead}</Lead>
      <Command verb="demo status" object="" />

      <section aria-labelledby="status-h">
        <h2 id="status-h" className="section-h">{t.demoStatus}</h2>
        <p role="status">
          <StatusSeal kind={state === "awake" ? "full" : state === "asleep" ? "none" : "partial"} label={!loaded ? "…" : state === "awake" ? t.demoAwake : state === "asleep" ? t.demoAsleep : t.demoUnknown} />
        </p>
        {status?.services && status.services.length > 0 && (
          <ul className="plain">{status.services.map((s) => <li key={s.name}><code>{s.name}</code>: {s.state}</li>)}</ul>
        )}
        {waking && (
          <WakeNotice
            service="demo"
            elapsed={elapsed}
            expected={EXPECTED_WAKE_SECONDS}
            failed={false}
            onRetry={() => undefined}
            labels={{ waking: (s, e, x) => `${s}: ${e}s / ~${x}s`, failed: (s) => s, retry: "Retry" }}
          />
        )}
        {failed && (
          <p className="surface-text" role="alert">
            {t.demoUnknown} <Button variant="secondary" size="sm" onClick={() => void start()}>{t.demoStart}</Button>
          </p>
        )}
        <div ref={widget} />
        <Button onClick={() => void start()} disabled={!canStart} disabledReason={canStart ? undefined : t.demoNoWake}>{t.demoStart}</Button>
        <p className="sub">{t.demoStartWhy}</p>
        {status?.budget && (
          <>
            <h3 className="sub-h">{t.demoBudget}</h3>
            <Progress value={Math.round((status.budget.leftUsd / status.budget.ceilingUsd) * 100)} label={`${t.demoBudget}: USD ${status.budget.leftUsd.toFixed(2)} / ${status.budget.ceilingUsd.toFixed(2)}`} />
          </>
        )}
        <p className="sub">{t.demoLimitNote}</p>
      </section>

      <section aria-labelledby="acc-h">
        <h2 id="acc-h" className="section-h">{t.demoAccounts}</h2>
        {status?.accounts && status.accounts.length > 0 ? (
          <table className="dt">
            <caption className="sr">{t.demoAccounts}</caption>
            <tbody>
              {status.accounts.map((a) => (
                <tr key={a.user}><th scope="row">{a.role}</th><td><code>{a.user}</code></td><td><code>{a.password}</code></td></tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="surface-text">{t.demoAccountsBody}</p>
        )}
        {status?.consoleUrl && <p><a className="btn" href={status.consoleUrl} rel="noopener noreferrer">Console</a></p>}
        <p className="sub">{t.demoPublic}</p>
      </section>

      <section aria-labelledby="tour-h">
        <h2 id="tour-h" className="section-h">{t.demoTour}</h2>
        <Stepper
          label={t.demoTour}
          current={step}
          onSelect={setStep}
          steps={t.demoSteps.map(([title, body], i) => ({ id: String(i), title, body: <p>{body}</p> }))}
        />
      </section>

      <section aria-labelledby="runs-h">
        <h2 id="runs-h" className="section-h">{t.demoRuns}</h2>
        {latest ? (
          <>
            <p className="sub">{latest.at}</p>
            <RunLog
              caption={t.demoRuns}
              labels={t.runLog}
              steps={latest.steps.map((s) => ({ id: s.id, agent: s.agent, project: s.project, model: s.model, latencyMs: s.latencyMs, tokens: s.tokens, costUsd: s.costUsd }))}
            />
            <FlowDiagram
              flow={system}
              layout={getLayout("system")}
              lang={lang}
              labels={flowLabels(lang)}
              live={live}
              links={{ code: (path, node) => pinnedLink(node.repo ?? "p05", path), docs: (path, node) => pinnedLink(node.repo ?? "p05", path) }}
            />
          </>
        ) : (
          <p className="surface-text">{t.demoRunsEmpty}</p>
        )}
      </section>
    </>
  );
}

import { useEffect, useRef } from "react";
import {
  AppFooter, AppHeader, Band, Card, Command, DataTable, Headline, Lead, Layers, Plate, SkipLink, StatusSeal, Toggle,
  useBackgroundMode, type GlyphKind,
} from "colagem-ui";
import { projects, countStates, type Feature, type State } from "./data/projects";
import { useLang } from "./i18n";
import { useRoute } from "./useRoute";

const stateOrder: State[] = ["verified", "claimed", "partial", "open"];

/** Glyph for a feature: the word always comes with it (DS-003). A failing status keeps its own glyph. */
export function glyphFor(f: Pick<Feature, "state" | "status">): GlyphKind {
  if (/FAIL/.test(f.status)) return "fail";
  return { verified: "full", partial: "partial", claimed: "warn", open: "none" }[f.state] as GlyphKind;
}

const glyphOfState: Record<State, GlyphKind> = { verified: "full", partial: "partial", claimed: "warn", open: "none" };

function Header() {
  const { lang, setLang, t } = useLang();
  return (
    <AppHeader brand={t.brand} navLabel={t.nav} nav={<><a href="#/">{t.projects}</a><a href="#method">{t.method}</a></>}>
      <Toggle pressed={lang === "en"} onChange={() => setLang("en")}>EN</Toggle>
      <Toggle pressed={lang === "pt"} onChange={() => setLang("pt")}>PT</Toggle>
    </AppHeader>
  );
}

function Home() {
  const { lang, t } = useLang();
  return (
    <>
      <Plate text="Lab Portfolio" label={t.brand} />
      <Headline>{t.thesis}</Headline>
      <Lead>{t.lead}</Lead>
      <Command verb="lab list" object="projects" n={projects.length} />
      <Band words={["evidence", "pending stays pending", "no rounded-up status"]} />
      <section aria-labelledby="projects-h">
        <h2 id="projects-h" className="section-h">{t.projects}</h2>
        <ul className="grid">
          {projects.map((p, i) => {
            const counts = countStates(p.features);
            const n = p.id.slice(1);
            return (
              <li key={p.id}>
                <Card
                  index={i}
                  numeral={n}
                  label={`${p.id.toUpperCase()}: ${p.name}`}
                  title={<a className="card-link" href={`#/${p.id}`}>{p.name}</a>}
                  summary={p.summary[lang]}
                  meta={`${p.id.toUpperCase()} · ${p.role[lang]}`}
                  tag={p.version ? `v${p.version}` : "PENDING"}
                  command={<Command verb="project open" object="" n={n} />}
                >
                  <p className="counts">
                    {stateOrder.filter((s) => counts[s] > 0).map((s) => (
                      <StatusSeal key={s} kind={glyphOfState[s]} label={`${counts[s]} ${t.states[s]}`} />
                    ))}
                  </p>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>
      <section aria-labelledby="method-h" id="method">
        <h2 id="method-h" className="section-h">{t.method}</h2>
        <p className="surface-text">{t.methodLead}</p>
        <ol className="steps">{t.steps.map((s) => <li key={s}>{s}</li>)}</ol>
        <dl className="rules">
          {t.rules.map(([title, body]) => (
            <div key={title}><dt>{title}</dt><dd>{body}</dd></div>
          ))}
        </dl>
      </section>
    </>
  );
}

function ProjectPage({ id }: { id: string }) {
  const { lang, t } = useLang();
  const p = projects.find((x) => x.id === id);
  if (!p) {
    return (
      <>
        <Headline>{t.notFound}</Headline>
        <p><a className="back" href="#/">{t.back}</a></p>
      </>
    );
  }
  return (
    <>
      <p><a className="back" href="#/">← {t.back}</a></p>
      <Headline>{p.name}</Headline>
      <Lead>{p.summary[lang]}</Lead>
      <Command verb="project open" object="" n={p.id.slice(1)} />
      <dl className="meta-list">
        <div><dt>{t.version}</dt><dd>{p.version || "PENDING"}</dd></div>
        <div>
          <dt>{t.repo}</dt>
          <dd>{p.repo ? <a href={p.repo} rel="noopener noreferrer" target="_blank">{p.repo.replace("https://github.com/", "")}</a> : t.localOnly}</dd>
        </div>
      </dl>
      <Card variant="focus" index={1} numeral={p.id.slice(1)} label={`${t.proves}: ${p.name}`} headingLevel={2} title={t.proves} summary={p.proves[lang]} meta={p.role[lang]} />
      {p.limits.length > 0 && (
        <section aria-labelledby="limits-h">
          <h2 id="limits-h" className="section-h">{t.limits}</h2>
          {p.limits.map((l) => (
            <p key={l.source} className="limit">{l.text[lang]} <span className="sub">{t.source}: <code>{l.source}</code></span></p>
          ))}
        </section>
      )}
      <section aria-labelledby="features-h">
        <h2 id="features-h" className="section-h">{t.features}</h2>
        <DataTable<Feature>
          caption={t.features}
          rowKey={(f) => f.id}
          rows={p.features}
          columns={[
            { key: "f", label: t.colFeature, render: (f) => <><code>{f.id}</code>{f.description && <span className="sub">{f.description}</span>}</> },
            { key: "s", label: t.colStatus, render: (f) => <><StatusSeal kind={glyphFor(f)} label={t.states[f.state]} /><code className="stat">{f.status || "—"}</code></> },
            { key: "e", label: t.colEvidence, render: (f) => (f.evidence ? <code>{f.evidence}</code> : t.noEvidence) },
          ]}
        />
      </section>
    </>
  );
}

export default function App() {
  const id = useRoute();
  const { t } = useLang();
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);
  useBackgroundMode();
  useEffect(() => {
    // Move focus only on navigation; on first load it would skip the skip link.
    if (first.current) {
      first.current = false;
      return;
    }
    main.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [id]);
  return (
    <>
      <Layers ghost={id && /^p\d\d$/.test(id) ? id.slice(1) : "07"} />
      <SkipLink>{t.skip}</SkipLink>
      <Header />
      <main id="main" className="wrap" ref={main} tabIndex={-1}>
        {id ? <ProjectPage id={id} /> : <Home />}
      </main>
      <AppFooter credits={t.credits}>
        <p>{t.keys}: <kbd>Tab</kbd> · <kbd>Enter</kbd>. {t.tabHint}</p>
      </AppFooter>
    </>
  );
}

import { useEffect, useRef } from "react";
import { projects, countStates, type State } from "./data/projects";
import { useLang } from "./i18n";
import { useRoute } from "./useRoute";

const stateOrder: State[] = ["verified", "claimed", "partial", "open"];

function StateBadge({ state }: { state: State }) {
  const { t } = useLang();
  return <span className={`badge badge-${state}`}>{t.states[state]}</span>;
}

function Header() {
  const { lang, setLang, t } = useLang();
  return (
    <header className="top">
      <a className="brand" href="#/">{t.brand}</a>
      <nav aria-label={t.lang}>
        <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
        <button type="button" aria-pressed={lang === "pt"} onClick={() => setLang("pt")}>PT</button>
      </nav>
    </header>
  );
}

function Home() {
  const { lang, t } = useLang();
  return (
    <>
      <section className="hero">
        <h1>{t.thesis}</h1>
        <p>{t.lead}</p>
      </section>
      <section aria-labelledby="projects-h">
        <h2 id="projects-h">{t.projects}</h2>
        <ul className="cards">
          {projects.map((p) => {
            const counts = countStates(p.features);
            return (
              <li key={p.id} className="card">
                <p className="kicker">{p.id.toUpperCase()} · {p.role[lang]}</p>
                <h3><a href={`#/${p.id}`}>{p.name}</a></h3>
                <p>{p.summary[lang]}</p>
                <p className="counts">
                  {stateOrder.filter((s) => counts[s] > 0).map((s) => (
                    <span key={s} className={`badge badge-${s}`}>{counts[s]} {t.states[s]}</span>
                  ))}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
      <section aria-labelledby="method-h">
        <h2 id="method-h">{t.method}</h2>
        <p>{t.methodLead}</p>
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
        <h1>{t.notFound}</h1>
        <p><a href="#/">{t.back}</a></p>
      </>
    );
  }
  return (
    <>
      <p><a href="#/">← {t.back}</a></p>
      <p className="kicker">{p.id.toUpperCase()} · {p.role[lang]}</p>
      <h1>{p.name}</h1>
      <p>{p.summary[lang]}</p>
      <dl className="meta">
        <div><dt>{t.version}</dt><dd>{p.version || "PENDING"}</dd></div>
        <div>
          <dt>{t.repo}</dt>
          <dd>{p.repo ? <a href={p.repo} rel="noopener noreferrer" target="_blank">{p.repo.replace("https://github.com/", "")}</a> : t.localOnly}</dd>
        </div>
      </dl>
      <h2>{t.proves}</h2>
      <p>{p.proves[lang]}</p>
      {p.limits.length > 0 && (
        <>
          <h2>{t.limits}</h2>
          <ul>
            {p.limits.map((l) => (
              <li key={l.source}>{l.text[lang]} <span className="desc">{t.source}: <code>{l.source}</code></span></li>
            ))}
          </ul>
        </>
      )}
      <h2>{t.features}</h2>
      <table>
        <thead>
          <tr><th scope="col">{t.colFeature}</th><th scope="col">{t.colStatus}</th><th scope="col">{t.colEvidence}</th></tr>
        </thead>
        <tbody>
          {p.features.map((f) => (
            <tr key={f.id}>
              <th scope="row">
                <code>{f.id}</code>
                {f.description && <span className="desc">{f.description}</span>}
              </th>
              <td><StateBadge state={f.state} /> <code className="status">{f.status || "—"}</code></td>
              <td>{f.evidence ? <code>{f.evidence}</code> : t.noEvidence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default function App() {
  const id = useRoute();
  const { t } = useLang();
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);
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
      <a className="skip" href="#main">{t.skip}</a>
      <Header />
      <main id="main" ref={main} tabIndex={-1}>
        {id ? <ProjectPage id={id} /> : <Home />}
      </main>
    </>
  );
}

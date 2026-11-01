import { Command, DecisionCard, FailureCard, FlowDiagram, GhostNumber, Headline, Lead, LinkTrio, MetricTable, StatusSeal } from "colagem-ui";
import { cardBySlug } from "../content/caseIndex";
import { caseBySlug, type Case as CaseContent } from "../content/cases";
import { ev, modeLabel, permalink, resolve } from "../content/evidence";
import { OWNER, REPO_NAMES, flowLabels, getFlow, getLayout, pinDates, pinnedLink, pins } from "../content/flows";
import { Link, hrefFor } from "../site/router";
import { CaseTabs } from "../site/CaseTabs";
import { useLang } from "../site/Shell";
import { NotFound } from "./NotFound";

/** Newest recording date among the evidence a case cites, or the pinned commit's date when it cites none (CUR-001). */
function lastVerified(c: CaseContent): string {
  const dates = c.measured.map((id) => ev(id).recordedAt).sort();
  return dates.at(-1) ?? pinDates[c.repoKey] ?? "";
}

export function CasePage({ slug }: { slug: string }) {
  const { lang, t } = useLang();
  const c = caseBySlug(slug);
  if (!c) return <NotFound />;
  const flow = getFlow(c.slug);
  const next = cardBySlug(c.next)!;
  const repoUrl = `${OWNER}/${REPO_NAMES[c.repoKey]}`;
  const pin = pins[c.repoKey];
  return (
    <>
      <p className="crumb">
        <Link to={`${hrefFor({ page: "home" }, lang)}#project-${c.slug}`}>← {t.backToSurface}</Link>
      </p>
      <Headline>{c.name[lang]}</Headline>
      <Lead>{c.outcome[lang]}</Lead>
      <Command verb="project open" object="" n={c.n} />
      <p className="case-seal">
        <StatusSeal kind={c.seal.kind} label={c.seal.label[lang]} />
        <span className="sub">
          {t.lastVerified}: {lastVerified(c)} · {t.commit}{" "}
          {pin ? <a href={`${repoUrl}/commit/${pin}`} rel="noopener noreferrer"><code>{pin.slice(0, 7)}</code></a> : t.pending}
        </span>
      </p>
      <LinkTrio
        label={t.caseLinksLabel}
        links={[
          { label: t.linkDemo, href: hrefFor({ page: "demo" }, lang) },
          { label: t.linkCode, href: repoUrl },
          { label: t.linkDocs, href: pinnedLink(c.repoKey, c.repoKey === "p07" ? "docs/architecture.md" : "docs/architecture.md") },
        ]}
      />

      <section aria-labelledby="tldr-h" className="case-focus">
        <h2 id="tldr-h" className="section-h">{t.tldr}</h2>
        <dl className="tldr">
          <div><dt>{t.problem}</dt><dd>{resolve(c.tldr.problem[lang])}</dd></div>
          <div><dt>{t.role}</dt><dd>{resolve(c.tldr.role[lang])}</dd></div>
          <div><dt>{t.stack}</dt><dd>{c.tldr.stack}</dd></div>
          <div><dt>{t.result}</dt><dd>{resolve(c.tldr.result[lang])}</dd></div>
        </dl>
        <p className="surface-text">{c.summary[lang]}</p>
        <p className="surface-text case-honest">
          <a href="#numbers">{t.notMeasured}</a> · <a href="#decisions">{t.failures}</a>
        </p>
      </section>

      <CaseTabs
        label={t.tabsLabel}
        panels={[
          {
            id: "demo",
            label: t.tabDemo,
            anchors: ["run-h", "val-h"],
            children: (
              <>
          <section aria-labelledby="run-h">
            <h2 id="run-h" className="section-h">{t.seeItRun}</h2>
            <p className="surface-text">{t.seeItRunBody}</p>
            <p><Link className="btn" to={hrefFor({ page: "demo" }, lang)}>{t.linkDemo}</Link></p>
          </section>
          <section aria-labelledby="val-h">
            <h2 id="val-h" className="section-h">{t.validate}</h2>
            <pre className="code" tabIndex={0}><code>{`git clone ${repoUrl}.git\ncd ${REPO_NAMES[c.repoKey]}\n${c.validate.command}`}</code></pre>
            <p className="surface-text">{t.validateExpected}: {c.validate.expected[lang]}</p>
          </section>
              </>
            ),
          },
          {
            id: "architecture",
            label: t.tabArchitecture,
            anchors: ["how-h"],
            children: (
              <>
          <section aria-labelledby="how-h">
            <h2 id="how-h" className="section-h">{t.how}</h2>
            <FlowDiagram
              flow={flow}
              layout={getLayout(c.slug)}
              lang={lang}
              labels={flowLabels(lang)}
              links={{ code: (path, node) => pinnedLink(node.repo ?? c.repoKey, path), docs: (path, node) => pinnedLink(node.repo ?? c.repoKey, path) }}
            />
          </section>
              </>
            ),
          },
          {
            id: "decisions",
            label: t.tabDecisions,
            anchors: ["dec-h", "fail-h"],
            children: (
              <>
          <section aria-labelledby="dec-h">
            <h2 id="dec-h" className="section-h">{t.decisions}</h2>
            {c.decisions.map((d) => (
              <DecisionCard
                key={d.title.en}
                title={d.title[lang]}
                body={<p>{resolve(d.body[lang])}</p>}
                rejected={d.rejected[lang]}
                link={d.code ? { href: pinnedLink(d.code.repo, d.code.path), text: `${t.linkCode}: ${d.code.path}` } : undefined}
                labels={{ rejected: t.rejected }}
              />
            ))}
          </section>
          <section aria-labelledby="fail-h">
            <h2 id="fail-h" className="section-h">{t.failures}</h2>
            {c.failures.map((f) => (
              <FailureCard key={f.what.en} what={f.what[lang]} cause={f.cause[lang]} change={f.change[lang]} labels={{ what: t.failWhat, cause: t.failCause, change: t.failChange }} />
            ))}
          </section>
              </>
            ),
          },
          {
            id: "numbers",
            label: t.tabNumbers,
            anchors: ["res-h", "diff-h", "next-h"],
            children: (
              <>
          <section aria-labelledby="res-h">
            <h2 id="res-h" className="section-h">{t.results}</h2>
            <h3 className="sub-h">{t.measured}</h3>
            {c.measured.length > 0 ? (
              <MetricTable
                caption={t.measured}
                labels={{ metric: t.metric, value: t.value, mode: t.mode, source: t.source }}
                rows={c.measured.map((id) => {
                  const e = ev(id);
                  return {
                    id,
                    label: e.label[lang],
                    value: e.value,
                    mode: modeLabel(e.mode, lang),
                    caveat: e.caveat?.[lang],
                    source: (
                      <a href={permalink(e)} rel="noopener noreferrer">
                        <code>{e.path}</code>
                        <span className="sub">{t.commit} {e.commit.slice(0, 7)} · {e.recordedAt} · {t.exit} {e.exitCode}</span>
                      </a>
                    ),
                  };
                })}
              />
            ) : (
              <p className="surface-text">{t.pending}</p>
            )}
            <h3 className="sub-h">{t.notMeasured}</h3>
            <ul className="plain">
              {c.notMeasured.map((n) => <li key={n.en}>{n[lang]}</li>)}
            </ul>
          </section>
          <section aria-labelledby="diff-h">
            <h2 id="diff-h" className="section-h">{t.differently}</h2>
            <p className="surface-text">{c.differently[lang]}</p>
          </section>
          <section aria-labelledby="next-h">
            <h2 id="next-h" className="section-h">{t.next}</h2>
            <p><Link className="btn btn-secondary" to={hrefFor({ page: "case", slug: next.slug }, lang)}>{next.name[lang]}</Link></p>
          </section>
              </>
            ),
          },
        ]}
      />







      <GhostNumber n={c.n} />
    </>
  );
}

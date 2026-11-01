import { Command, DecisionCard, FailureCard, FlowDiagram, GhostNumber, Headline, Lead, LinkTrio, MetricTable, StatusSeal } from "colagem-ui";
import { cardBySlug, caseCards } from "../content/caseIndex";
import { caseBySlug, type Case as CaseContent } from "../content/cases";
import { ev, modeLabel, permalink, resolve } from "../content/evidence";
import { OWNER, REPO_NAMES, flowLabels, getFlow, getLayout, pinDates, pinnedLink, pins } from "../content/flows";
import { Link, hrefFor } from "../site/router";
import { CaseSteps } from "../site/CaseSteps";
import { DemoPanel } from "./Demo";
import { FlowScroll } from "../site/FlowScroll";
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
  const index = caseCards.findIndex((x) => x.slug === c.slug);
  const next = caseCards[index + 1] ?? cardBySlug(c.next)!;
  const live = c.slug === "supportops";
  const pos = String(index + 1).padStart(2, "0");
  const isLast = index === caseCards.length - 1;
  const nextStop = isLast
    ? { label: t.nextContact, href: `${hrefFor({ page: "home" }, lang)}#contact-h` }
    : { label: `${t.nextProject}: ${next.name[lang]}`, href: hrefFor({ page: "case", slug: next.slug }, lang) };
  const repoUrl = `${OWNER}/${REPO_NAMES[c.repoKey]}`;
  const pin = pins[c.repoKey];
  return (
    <>
      <p className="crumb">
        <Link to={`${hrefFor({ page: "home" }, lang)}#project-${c.slug}`}>← {t.backToSurface}</Link>
      </p>
      <Headline>{c.name[lang]}</Headline>
      <Lead>{c.outcome[lang]}</Lead>
      <Command verb="project open" object="" n={pos} />
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
          { label: live ? t.linkDemo : t.demoReplay, href: "#demo" },
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
          <a href="#numbers">{t.notMeasured}</a> · <a href="#fail-h">{t.failures}</a>
        </p>
      </section>

      <CaseSteps
        railLabel={t.stepsLabel}
        labels={[live ? t.railDemo : t.railRun, t.railFlow, t.railReadme]}
        position={t.projectOf.replace("{n}", String(index + 1)).replace("{total}", String(caseCards.length))}
        steps={[
          {
            id: "demo",
            label: live ? t.stepDemo : t.demoReplay,
            next: { label: t.nextToFlow, href: "#flow" },
            children: live ? (
              <section aria-labelledby="run-h">
                <h3 id="run-h" className="sub-h">{t.seeItRun}</h3>
                <p className="surface-text">{t.seeItRunBody}</p>
                <DemoPanel embedded />
              </section>
            ) : (
              <section>
                <p className="surface-text">{t.demoReplayBody}</p>
                <section aria-labelledby="val-h">
                  <h3 id="val-h" className="sub-h">{t.validate}</h3>
                  <pre className="code" tabIndex={0}><code>{`git clone ${repoUrl}.git
cd ${REPO_NAMES[c.repoKey]}
${c.validate.command}`}</code></pre>
                  <p className="surface-text">{t.validateExpected}: {c.validate.expected[lang]}</p>
                </section>
              </section>
            ),
          },
          {
            id: "flow",
            label: t.stepFlow,
            next: { label: t.nextToReadme, href: "#readme" },
            children: (
              <section id="architecture" aria-labelledby="how-h">
                <h3 id="how-h" className="sub-h">{t.how}</h3>
                <p className="surface-text">{t.flowLead}</p>
                <FlowScroll label={t.flowRegion}>
                <FlowDiagram
                  flow={flow}
                  layout={getLayout(c.slug)}
                  lang={lang}
                  labels={flowLabels(lang)}
                  links={{ code: (path, node) => pinnedLink(node.repo ?? c.repoKey, path), docs: (path, node) => pinnedLink(node.repo ?? c.repoKey, path) }}
                />
                </FlowScroll>
              </section>
            ),
          },
          {
            id: "readme",
            label: t.stepReadme,
            next: nextStop,
            children: (
              <>
                <p className="surface-text">{t.readmeLead} <a href={pinnedLink(c.repoKey, "README.md")} rel="noopener noreferrer">{t.readmeOpen}</a></p>
                <section id="decisions" aria-labelledby="dec-h">
                  <h3 id="dec-h" className="sub-h">{t.decisions}</h3>
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
                  <h3 id="fail-h" className="sub-h">{t.failures}</h3>
                  {c.failures.map((f) => (
                    <FailureCard key={f.what.en} what={f.what[lang]} cause={f.cause[lang]} change={f.change[lang]} labels={{ what: t.failWhat, cause: t.failCause, change: t.failChange }} />
                  ))}
                </section>
                <section id="numbers" aria-labelledby="res-h">
                  <h3 id="res-h" className="sub-h">{t.results}</h3>
                  <h4 className="sub-h">{t.measured}</h4>
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
                  <h4 className="sub-h">{t.notMeasured}</h4>
                  <ul className="plain">
                    {c.notMeasured.map((n) => <li key={n.en}>{n[lang]}</li>)}
                  </ul>
                </section>
                <section aria-labelledby="diff-h">
                  <h3 id="diff-h" className="sub-h">{t.differently}</h3>
                  <p className="surface-text">{c.differently[lang]}</p>
                </section>
              </>
            ),
          },
        ]}
      />

      <GhostNumber n={pos} />
    </>
  );
}

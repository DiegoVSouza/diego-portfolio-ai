import { Card, Command, GhostNumber, Headline, Lead, Plate, StatusSeal } from "colagem-ui";
import { useEffect, type ReactNode } from "react";
import { caseCards, type CaseCard } from "../content/caseIndex";
import { districts, type District } from "../content/districts";
import { evidence, modeLabel, permalink } from "../content/evidence";
import { profile } from "../content/profile";
import { Disclosure } from "../site/Disclosure";
import { Link, hrefFor } from "../site/router";
import { useLang } from "../site/Shell";

/**
 * The panels lean with the camera. GSAP loads after the page is interactive, in its own chunk, so first load stays small and
 * the page reads fine before (and without) it. The scene reports its pan in `scene:travel`; each panel turns about the vertical
 * axis by a few degrees, which is a different transform property from anything else on the page.
 */
function useLean() {
  useEffect(() => {
    const main = document.getElementById("main");
    if (!main || typeof matchMedia !== "function" || matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let revert = () => undefined as void;
    let alive = true;
    void import("gsap").then(({ gsap }) => {
      if (!alive) return;
      const ctx = gsap.context(() => {
        const panels = Array.from(main.querySelectorAll<HTMLElement>(".district-panel"));
        gsap.set(panels, { transformPerspective: 1200 });
        const lean = panels.map((panel) => gsap.quickSetter(panel, "rotationY", "deg") as (v: number) => void);
        const onTravel = (event: Event) => {
          const yaw = (event as CustomEvent<{ yaw: number }>).detail.yaw * 9;
          for (const set of lean) set(yaw);
        };
        window.addEventListener("scene:travel", onTravel);
        return () => window.removeEventListener("scene:travel", onTravel);
      }, main);
      revert = () => ctx.revert();
    });
    return () => {
      alive = false;
      revert();
    };
  }, []);
}

/** The tests behind a project, tucked away: they open on click, tap or keyboard, and are in the HTML either way. */
function ProjectExtras({ card }: { card: CaseCard }) {
  const { lang, t } = useLang();
  const rows = evidence.filter((e) => e.project === card.slug);
  return (
    <div className="card-extra">
      <p className="cta">
        <Link className="btn btn-big" to={hrefFor({ page: "case", slug: card.slug }, lang)}>{card.slug === "supportops" ? t.navDemo : t.openProject} →</Link>
      </p>
      <Disclosure summary={t.testsEvidence}>
        {rows.length > 0 ? (
          <ul className="proof-mini">
            {rows.map((e) => (
              <li key={e.id}>
                <strong>{e.value}</strong> <span>{e.label[lang]}</span>
                <span className="proof-mini-meta">
                  {modeLabel(e.mode, lang)} · <a href={permalink(e)} rel="noopener noreferrer">{t.commit} {e.commit.slice(0, 7)}</a>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sub">{t.pending}</p>
        )}
      </Disclosure>
    </div>
  );
}

/** One project as a compact entry, for the districts that hold several: the call to action and the tests sit on one line. */
function ProjectRow({ card }: { card: CaseCard }) {
  const { lang, t } = useLang();
  const n = String(caseCards.findIndex((c) => c.slug === card.slug) + 1).padStart(2, "0");
  const rows = evidence.filter((e) => e.project === card.slug);
  return (
    <article className="proj" data-scene-case={card.slug} id={`project-${card.slug}`}>
      <p className="proj-head">
        <span className="proj-n">{n}</span>
        <StatusSeal kind={card.seal.kind} label={card.seal.label[lang]} />
      </p>
      <h3 className="proj-title">
        <Link className="card-link" to={hrefFor({ page: "case", slug: card.slug }, lang)}>{card.name[lang]}</Link>
      </h3>
      <p className="proj-sum">{card.outcome[lang]}</p>
      <div className="proj-actions">
        <Link className="btn" to={hrefFor({ page: "case", slug: card.slug }, lang)}>{t.openProject} →</Link>
        <Disclosure summary={t.testsEvidence}>
          {rows.length > 0 ? (
            <ul className="proof-mini">
              {rows.map((e) => (
                <li key={e.id}>
                  <strong>{e.value}</strong> <span>{e.label[lang]}</span>
                  <span className="proof-mini-meta">
                    {modeLabel(e.mode, lang)} · <a href={permalink(e)} rel="noopener noreferrer">{t.commit} {e.commit.slice(0, 7)}</a>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sub">{t.pending}</p>
          )}
        </Disclosure>
      </div>
    </article>
  );
}

/** A district of the home: a tall section the camera crosses, with its panel held in view while it does. */
function DistrictSection({ d, children }: { d: District; children: ReactNode }) {
  const { lang } = useLang();
  return (
    <section data-district={d.id} id={`d-${d.id}`} className={`district district-${d.id}`} aria-labelledby={`${d.id}-h`}>
      <div className="district-panel">
        <p className="district-n" aria-hidden="true">{String(districts.indexOf(d) + 1).padStart(2, "0")}</p>
        <h2 id={`${d.id}-h`} className="section-h">{d.name[lang]}</h2>
        {children}
      </div>
    </section>
  );
}

export function Home() {
  const { lang, t } = useLang();
  const flagship = caseCards[0]!;
  useLean();
  const by = (id: District["id"]) => districts.find((d) => d.id === id)!;
  const rows = (id: District["id"]) => by(id).slugs.map((slug) => caseCards.find((c) => c.slug === slug)!);
  return (
    <>
      <section data-district="arrival" id="d-arrival" className="district district-arrival" aria-labelledby="arrival-h">
        <div className="district-panel">
          <h2 id="arrival-h" className="sr">{by("arrival").name[lang]}</h2>
          <Plate text="AI Engineer" label={profile.name} />
          <Headline>{t.heroTitle}</Headline>
          <Lead>{t.heroLead}</Lead>
          <p className="cta">
            <Link className="btn btn-big" to={hrefFor({ page: "case", slug: flagship.slug }, lang)}>{t.heroCta} →</Link>
            <Link className="btn btn-secondary btn-big" to={`${hrefFor({ page: "case", slug: flagship.slug }, lang)}#demo`}>{t.navDemo}</Link>
          </p>
          <ol className="hero-steps" aria-label={t.heroStepsLabel}>
            {t.heroSteps.map((step) => <li key={step}>{step}</li>)}
          </ol>
          <p className="scroll-hint" aria-hidden="true">{t.scrollHint}</p>
        </div>
      </section>

      <DistrictSection d={by("ops")}>
        <p className="surface-text">{by("ops").blurb[lang]}</p>
        <div data-scene-case={flagship.slug} id={`project-${flagship.slug}`}>
          <Card
            variant="focus"
            index={1}
            numeral="01"
            label={`${flagship.ids}: ${flagship.name[lang]}`}
            headingLevel={3}
            title={<Link className="card-link" to={hrefFor({ page: "case", slug: flagship.slug }, lang)}>{flagship.name[lang]}</Link>}
            summary={flagship.outcome[lang]}
            meta={`${flagship.ids} · ${flagship.group[lang]}`}
            tag={flagship.hook[lang]}
            seal={<StatusSeal kind={flagship.seal.kind} label={flagship.seal.label[lang]} />}
            command={<Command verb="project open" object="" n="01" />}
          />
        </div>
        <ProjectExtras card={flagship} />
      </DistrictSection>

      {(["core", "platform", "craft"] as const).map((id) => (
        <DistrictSection key={id} d={by(id)}>
          <div className="projs">
            {rows(id).map((card) => <ProjectRow key={card.slug} card={card} />)}
          </div>
        </DistrictSection>
      ))}

      <DistrictSection d={by("terminal")}>
        <p className="surface-text">{by("terminal").blurb[lang]}</p>
        <section aria-labelledby="about-h" className="terminal-block">
          <h2 id="about-h" className="sub-h">{t.aboutTitle}</h2>
          <p className="surface-text">{profile.summary[lang]}</p>
          <ul className="plain">
            {profile.career.slice(0, 2).map((j) => (
              <li key={j.id}><strong>{j.role}</strong>, {j.org}. <span className="sub">{j.from} to {j.to} · {t.careerNote}</span></li>
            ))}
          </ul>
          <p><Link to={hrefFor({ page: "experience" }, lang)}>{t.navExperience}</Link></p>
        </section>
        <section aria-labelledby="contact-h" className="terminal-block">
          <h2 id="contact-h" className="sub-h">{t.contactTitle}</h2>
          <p className="surface-text">{t.contactLead}</p>
          <p className="cta"><a className="btn btn-big" href={profile.whatsapp} rel="noopener noreferrer">{t.contactWhatsapp}</a></p>
          <ul className="contact">
            <li>{t.contactPhone}: <a href={`tel:${profile.phone.split(" ").join("")}`}>{profile.phone}</a></li>
            <li><a href={`mailto:${profile.email}`}>{profile.email}</a></li>
            <li><a href={profile.linkedin} rel="noopener noreferrer">LinkedIn</a></li>
            <li><a href={profile.github} rel="noopener noreferrer">GitHub</a></li>
          </ul>
        </section>
      </DistrictSection>
      <GhostNumber n="01" />
    </>
  );
}

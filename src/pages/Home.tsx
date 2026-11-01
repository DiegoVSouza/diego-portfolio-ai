import { Card, Command, GhostNumber, Headline, Lead, Plate, StatusSeal } from "colagem-ui";
import { useEffect } from "react";
import { caseCards, type CaseCard } from "../content/caseIndex";
import { evidence, modeLabel, permalink } from "../content/evidence";
import { profile } from "../content/profile";
import { Disclosure } from "../site/Disclosure";
import { Link, hrefFor } from "../site/router";
import { useLang } from "../site/Shell";

/**
 * The page is a street the cards drive along: each panel slides in from its side as the city moves under it.
 * GSAP and ScrollTrigger load after the page is interactive, in their own chunk, so first load stays small and the
 * page reads fine before (and without) them. gsap.context() reverts every tween and trigger when the page is left.
 */
function useTravel() {
  useEffect(() => {
    const main = document.getElementById("main");
    if (!main || typeof matchMedia !== "function") return undefined;
    let revert = () => undefined as void;
    let alive = true;
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (!alive) return;
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
        const media = gsap.matchMedia();
        media.add("(prefers-reduced-motion: no-preference)", () => {
          const panels = Array.from(main.querySelectorAll<HTMLElement>(":scope > section, :scope > .cta, [data-travel]"));
          panels.forEach((panel, i) => {
            const side = i % 2 ? 1 : -1;
            gsap.fromTo(
              panel,
              { x: side * 90, rotate: side * 1.4 },
              { x: 0, rotate: 0, ease: "power2.out", scrollTrigger: { trigger: panel, start: "top 96%", end: "top 62%", scrub: 0.6 } },
            );
          });
          // The panels turn with the camera: the scene reports its swing, the panels lean into it (a different
          // transform property from the one the scroll tween drives, so the two add up).
          gsap.set(panels, { transformPerspective: 1100 });
          const lean = panels.map((panel) => gsap.quickSetter(panel, "rotationY", "deg") as (v: number) => void);
          const onTravel = (event: Event) => {
            const yaw = (event as CustomEvent<{ yaw: number }>).detail.yaw * 11;
            for (const set of lean) set(yaw);
          };
          window.addEventListener("scene:travel", onTravel);
          return () => window.removeEventListener("scene:travel", onTravel);
        });
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

export function Home() {
  const { lang, t } = useLang();
  const flagship = caseCards[0]!;
  useTravel();
  return (
    <>
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

      <section aria-labelledby="portfolio-h" className="portfolio-intro">
        <h2 id="portfolio-h" className="section-h">{t.portfolioTitle}</h2>
        <p className="surface-text">{t.portfolioLead}</p>
        <p className="portfolio-count">{caseCards.length} <span>{t.projectsTitle}</span></p>
      </section>

      <section aria-labelledby="flag-h">
        <h2 id="flag-h" className="section-h">{t.flagshipTitle}</h2>
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
      </section>

      <section aria-labelledby="projects-h">
        <h2 id="projects-h" className="section-h">{t.projectsTitle}</h2>
        <ul className="grid">
          {caseCards.slice(1).map((c, i) => (
            <li key={c.slug} data-scene-case={c.slug} data-travel id={`project-${c.slug}`}>
              <Card
                index={i}
                numeral={String(i + 2).padStart(2, "0")}
                label={`${c.ids}: ${c.name[lang]}`}
                headingLevel={3}
                title={<Link className="card-link" to={hrefFor({ page: "case", slug: c.slug }, lang)}>{c.name[lang]}</Link>}
                summary={c.outcome[lang]}
                meta={`${c.ids} · ${c.group[lang]}`}
                tag={c.hook[lang]}
                seal={<StatusSeal kind={c.seal.kind} label={c.seal.label[lang]} />}
              />
              <ProjectExtras card={c} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="about-h">
        <h2 id="about-h" className="section-h">{t.aboutTitle}</h2>
        <p className="surface-text">{profile.summary[lang]}</p>
        <ul className="plain">
          {profile.career.slice(0, 2).map((j) => (
            <li key={j.id}><strong>{j.role}</strong>, {j.org}. <span className="sub">{j.from} to {j.to} · {t.careerNote}</span></li>
          ))}
        </ul>
        <p><Link to={hrefFor({ page: "experience" }, lang)}>{t.navExperience}</Link></p>
      </section>

      <section aria-labelledby="contact-h">
        <h2 id="contact-h" className="section-h">{t.contactTitle}</h2>
        <p className="surface-text">{t.contactLead}</p>
        <p className="cta"><a className="btn btn-big" href={profile.whatsapp} rel="noopener noreferrer">{t.contactWhatsapp}</a></p>
        <ul className="contact">
          <li>{t.contactPhone}: <a href={`tel:${profile.phone.split(" ").join("")}`}>{profile.phone}</a></li>
          <li><a href={`mailto:${profile.email}`}>{profile.email}</a></li>
          <li><a href={profile.linkedin} rel="noopener noreferrer">LinkedIn</a></li>
          <li><a href={profile.github} rel="noopener noreferrer">GitHub</a></li>
        </ul>
      </section>
      <GhostNumber n="01" />
    </>
  );
}

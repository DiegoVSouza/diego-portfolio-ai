import { Card, Command, GhostNumber, Headline, Lead, Plate, StatusSeal } from "colagem-ui";
import type { ReactNode } from "react";
import { caseCards, type CaseCard } from "../content/caseIndex";
import { districts, stops, type Stop } from "../content/districts";
import { evidence, modeLabel, permalink } from "../content/evidence";
import { profile } from "../content/profile";
import { Disclosure } from "../site/Disclosure";
import { Link, hrefFor } from "../site/router";
import { useLang } from "../site/Shell";

/**
 * The home is a journey through the city, one stop per card. In the page flow (no scene, a narrow screen, the simple version) the cards are
 * plain sections in order. With the scene running on a wide screen each card hangs in its own part of the city: the scene projects its
 * billboard to the screen and writes the position and size on the card, and the camera parks on it (see src/scene/scene.ts, updateCards).
 */

/** The tests behind a project: closed until asked for, and in the HTML either way. */
function Evidence({ card }: { card: CaseCard }) {
  const { lang, t } = useLang();
  const rows = evidence.filter((e) => e.project === card.slug);
  return (
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
  );
}

/** One stop: a section that gives the camera its scroll distance, holding the card. */
function StopSection({ stop, labelledBy, children }: { stop: Stop; labelledBy: string; children: ReactNode }) {
  return (
    <section data-stop={stop.id} id={`s-${stop.id}`} className="stop" aria-labelledby={labelledBy}>
      <div className={stop.wide ? "stop-card wide" : "stop-card"}>{children}</div>
    </section>
  );
}

/** The line above a project's title: its district, and its place in it. */
function Kicker({ stop }: { stop: Stop }) {
  const { lang } = useLang();
  const mates = stops.filter((s) => s.district === stop.district);
  return (
    <p className="stop-kicker">
      {districts[stop.district]!.name[lang]}
      {mates.length > 1 && <span> · {mates.indexOf(stop) + 1}/{mates.length}</span>}
    </p>
  );
}

function ProjectStop({ stop }: { stop: Stop }) {
  const { lang, t } = useLang();
  const card = caseCards.find((c) => c.slug === stop.slug)!;
  const n = String(caseCards.findIndex((c) => c.slug === card.slug) + 1).padStart(2, "0");
  const first = stop.slug === "supportops";
  return (
    <StopSection stop={stop} labelledBy={`${stop.id}-h`}>
      <div data-scene-case={card.slug} id={`project-${card.slug}`}>
        <Kicker stop={stop} />
        {first ? (
          <Card
            variant="focus"
            index={1}
            numeral={n}
            label={`${card.ids}: ${card.name[lang]}`}
            headingLevel={2}
            title={<Link className="card-link" to={hrefFor({ page: "case", slug: card.slug }, lang)}><span id={`${stop.id}-h`}>{card.name[lang]}</span></Link>}
            summary={card.outcome[lang]}
            meta={`${card.ids} · ${card.group[lang]}`}
            tag={card.hook[lang]}
            seal={<StatusSeal kind={card.seal.kind} label={card.seal.label[lang]} />}
            command={<Command verb="project open" object="" n={n} />}
          />
        ) : (
          <>
            <p className="proj-head">
              <span className="proj-n">{n}</span>
              <StatusSeal kind={card.seal.kind} label={card.seal.label[lang]} />
            </p>
            <h2 className="proj-title" id={`${stop.id}-h`}>
              <Link className="card-link" to={hrefFor({ page: "case", slug: card.slug }, lang)}>{card.name[lang]}</Link>
            </h2>
            <p className="proj-sum">{card.outcome[lang]}</p>
            <p className="proj-tag">{card.hook[lang]}</p>
          </>
        )}
        <div className="proj-actions">
          <Link className="btn btn-big" to={hrefFor({ page: "case", slug: card.slug }, lang)}>{first ? t.navDemo : t.openProject} →</Link>
          <Evidence card={card} />
        </div>
      </div>
    </StopSection>
  );
}

export function Home() {
  const { lang, t } = useLang();
  const flagship = caseCards[0]!;
  const arrival = stops[0]!;
  const terminal = stops[stops.length - 1]!;
  return (
    <>
      <StopSection stop={arrival} labelledBy="arrival-h">
        <h2 id="arrival-h" className="sr">{districts[0]!.name[lang]}</h2>
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
      </StopSection>

      {stops.filter((s) => s.slug).map((stop) => <ProjectStop key={stop.id} stop={stop} />)}

      <StopSection stop={terminal} labelledBy="terminal-h">
        <h2 id="terminal-h" className="sr">{districts[terminal.district]!.name[lang]}</h2>
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
      </StopSection>
      <GhostNumber n="01" />
    </>
  );
}

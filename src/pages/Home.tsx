import { GhostNumber, StatusSeal } from "colagem-ui";
import type { ReactNode } from "react";
import { caseCards } from "../content/caseIndex";
import { districts, stops, type Stop } from "../content/districts";
import { profile } from "../content/profile";
import { Link, hrefFor } from "../site/router";
import { useLang } from "../site/Shell";

/**
 * The home is a journey through the city, one stop per card. In the page flow (no scene, a narrow screen, the simple version) the cards are
 * plain sections in order. With the scene running on a wide screen each card IS a sign in the city: the scene fits it to its board in
 * perspective and the camera parks in front of it (see src/scene/scene.ts, updateCards).
 *
 * Every card has the same five parts, in the same order, so it is easy to read: the number and place, the title, one short paragraph, one
 * tag, and the actions. While it hangs in the city the card has one fixed size and each text is cut at a set number of lines, so nothing
 * can spill over its edge (src/styles/site.css, "the stops").
 */

/** One stop: a section that gives the camera its scroll distance, holding the card. */
function StopSection({ stop, labelledBy, children }: { stop: Stop; labelledBy: string; children: ReactNode }) {
  return (
    <section data-stop={stop.id} id={`s-${stop.id}`} className="stop" aria-labelledby={labelledBy}>
      <div className="stop-card">{children}</div>
    </section>
  );
}

/** The top row: the stop's number (the same one painted on its sign) and where it is. */
function CardTop({ stop }: { stop: Stop }) {
  const { lang } = useLang();
  const mates = stops.filter((s) => s.district === stop.district);
  const place = districts[stop.district]!.name[lang] + (mates.length > 1 ? ` · ${mates.indexOf(stop) + 1}/${mates.length}` : "");
  return (
    <header className="sc-top">
      <span className="sc-num" aria-hidden="true">{String(stops.indexOf(stop) + 1).padStart(2, "0")}</span>
      <p className="sc-kicker">{place}</p>
    </header>
  );
}

function ProjectStop({ stop }: { stop: Stop }) {
  const { lang, t } = useLang();
  const card = caseCards.find((c) => c.slug === stop.slug)!;
  const to = hrefFor({ page: "case", slug: card.slug }, lang);
  const first = stop.slug === "supportops";
  return (
    <StopSection stop={stop} labelledBy={`${stop.id}-h`}>
      <div className="sc" data-scene-case={card.slug} id={`project-${card.slug}`}>
        <CardTop stop={stop} />
        <h2 className="sc-title" id={`${stop.id}-h`}>
          <Link className="card-link" to={to}>{card.name[lang]}</Link>
        </h2>
        <p className="sc-sum">{card.outcome[lang]}</p>
        <p className="sc-notes">
          <span className="sc-tag">{card.hook[lang]}</span>
          <StatusSeal kind={card.seal.kind} label={card.seal.label[lang]} />
        </p>
        <p className="sc-actions">
          <Link className="btn btn-big" to={first ? `${to}#demo` : to}>{first ? t.navDemo : t.openProject} →</Link>
          {first && <Link className="btn btn-secondary btn-big" to={to}>{t.openProject}</Link>}
        </p>
      </div>
    </StopSection>
  );
}

export function Home() {
  const { lang, t } = useLang();
  const flagship = caseCards[0]!;
  const arrival = stops[0]!;
  const terminal = stops[stops.length - 1]!;
  const flagshipTo = hrefFor({ page: "case", slug: flagship.slug }, lang);
  return (
    <>
      <StopSection stop={arrival} labelledBy="arrival-h">
        <div className="sc">
          <header className="sc-top">
            <span className="sc-num" aria-hidden="true">01</span>
            <p className="sc-kicker">{profile.name}</p>
          </header>
          <h1 className="sc-title" id="arrival-h">{t.heroTitle}</h1>
          <p className="sc-sum">{t.heroLead}</p>
          <p className="sc-actions">
            <Link className="btn btn-big" to={flagshipTo}>{t.heroCta} →</Link>
            <Link className="btn btn-secondary btn-big" to={`${flagshipTo}#demo`}>{t.navDemo}</Link>
          </p>
          {/* The page flow keeps the three steps and the hint; the sign has no room for them. */}
          <ol className="hero-steps flow-only" aria-label={t.heroStepsLabel}>
            {t.heroSteps.map((step) => <li key={step}>{step}</li>)}
          </ol>
          <p className="scroll-hint flow-only" aria-hidden="true">{t.scrollHint}</p>
        </div>
      </StopSection>

      {stops.filter((s) => s.slug).map((stop) => <ProjectStop key={stop.id} stop={stop} />)}

      <StopSection stop={terminal} labelledBy="terminal-h">
        <div className="sc">
          <h2 id="terminal-h" className="sr">{districts[terminal.district]!.name[lang]}</h2>
          <CardTop stop={terminal} />
          <h2 className="sc-title" id="about-h">{t.aboutTitle}</h2>
          <p className="sc-sum">{profile.summary[lang]}</p>
          <h3 className="sr" id="contact-h">{t.contactTitle}</h3>
          <ul className="sc-links">
            <li><a href={`tel:${profile.phone.split(" ").join("")}`}>{profile.phone}</a></li>
            <li><a href={`mailto:${profile.email}`}>{profile.email}</a></li>
            <li><a href={profile.linkedin} rel="noopener noreferrer">LinkedIn</a></li>
            <li><a href={profile.github} rel="noopener noreferrer">GitHub</a></li>
            <li><Link to={hrefFor({ page: "experience" }, lang)}>{t.navExperience}</Link></li>
          </ul>
          <p className="sc-actions">
            <a className="btn btn-big" href={profile.whatsapp} rel="noopener noreferrer">{t.contactWhatsapp}</a>
          </p>
        </div>
      </StopSection>
      <GhostNumber n="01" />
    </>
  );
}

import { Card, Command, GhostNumber, Headline, Lead, LinkTrio, Plate, StatusSeal } from "colagem-ui";
import { caseCards } from "../content/caseIndex";
import { ev, modeLabel, permalink } from "../content/evidence";
import { pinnedLink } from "../content/flows";
import { profile } from "../content/profile";
import { Link, hrefFor } from "../site/router";
import { useLang } from "../site/Shell";

const PROOF = ["p00-trials", "p05-demo-live", "p05-dual-control"];

export function Home() {
  const { lang, t } = useLang();
  const flagship = caseCards[0]!;
  return (
    <>
      <Plate text="AI Engineer" label={profile.name} />
      <Headline>{t.heroTitle}</Headline>
      <Lead>{t.heroLead}</Lead>
      <p className="cta">
        <Link className="btn" to={hrefFor({ page: "case", slug: flagship.slug }, lang)}>{t.heroCta}</Link>
        <Link className="btn btn-secondary" to={`${hrefFor({ page: "case", slug: flagship.slug }, lang)}#demo`}>{t.navDemo}</Link>
      </p>
      <ol className="hero-steps" aria-label={t.heroStepsLabel}>
        {t.heroSteps.map((step) => <li key={step}>{step}</li>)}
      </ol>

      <section aria-labelledby="proof-h">
        <h2 id="proof-h" className="section-h">{t.proofTitle}</h2>
        <ul className="proof">
          {PROOF.map((id) => {
            const e = ev(id);
            return (
              <li key={id} className="proof-item">
                <p className="proof-value">{e.value}</p>
                <p className="proof-label">{e.label[lang]}</p>
                <p className="proof-meta">
                  <StatusSeal kind={e.mode === "live" ? "partial" : "full"} label={modeLabel(e.mode, lang)} /> <a href={permalink(e)} rel="noopener noreferrer">{t.commit} {e.commit.slice(0, 7)}</a>
                </p>
                {e.caveat && <p className="proof-caveat">{e.caveat[lang]}</p>}
              </li>
            );
          })}
        </ul>
        <p className="surface-text"><Link to={hrefFor({ page: "evidence" }, lang)}>{t.navEvidence}</Link></p>
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
        <LinkTrio
          label={t.caseLinksLabel}
          links={[
            { label: t.linkDemo, href: `${hrefFor({ page: "case", slug: flagship.slug }, lang)}#demo` },
            { label: t.linkCode, href: `https://github.com/DiegoVSouza/${flagship.repo}` },
            { label: t.linkDocs, href: pinnedLink(flagship.repoKey, "docs/architecture.md") },
          ]}
        />
      </section>

      <section aria-labelledby="projects-h">
        <h2 id="projects-h" className="section-h">{t.projectsTitle}</h2>
        <ul className="grid">
          {caseCards.slice(1).map((c, i) => (
            <li key={c.slug} data-scene-case={c.slug} id={`project-${c.slug}`}>
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
        <p className="cta"><a className="btn" href={profile.whatsapp} rel="noopener noreferrer">{t.contactWhatsapp}</a></p>
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

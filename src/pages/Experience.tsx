import { Headline, Lead, Timeline } from "colagem-ui";
import { profile } from "../content/profile";
import { useLang } from "../site/Shell";

const monthName = (iso: string, lang: "en" | "pt") =>
  new Date(`${iso}-01T00:00:00Z`).toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US", { month: "short", year: "numeric", timeZone: "UTC" });

export function ExperiencePage() {
  const { lang, t } = useLang();
  return (
    <>
      <Headline>{t.experienceTitle}</Headline>
      <Lead>{t.experienceLead}</Lead>
      <p className="sub">{t.draftNote}</p>
      <h2 className="section-h">{t.careerTitle}</h2>
      <Timeline
        items={profile.career.map((j) => ({
          id: j.id,
          when: `${monthName(j.from, lang)} to ${monthName(j.to, lang)} · ${j.place}`,
          title: `${j.role}, ${j.org}`,
          body: (
            <>
              <ul className="plain">{j.points.map((p) => <li key={p.en}>{p[lang]}</li>)}</ul>
              <p className="sub">{t.stack}: {j.stack}</p>
            </>
          ),
        }))}
      />
      <h2 className="section-h">{t.education}</h2>
      <ul className="plain">{profile.education.map((e) => <li key={e.id}>{e.title[lang]}, {e.org}. <span className="sub">{e.note[lang]}</span></li>)}</ul>
      <h2 className="section-h">{t.publications}</h2>
      <ul className="plain">
        {profile.publications.map((p) => (
          <li key={p.id}>{p.href ? <a href={p.href} rel="noopener noreferrer">{p.title}</a> : p.title} <span className="sub">{p.venue}</span></li>
        ))}
      </ul>
      <h2 className="section-h">{t.certifications}</h2>
      <ul className="plain">{profile.certifications.map((c) => <li key={c}>{c}</li>)}</ul>
      <h2 className="section-h">{t.languages}</h2>
      <ul className="plain">{profile.languages.map((l) => <li key={l.id}>{l.name[lang]}: {l.level[lang]}</li>)}</ul>
      <h2 className="section-h">{t.skills}</h2>
      <dl className="rules">{profile.skills.map((s) => <div key={s.group.en}><dt>{s.group[lang]}</dt><dd>{s.items}</dd></div>)}</dl>
      <p><a href="/resume.md">{t.resume}</a></p>
    </>
  );
}


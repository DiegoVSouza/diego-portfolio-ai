import { useMemo, useState } from "react";
import { Command, DataTable, Headline, Lead, MetricTable, SelectField, StatusSeal } from "colagem-ui";
import { caseCards } from "../content/caseIndex";
import { evidence, modeLabel, permalink } from "../content/evidence";
import { countStates, projects, type State } from "../data/projects";
import { useLang } from "../site/Shell";

const STATES: State[] = ["verified", "claimed", "partial", "open"];
const GLYPH = { verified: "full", claimed: "warn", partial: "partial", open: "none" } as const;

export function EvidencePage() {
  const { lang, t } = useLang();
  const [mode, setMode] = useState("all");
  const [project, setProject] = useState("all");
  const rows = useMemo(() => evidence.filter((e) => (mode === "all" || e.mode === mode) && (project === "all" || e.project === project)), [mode, project]);
  const stateWord: Record<State, string> = lang === "pt" ? { verified: "verificado", claimed: "declarado", partial: "parcial", open: "aberto" } : { verified: "verified", claimed: "claimed", partial: "partial", open: "open" };
  return (
    <>
      <Headline>{t.evidenceTitle}</Headline>
      <Lead>{t.evidenceLead}</Lead>
      <Command verb="evidence list" object="" n={evidence.length} />
      <div className="filters">
        <SelectField label={t.evidenceFilterMode} value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="all">{t.all}</option>
          {["fake", "replay", "live", "service"].map((m) => <option key={m} value={m}>{modeLabel(m as "fake", lang)}</option>)}
        </SelectField>
        <SelectField label={t.evidenceFilterProject} value={project} onChange={(e) => setProject(e.target.value)}>
          <option value="all">{t.all}</option>
          {caseCards.map((c) => <option key={c.slug} value={c.slug}>{c.name[lang]}</option>)}
        </SelectField>
      </div>
      <MetricTable
        caption={t.evidenceTitle}
        labels={{ metric: t.metric, value: t.value, mode: t.mode, source: t.source }}
        rows={rows.map((e) => ({
          id: e.id,
          label: e.label[lang],
          value: e.value,
          mode: modeLabel(e.mode, lang),
          caveat: e.caveat?.[lang],
          source: (
            <>
              <a href={permalink(e)} rel="noopener noreferrer"><code>{e.path}</code></a>
              <span className="sub">{t.commit} {e.commit.slice(0, 7)} · {e.recordedAt} · {t.command}: <code>{e.command}</code> · {t.exit} {e.exitCode}</span>
            </>
          ),
        }))}
      />
      <h2 className="section-h">{t.featuresTitle}</h2>
      <p className="surface-text">{t.featuresLead}</p>
      <DataTable
        caption={t.featuresTitle}
        rowKey={(p) => p.id}
        rows={projects}
        columns={[
          { key: "p", label: t.projectsTitle, render: (p) => `${p.id.toUpperCase()} ${p.name}` },
          ...STATES.map((s) => ({
            key: s,
            label: stateWord[s],
            numeric: true,
            render: (p: (typeof projects)[number]) => <StatusSeal kind={GLYPH[s]} label={`${countStates(p.features)[s]} ${stateWord[s]}`} />,
          })),
        ]}
      />
    </>
  );
}


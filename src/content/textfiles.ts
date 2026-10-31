import { caseCards } from "./caseIndex";
import { evidence, permalink, resolve } from "./evidence";
import { OWNER, REPO_NAMES } from "./flows";
import { profile } from "./profile";

/** Plain text for machine readers. Every number comes from an evidence record or from profile.ts, labelled as career history. */
export function llmsTxt(site: string): string {
  const lines = [
    `# ${profile.name}, ${profile.title}`,
    "",
    `> ${profile.headline.en} Remote, from ${profile.location}. Every project number on this site links to the saved run that produced it.`,
    "",
    "## Pages",
    `- [Home](${site}/)`,
    `- [Live demo](${site}/demo/)`,
    `- [Evidence](${site}/evidence/)`,
    `- [Method](${site}/method/)`,
    `- [Experience](${site}/experience/)`,
    "",
    "## Projects",
    ...caseCards.map((c) => `- [${c.name.en}](${site}/projects/${c.slug}/): ${resolve(c.outcome.en)} Code: ${OWNER}/${REPO_NAMES[c.repoKey]}`),
    "",
    "## Evidence",
    ...evidence.map((e) => `- ${e.label.en}: ${e.value} (${e.mode}, commit ${e.commit.slice(0, 7)}) ${permalink(e)}`),
    "",
    "## Contact",
    `- Email: ${profile.email}`,
    `- LinkedIn: ${profile.linkedin}`,
    `- GitHub: ${profile.github}`,
    "",
  ];
  return lines.join("\n");
}

export function resumeMd(): string {
  const out = [
    `# ${profile.name}`,
    "",
    `**${profile.title}** · ${profile.location}`,
    "",
    `[${profile.email}](mailto:${profile.email}) · [LinkedIn](${profile.linkedin}) · [GitHub](${profile.github})`,
    "",
    "_English draft, pending the owner's review. Career history, not measured results._",
    "",
    "## Summary",
    "",
    profile.summary.en,
    "",
    "## Experience",
    "",
  ];
  for (const j of profile.career) {
    out.push(`### ${j.role}, ${j.org} (${j.from} to ${j.to}, ${j.place})`, "", ...j.points.map((p) => `- ${p.en}`), "", `Stack: ${j.stack}`, "");
  }
  out.push("## Education", "", ...profile.education.map((e) => `- ${e.title.en}, ${e.org} (${e.note.en})`), "");
  out.push("## Publications", "", ...profile.publications.map((p) => `- ${p.title}, ${p.venue}${p.href ? ` (${p.href})` : ""}`), "");
  out.push("## Certifications", "", ...profile.certifications.map((c) => `- ${c}`), "");
  out.push("## Languages", "", ...profile.languages.map((l) => `- ${l.name.en}: ${l.level.en}`), "");
  return out.join("\n");
}

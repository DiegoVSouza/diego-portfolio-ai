import { Headline, Lead } from "colagem-ui";
import { caseCards } from "../content/caseIndex";
import { OWNER, REPO_NAMES } from "../content/flows";
import { Link, hrefFor } from "../site/router";
import { useLang } from "../site/Shell";

export function DesignSystemPage() {
  const { lang, t } = useLang();
  return (
    <>
      <Headline>{t.dsTitle}</Headline>
      <Lead>{t.dsLead}</Lead>
      <p>
        <a className="btn" href={`${OWNER}/${REPO_NAMES.p08}`} rel="noopener noreferrer">colagem-ui</a>
      </p>
      <p className="surface-text">{t.sceneNote}</p>
      <p><Link to={hrefFor({ page: "case", slug: "design-system" }, lang)}>{caseCards.find((c) => c.slug === "design-system")!.name[lang]}</Link></p>
    </>
  );
}

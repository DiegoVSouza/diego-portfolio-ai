import { FlowDiagram, Headline, Lead } from "colagem-ui";
import { OWNER, REPO_NAMES, flowLabels, getFlow, getLayout, pinnedLink } from "../content/flows";
import { useLang } from "../site/Shell";

export function MethodPage() {
  const { lang, t } = useLang();
  return (
    <>
      <Headline>{t.methodTitle}</Headline>
      <Lead>{t.methodLead}</Lead>
      <FlowDiagram
        flow={getFlow("harness")}
        layout={getLayout("harness")}
        lang={lang}
        labels={flowLabels(lang)}
        links={{ code: (path, node) => pinnedLink(node.repo ?? "lab", path), docs: (path, node) => pinnedLink(node.repo ?? "lab", path) }}
      />
      <dl className="rules">
        {t.methodRules.map(([title, body]) => (
          <div key={title}><dt>{title}</dt><dd>{body}</dd></div>
        ))}
      </dl>
      <h2 className="section-h">{t.methodAi}</h2>
      <p className="surface-text">{t.methodAiBody}</p>
      <p><a href={`${OWNER}/${REPO_NAMES.lab}`} rel="noopener noreferrer">{REPO_NAMES.lab}</a></p>
    </>
  );
}


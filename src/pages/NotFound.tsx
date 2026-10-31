import { Headline } from "colagem-ui";
import { Link, hrefFor } from "../site/router";
import { useLang } from "../site/Shell";

export function NotFound() {
  const { lang, t } = useLang();
  return (
    <>
      <Headline>{t.notFound}</Headline>
      <p><Link to={hrefFor({ page: "home" }, lang)}>{t.backHome}</Link></p>
    </>
  );
}


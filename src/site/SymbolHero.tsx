import type { ReactElement } from "react";

/**
 * The flat drawing of each project's symbol, the same object the 3D scene builds (src/scene/symbols.ts): a vault door for SupportOps,
 * stacked blocks, a lattice tower, a toolbox, a radar dish, an elevated train, a cut-out plate and a crane.
 * It is decorative (aria-hidden) and paints only with the colagem-ui tokens through CSS classes: `ink` for the body, `red` for the accent.
 */
const ink = "sym-ink";
const red = "sym-red";
const line = "sym-line";

const DRAWINGS: Record<string, ReactElement> = {
  supportops: (
    <>
      <rect className={ink} x="14" y="14" width="92" height="92" />
      <circle className={red} cx="60" cy="60" r="30" />
      <rect className={ink} x="46" y="48" width="9" height="24" />
      <rect className={ink} x="65" y="48" width="9" height="24" />
      <rect className={ink} x="40" y="58" width="40" height="5" />
    </>
  ),
  foundation: (
    <>
      <rect className={ink} x="10" y="86" width="100" height="22" />
      <rect className={ink} x="20" y="62" width="82" height="22" />
      <rect className={ink} x="30" y="38" width="64" height="22" />
      <rect className={red} x="40" y="14" width="46" height="22" />
    </>
  ),
  agents: (
    <>
      <path className={ink} d="M38 108 L48 22 L72 22 L82 108 Z" />
      <path className={line} d="M42 86 L78 60 M78 86 L42 60 M46 56 L74 34 M74 56 L46 34" />
      <rect className={red} x="56" y="6" width="8" height="18" />
    </>
  ),
  toolkit: (
    <>
      <rect className={ink} x="10" y="52" width="100" height="52" />
      <rect className={red} x="6" y="42" width="108" height="12" />
      <path className={line} d="M40 42 C40 16 80 16 80 42" />
    </>
  ),
  observability: (
    <>
      <rect className={ink} x="55" y="60" width="10" height="48" />
      <path className={red} d="M14 62 C14 24 50 12 76 20 C70 50 48 66 14 62 Z" />
      <rect className={ink} x="78" y="12" width="5" height="26" />
    </>
  ),
  async: (
    <>
      <rect className={ink} x="6" y="40" width="34" height="26" />
      <rect className={ink} x="43" y="40" width="34" height="26" />
      <rect className={red} x="80" y="40" width="34" height="26" />
      <rect className={ink} x="4" y="74" width="112" height="8" />
      <rect className={ink} x="22" y="84" width="10" height="26" />
      <rect className={ink} x="88" y="84" width="10" height="26" />
    </>
  ),
  "design-system": (
    <>
      <rect className={ink} x="10" y="22" width="100" height="76" />
      <rect className={red} x="24" y="40" width="12" height="40" />
      <rect className={red} x="46" y="48" width="12" height="32" />
      <rect className={red} x="68" y="40" width="12" height="40" />
      <rect className={red} x="90" y="48" width="12" height="32" />
    </>
  ),
  harness: (
    <>
      <rect className={ink} x="28" y="30" width="10" height="80" />
      <rect className={ink} x="10" y="22" width="100" height="9" />
      <rect className={red} x="12" y="31" width="22" height="18" />
      <path className={line} d="M96 31 L96 70" />
      <rect className={red} x="90" y="70" width="12" height="9" />
    </>
  ),
};

export function SymbolHero({ slug }: { slug: string }) {
  const drawing = DRAWINGS[slug];
  if (!drawing) return null;
  return (
    <div className="case-symbol" aria-hidden="true" data-symbol={slug}>
      <svg viewBox="0 0 120 120" focusable="false">{drawing}</svg>
    </div>
  );
}

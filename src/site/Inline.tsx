/**
 * Case text marks code with backticks, like the READMEs it summarises. The page shows those spans as code, never as literal backticks.
 * `plain` is for components that only take a string.
 */
export function Inline({ text }: { text: string }) {
  const parts = text.split("`");
  return <>{parts.map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : part))}</>;
}

export const plain = (text: string): string => text.split("`").join("");

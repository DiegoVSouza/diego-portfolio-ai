import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { caseCards } from "../content/caseIndex";
import { profile } from "../content/profile";
import { hrefFor, useRoute } from "./router";
import { useLang } from "./Shell";

interface Item {
  id: string;
  label: string;
  /** Internal path, or an absolute URL that leaves the site. */
  href: string;
}

/**
 * Command palette: "/" or Ctrl+K. Every entry is a real destination that already exists as a page or link,
 * so it is a shortcut and never the only way to get anywhere. A button in the footer opens it for the mouse.
 */
export function Palette() {
  const { lang, t } = useLang();
  const { go } = useRoute();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const listId = useId();
  // Set after hydration, once the key listener exists. Tests and scripts wait for it.
  const [ready, setReady] = useState(false);

  const items = useMemo<Item[]>(
    () => [
      { id: "home", label: t.navHome, href: hrefFor({ page: "home" }, lang) },
      { id: "demo", label: t.navDemo, href: `${hrefFor({ page: "case", slug: "supportops" }, lang)}#demo` },
      { id: "evidence", label: t.navEvidence, href: hrefFor({ page: "evidence" }, lang) },
      { id: "method", label: t.navMethod, href: hrefFor({ page: "method" }, lang) },
      { id: "experience", label: t.navExperience, href: hrefFor({ page: "experience" }, lang) },
      { id: "design", label: t.navDesign, href: hrefFor({ page: "design-system" }, lang) },
      ...caseCards.map((c) => ({ id: c.slug, label: c.name[lang], href: hrefFor({ page: "case", slug: c.slug }, lang) })),
      { id: "whatsapp", label: t.contactWhatsapp, href: profile.whatsapp },
      { id: "resume", label: t.resume, href: "/resume.md" },
    ],
    [lang, t],
  );
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? items.filter((i) => i.label.toLowerCase().includes(needle)) : items;
  }, [items, query]);
  const active = Math.min(index, Math.max(0, shown.length - 1));

  const open = useCallback(() => {
    setQuery("");
    setIndex(0);
    if (dialog.current && !dialog.current.open && typeof dialog.current.showModal === "function") dialog.current.showModal();
    input.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = Boolean(target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable));
      if ((event.key === "/" && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k")) {
        event.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey);
    setReady(true);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const run = (item: Item | undefined) => {
    if (!item) return;
    dialog.current?.close();
    if (/^https?:\/\//.test(item.href) || item.href.endsWith(".md")) window.location.assign(item.href);
    else go(item.href);
  };

  const onInputKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIndex(Math.min(shown.length - 1, active + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIndex(Math.max(0, active - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      run(shown[active]);
    }
  };

  return (
    <>
      <button type="button" className="tg palette-open" onClick={open} aria-keyshortcuts="Control+K /" data-ready={ready ? "true" : undefined}>
        {t.paletteOpen}
      </button>
      <dialog ref={dialog} className="palette" aria-label={t.paletteTitle}>
        <p className="cmd">
          <span aria-hidden="true">$ </span>
          <input
            ref={input}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIndex(0);
            }}
            onKeyDown={onInputKey}
            autoComplete="off"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={shown[active] ? `${listId}-${shown[active]!.id}` : undefined}
            aria-label={t.paletteHint}
            placeholder={t.paletteHint}
          />
        </p>
        <ul id={listId} role="listbox" aria-label={t.paletteTitle}>
          {shown.map((item, i) => (
            <li key={item.id} id={`${listId}-${item.id}`} role="option" aria-selected={i === active} onClick={() => run(item)}>
              {item.label}
            </li>
          ))}
          {shown.length === 0 && <li role="presentation" className="palette-empty">{t.paletteEmpty}</li>}
        </ul>
      </dialog>
    </>
  );
}

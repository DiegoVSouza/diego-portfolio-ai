import { useCallback, useEffect, useRef, useState } from "react";
import type { BackgroundMode } from "colagem-ui";
import { useLang } from "../site/Shell";
import { useSimple } from "../site/simple";
import { onPulse } from "./pulse";
import motoUrl from "../../assets/game/models/moto.glb?url";
import truckUrl from "../../assets/game/models/truck.glb?url";
import type { Quality, SceneController } from "./scene";

/** Loads after first paint, on idle. If anything fails the level 1 background stays and the page never notices. */
function onIdle(run: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(run, { timeout: 2500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(run, 600);
  return () => window.clearTimeout(id);
}

/** Portrait screens keep the level 1 background: the city needs width, and phones should not pay for it. */
const portrait = (): boolean => typeof matchMedia === "function" && matchMedia("(max-aspect-ratio: 1/1)").matches;

const HALFTONE_KEY = "scene-halftone";
const readHalftone = (): boolean => {
  try {
    return window.localStorage.getItem(HALFTONE_KEY) !== "off";
  } catch {
    return true;
  }
};

const saveData = (): boolean => {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(connection?.saveData);
};

export function SceneHost({ mode, slugs, labels, focusSlug, pulseKey }: { mode: BackgroundMode; slugs: string[]; labels: string[]; focusSlug?: string; pulseKey?: number }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const controller = useRef<SceneController | null>(null);
  const { t } = useLang();
  const simple = useSimple();
  const [running, setRunning] = useState(false);
  // The server renders no canvas, so the client adds it only after hydration. Nothing can mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [announcement, setAnnouncement] = useState("");
  // The scene is not re-created when the language changes, so the callback reads the latest text through a ref.
  const announce = useRef<(index: number) => void>(() => undefined);
  announce.current = (index: number) => {
    if (focusSlug !== undefined) return;
    setAnnouncement(t.sceneAnnounce.replace("{n}", String(index + 1)).replace("{total}", String(slugs.length)).replace("{name}", labels[index] ?? ""));
  };
  const [quality, setQuality] = useState<Quality>("auto");
  const [motion, setMotion] = useState(true);
  const [halftone, setHalftone] = useState(true);
  useEffect(() => setHalftone(readHalftone()), []);
  const slugKey = slugs.join(",");
  const focus = focusSlug === undefined ? undefined : slugs.indexOf(focusSlug);

  useEffect(() => {
    if (!mounted || simple || mode === "2d" || saveData() || portrait() || !canvas.current) return undefined;
    const element = canvas.current;
    let cancelled = false;
    const cancelIdle = onIdle(() => {
      import("./scene")
        .then(async ({ start }) => {
          if (cancelled) return;
          try {
            const started = await start(element, {
              slugs: slugKey.split(","),
              mode,
              models: { truck: truckUrl, moto: motoUrl },
              halftone: readHalftone(),
              focus: focus === undefined || focus < 0 ? undefined : focus,
              onActive: (index) => {
                element.dataset.active = String(index);
                announce.current(index);
              },
              onQuality: (scale) => {
                element.dataset.quality = String(scale);
              },
              onFail: () => {
                controller.current = null;
                setRunning(false);
                document.documentElement.dataset.bg = "2d";
              },
            });
            if (cancelled) {
              started.dispose();
              return;
            }
            controller.current = started;
            element.dataset.scene = mode;
            setRunning(true);
          } catch {
            document.documentElement.dataset.bg = "2d";
          }
        })
        .catch(() => {
          document.documentElement.dataset.bg = "2d";
        });
    });
    return () => {
      cancelled = true;
      cancelIdle();
      controller.current?.dispose();
      controller.current = null;
      setRunning(false);
    };
  }, [mounted, simple, mode, slugKey, focus]);

  useEffect(() => {
    if (pulseKey) controller.current?.pulse();
  }, [pulseKey]);
  useEffect(() => onPulse(() => controller.current?.pulse()), []);

  const cycle = () => {
    const next: Quality = quality === "auto" ? "high" : quality === "high" ? "low" : "auto";
    setQuality(next);
    controller.current?.setQuality(next);
  };
  const toggleHalftone = useCallback(() => {
    setHalftone((on) => {
      const next = !on;
      controller.current?.setHalftone(next);
      try {
        window.localStorage.setItem(HALFTONE_KEY, next ? "on" : "off");
      } catch {
        // storage can be blocked; the choice then lasts for this visit only
      }
      return next;
    });
  }, []);
  // The "h" key flips the half-tone, as in the original scene. It never fires while typing.
  useEffect(() => {
    if (!running) return undefined;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key.toLowerCase() !== "h" || event.ctrlKey || event.metaKey || event.altKey) return;
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return;
      toggleHalftone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, toggleHalftone]);
  const toggleMotion = () => {
    setMotion(!motion);
    controller.current?.setMotion(!motion);
  };

  if (!mounted || simple || mode === "2d" || portrait()) return null;
  return (
    <>
      <canvas ref={canvas} className={running ? "scene on" : "scene"} aria-hidden="true" />
      {running && (
        <aside className="scene-controls" aria-label={t.sceneLabel}>
          <span className="sr" role="status" aria-live="polite">{announcement}</span>
          <button type="button" className="tg" onClick={cycle}>
            {t.sceneQuality}: {quality === "auto" ? t.sceneQualityAuto : quality === "high" ? t.sceneQualityHigh : t.sceneQualityLow}
          </button>
          <button type="button" className="tg" aria-pressed={halftone} aria-keyshortcuts="h" onClick={toggleHalftone}>
            {t.sceneHalftone}
          </button>
          {mode === "3d" && focus === undefined && (
            <button type="button" className="tg" aria-pressed={motion} onClick={toggleMotion}>
              {t.sceneMotion}
            </button>
          )}
        </aside>
      )}
    </>
  );
}

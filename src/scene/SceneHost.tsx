import { useEffect, useRef, useState } from "react";
import type { BackgroundMode } from "colagem-ui";
import { useLang } from "../site/Shell";
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

const saveData = (): boolean => {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(connection?.saveData);
};

export function SceneHost({ mode, slugs, pulseKey }: { mode: BackgroundMode; slugs: string[]; pulseKey?: number }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const controller = useRef<SceneController | null>(null);
  const { t } = useLang();
  const [running, setRunning] = useState(false);
  // The server renders no canvas, so the client adds it only after hydration. Nothing can mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [quality, setQuality] = useState<Quality>("auto");
  const [motion, setMotion] = useState(true);
  const slugKey = slugs.join(",");

  useEffect(() => {
    if (!mounted || mode === "2d" || saveData() || !canvas.current) return undefined;
    const element = canvas.current;
    let cancelled = false;
    const cancelIdle = onIdle(() => {
      import("./scene")
        .then(({ start }) => {
          if (cancelled) return;
          try {
            controller.current = start(element, {
              slugs: slugKey.split(","),
              mode,
              onActive: (index) => {
                element.dataset.active = String(index);
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
  }, [mounted, mode, slugKey]);

  useEffect(() => {
    if (pulseKey) controller.current?.pulse();
  }, [pulseKey]);

  const cycle = () => {
    const next: Quality = quality === "auto" ? "high" : quality === "high" ? "low" : "auto";
    setQuality(next);
    controller.current?.setQuality(next);
  };
  const toggleMotion = () => {
    setMotion(!motion);
    controller.current?.setMotion(!motion);
  };

  if (!mounted || mode === "2d") return null;
  return (
    <>
      <canvas ref={canvas} className={running ? "scene on" : "scene"} aria-hidden="true" />
      {running && (
        <aside className="scene-controls" aria-label={t.sceneLabel}>
          <button type="button" className="tg" onClick={cycle}>
            {t.sceneQuality}: {quality === "auto" ? t.sceneQualityAuto : quality === "high" ? t.sceneQualityHigh : t.sceneQualityLow}
          </button>
          {mode === "3d" && (
            <button type="button" className="tg" aria-pressed={motion} onClick={toggleMotion}>
              {t.sceneMotion}
            </button>
          )}
        </aside>
      )}
    </>
  );
}

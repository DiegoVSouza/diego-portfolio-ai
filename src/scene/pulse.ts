/** A tiny channel from the page to the scene. Each call is one finite event, and callers send it only for real run steps. */
type Listener = () => void;
const listeners = new Set<Listener>();

export function emitPulse(): void {
  for (const listener of listeners) listener();
}

export function onPulse(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

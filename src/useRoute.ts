import { useEffect, useState } from "react";

export function parseHash(hash: string): string | null {
  const match = /^#\/([a-z0-9-]+)$/.exec(hash);
  return match ? (match[1] ?? null) : null;
}

export function useRoute(): string | null {
  const [id, setId] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setId(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return id;
}

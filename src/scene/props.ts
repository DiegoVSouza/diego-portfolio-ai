/** Models a hand-placed prop may use: every GLB of assets/game/models, by file name (phase 017). */
const urls = import.meta.glob("../../assets/game/models/*.glb", { query: "?url", import: "default", eager: true }) as Record<string, string>;

export const propUrl = (name: string): string | undefined => Object.entries(urls).find(([path]) => path.endsWith(`/${name}`))?.[1];
export const propNames = (): string[] => Object.keys(urls).map((path) => path.split("/").pop()!).sort();

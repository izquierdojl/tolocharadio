import type { UserDefaultView } from "./types.js";

export const DEFAULT_VIEW_OPTIONS: Array<{ value: UserDefaultView; label: string; path: string }> = [
  { value: "explorar", label: "Explorar", path: "/explorar" },
  { value: "favoritos", label: "Favoritos", path: "/favoritos" },
  { value: "historial", label: "Historial", path: "/historial" },
];

export function defaultViewPath(view: UserDefaultView | string | null | undefined): string {
  const found = DEFAULT_VIEW_OPTIONS.find((o) => o.value === view);
  return found ? found.path : "/explorar";
}

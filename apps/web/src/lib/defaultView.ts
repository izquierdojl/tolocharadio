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

/// Ruta de entrada tras iniciar sesión o abrir la raíz, según la sección inicial.
export function defaultEntryPath(
  user: { defaultSection?: string | null; defaultView?: string | null } | null | undefined,
): string {
  if (user?.defaultSection === "podcasts") return "/podcasts";
  return defaultViewPath(user?.defaultView);
}

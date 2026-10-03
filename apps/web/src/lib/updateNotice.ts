// Fusión del aviso de actualización en un único aviso en español.
// Fuentes: release de GitHub (`useVersionCheck`) y Service Worker en espera.
// El SW tiene prioridad: recargar aplica la versión ya descargada.
export type UpdateSource = "sw" | "github";

export interface UpdateNoticeInput {
  githubHasUpdate: boolean;
  swWaiting: boolean;
}

export interface UpdateNotice {
  show: boolean;
  source: UpdateSource | null;
}

export function resolveUpdateNotice(input: UpdateNoticeInput): UpdateNotice {
  if (input.swWaiting) {
    return { show: true, source: "sw" };
  }
  if (input.githubHasUpdate) {
    return { show: true, source: "github" };
  }
  return { show: false, source: null };
}

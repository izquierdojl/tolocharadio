import { useCallback, useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";

type UpdateSW = (reloadPage?: boolean) => Promise<void>;

let updateSW: UpdateSW | null = null;
let registered = false;

function ensureRegistered(onWaiting: () => void): void {
  if (registered) return;
  registered = true;
  // En desarrollo el plugin no genera SW: no hay nada que registrar.
  if (!import.meta.env.PROD) return;
  if (!("serviceWorker" in navigator)) return;
  updateSW = registerSW({
    onNeedRefresh() {
      onWaiting();
    },
  });
}

export function usePwaUpdate(): { swWaiting: boolean; applySwUpdate: () => void } {
  const [swWaiting, setSwWaiting] = useState(false);

  useEffect(() => {
    ensureRegistered(() => setSwWaiting(true));
  }, []);

  const applySwUpdate = useCallback(() => {
    if (updateSW) {
      void updateSW(true);
    } else {
      window.location.reload();
    }
  }, []);

  return { swWaiting, applySwUpdate };
}

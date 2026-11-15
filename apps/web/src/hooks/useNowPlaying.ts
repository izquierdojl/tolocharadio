import { useEffect } from "react";
import { fetchNowPlaying } from "../lib/api.js";
import {
  NowPlayingPoller,
  syncMediaSession,
  type MediaMetadataFactory,
  type MediaSessionLike,
} from "../lib/nowPlaying.js";
import { usePlayerStore } from "../stores/player.js";

function isPageVisible(): boolean {
  return document.visibilityState === "visible";
}

function mediaSessionApi(): { session?: MediaSessionLike; create?: MediaMetadataFactory } {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return {};
  if (typeof MediaMetadata === "undefined") return {};
  return {
    session: navigator.mediaSession as unknown as MediaSessionLike,
    create: (init) => new MediaMetadata(init),
  };
}

/**
 * Mantiene al día el título "Ahora suena" de la emisora en reproducción
 * (solo mientras suena y la pestaña está visible) y lo publica en la
 * Media Session del sistema.
 */
export function useNowPlaying(): void {
  const stationId = usePlayerStore((s) => s.station?.id ?? null);
  const stationName = usePlayerStore((s) => s.station?.name ?? null);
  const favicon = usePlayerStore((s) => s.station?.favicon ?? null);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const title = usePlayerStore((s) => s.nowPlaying);

  useEffect(() => {
    const poller = new NowPlayingPoller({
      fetchTitle: async (id) => (await fetchNowPlaying(id)).title,
      onTitle: (id, value) => usePlayerStore.getState().setNowPlaying(id, value),
    });
    const sync = () => {
      const state = usePlayerStore.getState();
      poller.update({
        stationId: state.station?.id ?? null,
        active: state.isPlaying && isPageVisible(),
      });
    };
    const unsubscribe = usePlayerStore.subscribe(sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", sync);
      poller.dispose();
    };
  }, []);

  useEffect(() => {
    const { session, create } = mediaSessionApi();
    syncMediaSession(session, create, {
      station: stationId && stationName ? { name: stationName, favicon } : null,
      title,
      isPlaying,
    });
  }, [stationId, stationName, favicon, title, isPlaying]);
}

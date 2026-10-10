import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { App } from "./App.js";
import "./index.css";
import { initDesktopBridge, publishFavorites } from "./lib/desktop.js";
import type { FavoriteEntry } from "./lib/types.js";
import { useAuthStore } from "./stores/auth.js";
import { getInitialTheme, useThemeStore } from "./stores/theme.js";

document.documentElement.dataset.theme = getInitialTheme();

void initDesktopBridge();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

void useAuthStore.getState().restore();

// Sincroniza con el shell de escritorio el listado de favoritos (solo memoria en el shell).
queryClient.getQueryCache().subscribe((event) => {
  if (event.type !== "updated" || event.query.queryKey[0] !== "favorites") return;
  const { status, data } = event.query.state;
  if (status === "success") {
    publishFavorites((data as { items: FavoriteEntry[] } | undefined)?.items ?? []);
  } else if (status === "error") {
    publishFavorites([]);
  }
});

useAuthStore.subscribe((state, prev) => {
  if (state.user && state.user !== prev.user) {
    useThemeStore.getState().applyFromProfile(state.user.theme);
  }
  if (!state.user && state.user !== prev.user) {
    useThemeStore.getState().applyFromProfile(getInitialTheme());
    publishFavorites([]);
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster position="bottom-right" richColors closeButton />
    </QueryClientProvider>
  </React.StrictMode>,
);
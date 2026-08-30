import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { App } from "./App.js";
import "./index.css";
import { useAuthStore } from "./stores/auth.js";
import { getInitialTheme, useThemeStore } from "./stores/theme.js";

document.documentElement.dataset.theme = getInitialTheme();

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

useAuthStore.subscribe((state, prev) => {
  if (state.user && state.user !== prev.user) {
    useThemeStore.getState().applyFromProfile(state.user.theme);
  }
  if (!state.user && state.user !== prev.user) {
    useThemeStore.getState().applyFromProfile(getInitialTheme());
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
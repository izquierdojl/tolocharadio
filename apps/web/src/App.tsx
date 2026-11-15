import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { registerDesktopNavigator } from "./lib/desktop.js";
import { fetchPublicConfig } from "./lib/api.js";
import { AppShell } from "./components/AppShell.js";
import { useAuthStore } from "./stores/auth.js";
import { Home } from "./pages/Home.js";
import { Explore } from "./pages/Explore.js";
import { Favorites } from "./pages/Favorites.js";
import { History } from "./pages/History.js";
import { CustomStations } from "./pages/CustomStations.js";
import { Login } from "./pages/Login.js";
import { Register } from "./pages/Register.js";
import { Profile } from "./pages/Profile.js";
import { NotFound } from "./pages/NotFound.js";
import { PodcastHome } from "./pages/podcasts/PodcastHome.js";
import { PodcastSearch } from "./pages/podcasts/PodcastSearch.js";
import { PodcastSubscriptions } from "./pages/podcasts/PodcastSubscriptions.js";
import { PodcastShow } from "./pages/podcasts/PodcastShow.js";
import { PodcastQueue } from "./pages/podcasts/PodcastQueue.js";
import { PodcastFavorites } from "./pages/podcasts/PodcastFavorites.js";
import { PodcastStats } from "./pages/podcasts/PodcastStats.js";

const Stats = lazy(() => import("./pages/Stats.js").then((m) => ({ default: m.Stats })));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  if (status === "loading") {
    return <div className="flex h-64 items-center justify-center text-faint">Cargando sesión…</div>;
  }
  if (status !== "authenticated") {
    return <Navigate to="/" replace />;
  }
  return children;
}

/// Oculta la sección de podcasts cuando el servidor la deshabilita.
function PodcastsGate({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ["config"],
    queryFn: fetchPublicConfig,
    staleTime: Infinity,
  });
  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-faint">Cargando podcasts…</div>;
  }
  if (data?.features && !data.features.podcasts) {
    return <Navigate to="/explorar" replace />;
  }
  return children;
}

/// Conecta la navegación del router con las órdenes de sección del shell de escritorio.
function DesktopNavigator() {
  const navigate = useNavigate();
  useEffect(() => {
    registerDesktopNavigator((path) => navigate(path));
    return () => registerDesktopNavigator(null);
  }, [navigate]);
  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <DesktopNavigator />
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route
            path="/explorar"
            element={
              <RequireAuth>
                <Explore />
              </RequireAuth>
            }
          />
          <Route
            path="/favoritos"
            element={
              <RequireAuth>
                <Favorites />
              </RequireAuth>
            }
          />
          <Route
            path="/historial"
            element={
              <RequireAuth>
                <History />
              </RequireAuth>
            }
          />
          <Route
            path="/mis-emisoras"
            element={
              <RequireAuth>
                <CustomStations />
              </RequireAuth>
            }
          />
          <Route
            path="/estadisticas"
            element={
              <RequireAuth>
                <Suspense
                  fallback={
                    <div className="flex h-64 items-center justify-center text-faint">
                      Cargando estadísticas…
                    </div>
                  }
                >
                  <Stats />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/podcasts"
            element={
              <RequireAuth>
                <PodcastsGate>
                  <PodcastHome />
                </PodcastsGate>
              </RequireAuth>
            }
          />
          <Route
            path="/podcasts/descubrir"
            element={
              <RequireAuth>
                <PodcastsGate>
                  <PodcastSearch />
                </PodcastsGate>
              </RequireAuth>
            }
          />
          <Route
            path="/podcasts/suscripciones"
            element={
              <RequireAuth>
                <PodcastsGate>
                  <PodcastSubscriptions />
                </PodcastsGate>
              </RequireAuth>
            }
          />
          <Route
            path="/podcasts/cola"
            element={
              <RequireAuth>
                <PodcastsGate>
                  <PodcastQueue />
                </PodcastsGate>
              </RequireAuth>
            }
          />
          <Route
            path="/podcasts/favoritos"
            element={
              <RequireAuth>
                <PodcastsGate>
                  <PodcastFavorites />
                </PodcastsGate>
              </RequireAuth>
            }
          />
          <Route
            path="/podcasts/estadisticas"
            element={
              <RequireAuth>
                <PodcastsGate>
                  <PodcastStats />
                </PodcastsGate>
              </RequireAuth>
            }
          />
          <Route
            path="/podcasts/:podcastId"
            element={
              <RequireAuth>
                <PodcastsGate>
                  <PodcastShow />
                </PodcastsGate>
              </RequireAuth>
            }
          />
          <Route path="/radio" element={<Navigate to="/explorar" replace />} />
          <Route path="/radio/explorar" element={<Navigate to="/explorar" replace />} />
          <Route path="/radio/favoritos" element={<Navigate to="/favoritos" replace />} />
          <Route path="/radio/historial" element={<Navigate to="/historial" replace />} />
          <Route path="/radio/estadisticas" element={<Navigate to="/estadisticas" replace />} />
          <Route path="/radio/mis-emisoras" element={<Navigate to="/mis-emisoras" replace />} />
          <Route
            path="/perfil"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

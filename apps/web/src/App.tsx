import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { registerDesktopNavigator } from "./lib/desktop.js";
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
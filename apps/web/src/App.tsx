import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell.js";
import { useAuthStore } from "./stores/auth.js";
import { Home } from "./pages/Home.js";
import { Explore } from "./pages/Explore.js";
import { Favorites } from "./pages/Favorites.js";
import { History } from "./pages/History.js";
import { Login } from "./pages/Login.js";
import { Register } from "./pages/Register.js";
import { Profile } from "./pages/Profile.js";
import { NotFound } from "./pages/NotFound.js";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  if (status === "loading") {
    return <div className="flex h-64 items-center justify-center text-pine-500">Cargando sesión…</div>;
  }
  if (status !== "authenticated") {
    return <Navigate to="/" replace />;
  }
  return children;
}

export function App() {
  return (
    <BrowserRouter>
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
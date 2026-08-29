import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Heart, History, Home, LogOut } from "lucide-react";
import { useAuthStore } from "../stores/auth.js";
import { SierraEmblem } from "./SierraEmblem.js";
import { PlayerBar } from "./PlayerBar.js";

const NAV_ITEMS = [
  { to: "/explorar", label: "Explorar", icon: Home, auth: true },
  { to: "/favoritos", label: "Favoritos", icon: Heart, auth: true },
  { to: "/historial", label: "Historial", icon: History, auth: true },
];

function Logo() {
  return (
    <NavLink to="/" className="flex items-center gap-2 text-pine-100">
      <SierraEmblem className="size-9 shrink-0" />
      <span className="text-lg font-semibold tracking-tight">
        Tolocha<span className="text-ochre-400">Radio</span>
      </span>
    </NavLink>
  );
}

function MountainWall() {
  return (
    <svg className="h-24 w-full text-pine-700/40" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0 120 L200 30 L340 90 L520 10 L700 80 L860 25 L1050 95 L1200 45 L1200 120 Z"
        fill="currentColor"
      />
    </svg>
  );
}

function Header() {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const logout = useAuthStore((s) => s.logout);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-30 border-b border-pine-800/80 bg-pine-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            if (item.auth && status !== "authenticated") return null;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? "bg-pine-800 text-pine-100"
                      : "text-pine-300 hover:bg-pine-900 hover:text-pine-100"
                  }`
                }
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        {status === "loading" ? null : user ? (
          <div className="flex items-center gap-2">
            <NavLink
              to="/perfil"
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-pine-200 hover:bg-pine-900"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-pine-700 text-xs font-semibold uppercase text-pine-100">
                {(user.name ?? user.email).slice(0, 2)}
              </span>
              <span className="hidden max-w-32 truncate md:inline">{user.name ?? user.email}</span>
            </NavLink>
            <button
              type="button"
              onClick={() => void logout()}
              title="Cerrar sesión"
              className="flex size-8 items-center justify-center rounded-lg text-pine-300 hover:bg-pine-900 hover:text-pine-100"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        ) : (
          location.pathname !== "/login" && (
            <NavLink to="/login" className="rounded-lg bg-pine-600 px-3 py-1.5 text-sm text-white hover:bg-pine-500">
              Entrar
            </NavLink>
          )
        )}
      </div>
    </header>
  );
}

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col bg-pine-950/40">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-44 pt-6">
        <Outlet />
      </main>
      <MountainWall />
      <PlayerBar />
    </div>
  );
}
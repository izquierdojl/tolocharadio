import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ChevronDown, Heart, History, Home, LogOut, Radio, UserRound } from "lucide-react";
import { useAuthStore } from "../stores/auth.js";
import { SierraEmblem } from "./SierraEmblem.js";
import { PlayerBar } from "./PlayerBar.js";
import { ThemeToggle } from "./ThemeToggle.js";
import { ViewModeToggle } from "./ViewModeToggle.js";

const NAV_ITEMS = [
  { to: "/explorar", label: "Explorar", icon: Home, auth: true },
  { to: "/favoritos", label: "Favoritos", icon: Heart, auth: true },
  { to: "/historial", label: "Historial", icon: History, auth: true },
  { to: "/mis-emisoras", label: "Mis emisoras", icon: Radio, auth: true },
];

function Logo() {
  return (
    <NavLink to="/" className="flex items-center gap-2 text-foreground">
      <SierraEmblem className="size-9 shrink-0" />
      <span className="text-lg font-semibold tracking-tight">
        Tolocha<span className="text-brand">Radio</span>
      </span>
    </NavLink>
  );
}

function MountainWall() {
  return (
    <svg className="h-24 w-full text-mountain" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0 120 L200 30 L340 90 L520 10 L700 80 L860 25 L1050 95 L1200 45 L1200 120 Z"
        fill="currentColor"
      />
    </svg>
  );
}

function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: PointerEvent): void {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [open]);

  if (!user) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-muted transition hover:bg-surface-soft hover:text-foreground"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-pine-700 text-xs font-semibold uppercase text-pine-100">
          {(user.name ?? user.email).slice(0, 2)}
        </span>
        <span className="hidden max-w-32 truncate md:inline">{user.name ?? user.email}</span>
        <ChevronDown className="size-4" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-xl border border-line bg-surface-raised p-1.5 shadow-xl shadow-black/30"
        >
          <NavLink
            to="/perfil"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-surface-soft hover:text-foreground"
          >
            <UserRound className="size-4" />
            Perfil
          </NavLink>
          <div role="menuitem">
            <ThemeToggle menuItem />
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void logout();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-surface-soft hover:text-foreground"
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Header() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface-raised/80 backdrop-blur">
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
                      ? "bg-surface-soft text-foreground"
                      : "text-soft hover:bg-surface-soft hover:text-foreground"
                  }`
                }
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        {status === "loading" ? null : status === "authenticated" ? (
          <div className="flex items-center gap-1">
            <ViewModeToggle />
            <UserMenu />
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {location.pathname !== "/login" && (
              <NavLink to="/login" className="rounded-lg bg-pine-600 px-3 py-1.5 text-sm text-white hover:bg-pine-500">
                Entrar
              </NavLink>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-44 pt-6">
        <Outlet />
      </main>
      <MountainWall />
      <PlayerBar />
    </div>
  );
}

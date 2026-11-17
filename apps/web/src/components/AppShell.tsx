import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChartColumn,
  ChevronDown,
  Compass,
  Heart,
  History,
  Home,
  ListMusic,
  LogOut,
  Menu,
  Mic,
  Radio,
  Rss,
  UserRound,
  X,
} from "lucide-react";
import { fetchPodcastQueueCount, fetchPublicConfig } from "../lib/api.js";
import { useAuthStore } from "../stores/auth.js";
import { AboutSection } from "./AboutSection.js";
import { EpisodeDetailDialog } from "./podcasts/EpisodeDetailDialog.js";
import { PodcastAutoAdvance } from "./podcasts/PodcastAutoAdvance.js";
import { SierraEmblem } from "./SierraEmblem.js";
import { PlayerBar } from "./PlayerBar.js";
import { ThemeToggle } from "./ThemeToggle.js";
import { ViewModeToggle } from "./ViewModeToggle.js";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  auth: boolean;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/explorar", label: "Explorar", icon: Home, auth: true },
  { to: "/favoritos", label: "Favoritos", icon: Heart, auth: true },
  { to: "/historial", label: "Historial", icon: History, auth: true },
  { to: "/estadisticas", label: "Estadísticas", icon: ChartColumn, auth: true },
  { to: "/mis-emisoras", label: "Mis emisoras", icon: Radio, auth: true },
];

const PODCAST_NAV_ITEMS: NavItem[] = [
  { to: "/podcasts", label: "Inicio", icon: Home, auth: true, end: true },
  { to: "/podcasts/descubrir", label: "Descubrir", icon: Compass, auth: true },
  { to: "/podcasts/suscripciones", label: "Suscripciones", icon: Rss, auth: true },
  { to: "/podcasts/cola", label: "Cola", icon: ListMusic, auth: true },
  { to: "/podcasts/favoritos", label: "Favoritos", icon: Heart, auth: true },
  { to: "/podcasts/estadisticas", label: "Estadísticas", icon: ChartColumn, auth: true },
];

type Section = "radio" | "podcasts";

function SectionSwitch({
  current,
  onChange,
  fullWidth = false,
}: {
  current: Section;
  onChange: (section: Section) => void;
  fullWidth?: boolean;
}) {
  const base = "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition";
  return (
    <div
      role="group"
      aria-label="Sección"
      className={`flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 ${
        fullWidth ? "w-full" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => onChange("radio")}
        aria-pressed={current === "radio"}
        className={`${base} ${
          current === "radio" ? "bg-surface-soft text-foreground" : "text-muted hover:text-foreground"
        }`}
      >
        <Radio className="size-3.5" />
        Radio
      </button>
      <button
        type="button"
        onClick={() => onChange("podcasts")}
        aria-pressed={current === "podcasts"}
        className={`${base} ${
          current === "podcasts" ? "bg-surface-soft text-foreground" : "text-muted hover:text-foreground"
        }`}
      >
        <Mic className="size-3.5" />
        Podcasts
      </button>
    </div>
  );
}

function QueueCountBadge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} ${count === 1 ? "episodio" : "episodios"} en cola`}
      className={`inline-flex min-w-4 items-center justify-center rounded-full bg-ochre-500 px-1 text-[10px] font-semibold leading-4 text-pine-950 ${className}`}
    >
      {count}
    </span>
  );
}

const GITHUB_URL = "https://www.github.com/izquierdojl/tolocharadio";

function GitHubLink() {
  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Repositorio en GitHub"
      aria-label="Repositorio en GitHub"
      className="flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-soft hover:text-foreground"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57C20.565 21.795 24 17.31 24 12c0-6.63-5.37-12-12-12z" />
      </svg>
    </a>
  );
}

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
          <div role="menuitem">
            <AboutSection />
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
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: fetchPublicConfig,
    staleTime: Infinity,
  });

  const podcastsEnabled = status === "authenticated" && Boolean(config?.features?.podcasts);
  const inPodcasts =
    location.pathname === "/podcasts" || location.pathname.startsWith("/podcasts/");
  const section: Section = inPodcasts && podcastsEnabled ? "podcasts" : "radio";
  const navItems = section === "podcasts" ? PODCAST_NAV_ITEMS : NAV_ITEMS;
  const { data: queueCount } = useQuery({
    queryKey: ["podcast-queue-count"],
    queryFn: fetchPodcastQueueCount,
    enabled: podcastsEnabled && section === "podcasts",
  });
  const queueCountValue = queueCount?.count ?? 0;
  const changeSection = (next: Section): void => {
    setMenuOpen(false);
    navigate(next === "podcasts" ? "/podcasts" : "/explorar");
  };

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointer(event: PointerEvent): void {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeydown(event: KeyboardEvent): void {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface-raised/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        {podcastsEnabled ? (
          <div className="hidden w-44 shrink-0 md:block">
            <SectionSwitch current={section} onChange={changeSection} />
          </div>
        ) : null}
        <nav className="hidden items-center gap-1 sm:flex">
          {navItems.map((item) => {
            if (item.auth && status !== "authenticated") return null;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? "bg-surface-soft text-foreground"
                      : "text-soft hover:bg-surface-soft hover:text-foreground"
                  }`
                }
              >
                <Icon className="size-4" />
                <span className="hidden lg:inline">{item.label}</span>
                {item.to === "/podcasts/cola" ? (
                  <QueueCountBadge count={queueCountValue} className="ml-1" />
                ) : null}
              </NavLink>
            );
          })}
        </nav>
        <div className="hidden items-center gap-1 sm:flex">
          <GitHubLink />
          {status === "loading" ? null : status === "authenticated" ? (
            <>
              <ViewModeToggle />
              <UserMenu />
            </>
          ) : (
            <>
              <ThemeToggle />
              {location.pathname !== "/login" && (
                <NavLink to="/login" className="rounded-lg bg-pine-600 px-3 py-1.5 text-sm text-white hover:bg-pine-500">
                  Entrar
                </NavLink>
              )}
            </>
          )}
        </div>
        <div ref={menuRef} className="relative sm:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            className="flex size-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-soft hover:text-foreground"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface-raised p-1.5 shadow-xl shadow-black/30"
            >
              {podcastsEnabled ? (
                <div className="mb-1 px-1 py-1">
                  <SectionSwitch current={section} onChange={changeSection} fullWidth />
                </div>
              ) : null}
              {navItems.map((item) => {
                if (item.auth && status !== "authenticated") return null;
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? "bg-surface-soft text-foreground"
                          : "text-muted hover:bg-surface-soft hover:text-foreground"
                      }`
                    }
                  >
                    <Icon className="size-4" />
                    {item.label}
                    {item.to === "/podcasts/cola" ? (
                      <QueueCountBadge count={queueCountValue} className="ml-auto" />
                    ) : null}
                  </NavLink>
                );
              })}
              <div className="my-1 border-t border-line" />
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-surface-soft hover:text-foreground"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57C20.565 21.795 24 17.31 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
              </a>
              <div role="menuitem">
                <ThemeToggle menuItem />
              </div>
              <div role="menuitem">
                <AboutSection />
              </div>
              {status === "authenticated" ? (
                <>
                  <div role="menuitem">
                    <ViewModeToggle menuItem onClose={() => setMenuOpen(false)} />
                  </div>
                  <NavLink
                    to="/perfil"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-surface-soft hover:text-foreground"
                  >
                    <UserRound className="size-4" />
                    Perfil
                  </NavLink>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      void useAuthStore.getState().logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-surface-soft hover:text-foreground"
                  >
                    <LogOut className="size-4" />
                    Cerrar sesión
                  </button>
                </>
              ) : (
                location.pathname !== "/login" && (
                  <NavLink
                    to="/login"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg bg-pine-600 px-3 py-2 text-sm text-white hover:bg-pine-500"
                  >
                    Entrar
                  </NavLink>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <PodcastAutoAdvance />
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-44 pt-6">
        <Outlet />
      </main>
      <MountainWall />
      <PlayerBar />
      <EpisodeDetailDialog />
    </div>
  );
}

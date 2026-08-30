import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "../stores/theme.js";
import type { UserTheme } from "../lib/types.js";

const OPPOSITE: Record<UserTheme, UserTheme> = { light: "dark", dark: "light" };

interface ThemeToggleProps {
  menuItem?: boolean;
}

export function ThemeToggle({ menuItem = false }: ThemeToggleProps) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const next: UserTheme = OPPOSITE[theme];
  const label = next === "dark" ? "Cambiar a tema oscuro" : "Cambiar a tema claro";
  const Icon = theme === "dark" ? Sun : Moon;

  if (menuItem) {
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-surface-soft hover:text-foreground"
      >
        <Icon className="size-4" />
        {theme === "dark" ? "Tema claro" : "Tema oscuro"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={label}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-soft hover:text-foreground"
    >
      <Icon className="size-4" />
    </button>
  );
}

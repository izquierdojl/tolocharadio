import type { FormEvent } from "react";
import { Search } from "lucide-react";
import { SearchInput } from "../SearchInput.js";

export type SubscriptionSearchScope = "podcasts" | "episodios";

interface SubscriptionSearchBarProps {
  term: string;
  scope: SubscriptionSearchScope;
  onTermChange: (value: string) => void;
  onScopeChange: (scope: SubscriptionSearchScope) => void;
  onSubmit: () => void;
}

const SCOPES: ReadonlyArray<{ value: SubscriptionSearchScope; label: string }> = [
  { value: "podcasts", label: "Podcasts" },
  { value: "episodios", label: "Episodios" },
];

/**
 * Búsqueda de la pantalla de suscripciones: input con toggle de ámbito
 * «Podcasts | Episodios». El botón de buscar solo aparece en el ámbito
 * de episodios, que consulta al servidor; el de podcasts filtra en cliente
 * mientras se escribe.
 */
export function SubscriptionSearchBar({
  term,
  scope,
  onTermChange,
  onScopeChange,
  onSubmit,
}: SubscriptionSearchBarProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center justify-between gap-2"
      role="search"
    >
      <SearchInput
        id="buscar-suscripciones"
        value={term}
        onChange={onTermChange}
        placeholder={
          scope === "episodios"
            ? "Buscar episodios en tus suscripciones"
            : "Buscar en tus podcasts"
        }
        ariaLabel={
          scope === "episodios"
            ? "Buscar episodios por título en tus suscripciones"
            : "Buscar podcasts por nombre"
        }
        className="w-full sm:w-72"
      />
      <div
        role="group"
        aria-label="Ámbito de búsqueda"
        className="flex items-center gap-1 rounded-lg border border-line bg-surface p-0.5"
      >
        {SCOPES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onScopeChange(option.value)}
            aria-pressed={scope === option.value}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              scope === option.value
                ? "bg-surface-soft text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
        {scope === "episodios" ? (
          <button
            type="submit"
            disabled={!term.trim()}
            className="inline-flex items-center gap-1 rounded-md bg-pine-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-pine-500 disabled:opacity-50"
          >
            <Search className="size-3.5" />
            Buscar
          </button>
        ) : null}
      </div>
    </form>
  );
}

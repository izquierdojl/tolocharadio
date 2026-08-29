import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Loader2, Search as SearchIcon, SearchX } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Page, Station } from "../lib/types.js";
import { api } from "../lib/api.js";
import { StationCard } from "../components/StationCard.js";
import { EmptyState } from "../components/EmptyState.js";

const PAGE_SIZE = 24;
const EXAMPLES = ["clásica", "jazz", "folk"];

function buildQuery(params: { name: string; country: string; language: string; offset: number }): string {
  const q = new URLSearchParams();
  if (params.name) q.set("name", params.name);
  if (params.country) q.set("country", params.country);
  if (params.language) q.set("language", params.language);
  q.set("limit", String(PAGE_SIZE));
  q.set("offset", String(params.offset));
  return `/stations?${q.toString()}`;
}

interface Filters {
  name: string;
  country: string;
  language: string;
}

function submitForm(e: FormEvent<HTMLFormElement>): void {
  e.preventDefault();
}

export function Explore() {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");
  const [filters, setFilters] = useState<Filters>({ name: "", country: "", language: "" });
  const [offset, setOffset] = useState(0);

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["stations", filters, offset],
    queryFn: () =>
      api.get<Page<Station>>(buildQuery({ ...filters, offset })),
    placeholderData: keepPreviousData,
  });

  const applyFilters = (next: Filters, nextOffset = 0): void => {
    setFilters(next);
    setOffset(nextOffset);
  };

  const hasActiveFilters = Boolean(filters.name || filters.country || filters.language);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-pine-100">Explorar emisoras</h1>
        <p className="text-sm text-pine-400">Busca entre miles de emisoras de todo el mundo.</p>
      </div>

      <form
        onSubmit={submitForm}
        className="flex flex-col gap-3 rounded-2xl border border-pine-800 bg-pine-900/50 p-4 lg:flex-row lg:items-center"
      >
        <label className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-pine-500" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters({ name, country, language });
            }}
            placeholder="Buscar por nombre de emisora…"
            className="w-full rounded-lg border border-pine-700 bg-pine-950 py-2.5 pl-9 pr-3 text-sm text-pine-100 placeholder:text-pine-500 focus:border-pine-500 focus:outline-none"
          />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters({ name, country, language });
            }}
            placeholder="País (ej. España)"
            className="rounded-lg border border-pine-700 bg-pine-950 px-3 py-2.5 text-sm text-pine-100 placeholder:text-pine-500 focus:border-pine-500 focus:outline-none sm:w-40"
          />
          <input
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters({ name, country, language });
            }}
            placeholder="Idioma (ej. español)"
            className="rounded-lg border border-pine-700 bg-pine-950 px-3 py-2.5 text-sm text-pine-100 placeholder:text-pine-500 focus:border-pine-500 focus:outline-none sm:w-44"
          />
        </div>
        <button
          type="button"
          onClick={() => applyFilters({ name, country, language })}
          className="rounded-lg bg-pine-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-pine-500"
        >
          Buscar
        </button>
      </form>

      {!hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-pine-500">Sugerencias:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setName(ex);
                applyFilters({ name: ex, country: "", language: "" });
              }}
              className="rounded-full border border-pine-700 px-3 py-1 text-pine-300 transition hover:border-ochre-500 hover:text-ochre-300"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {isError ? (
        <EmptyState
          icon={<SearchX className="size-6" />}
          title="No se pudo cargar el catálogo"
          description="El catálogo de emisoras está temporalmente fuera de alcance. Inténtalo de nuevo en unos segundos."
          action={
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-lg bg-ochre-500 px-4 py-2 text-sm font-medium text-pine-950 hover:bg-ochre-400"
            >
              Reintentar
            </button>
          }
        />
      ) : !data ? (
        <div className="flex items-center justify-center gap-2 py-16 text-pine-500">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm">Buscando en la sierra…</span>
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={<SearchX className="size-6" />}
          title="Sin resultados"
          description="No encontramos emisoras que cumplan esos criterios. Prueba a quitar filtros o cambiar la búsqueda."
          action={
            <button
              type="button"
              onClick={() => {
                setName("");
                setCountry("");
                setLanguage("");
                applyFilters({ name: "", country: "", language: "" });
              }}
              className="rounded-lg bg-pine-700 px-4 py-2 text-sm font-medium text-pine-100 hover:bg-pine-600"
            >
              Quitar filtros
            </button>
          }
        />
      ) : (
        <>
          {isFetching && offset !== 0 ? null : null}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.items.map((station) => (
              <StationCard key={station.id} station={station} />
            ))}
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              className="rounded-lg border border-pine-700 px-4 py-2 text-sm text-pine-200 transition hover:bg-pine-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-sm text-pine-500">
              {offset + 1}–{offset + data.items.length} de más resultados
            </span>
            <button
              type="button"
              disabled={!data.pagination.hasMore}
              onClick={() => setOffset(offset + PAGE_SIZE)}
              className="rounded-lg border border-pine-700 px-4 py-2 text-sm text-pine-200 transition hover:bg-pine-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </section>
  );
}
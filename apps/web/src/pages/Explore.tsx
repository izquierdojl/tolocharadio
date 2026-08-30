import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Loader2, Search as SearchIcon, SearchX } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Page, Station } from "../lib/types.js";
import { api, fetchCatalogCountries, fetchCatalogLanguages, fetchCatalogTags } from "../lib/api.js";
import { Combobox } from "../components/Combobox.js";
import { StationList } from "../components/StationList.js";
import { EmptyState } from "../components/EmptyState.js";

const PAGE_SIZE = 24;
const EXAMPLES = ["clásica", "jazz", "folk"];

function buildQuery(params: { name: string; country: string; language: string; tag: string; offset: number }): string {
  const q = new URLSearchParams();
  if (params.name) q.set("name", params.name);
  if (params.country) q.set("country", params.country);
  if (params.language) q.set("language", params.language);
  if (params.tag) q.set("tag", params.tag);
  q.set("limit", String(PAGE_SIZE));
  q.set("offset", String(params.offset));
  return `/stations?${q.toString()}`;
}

interface Filters {
  name: string;
  country: string;
  language: string;
  tag: string;
}

function submitForm(e: FormEvent<HTMLFormElement>): void {
  e.preventDefault();
}

interface FilterControlProps {
  id: string;
  value: string;
  options: string[] | undefined;
  degraded: boolean;
  placeholder: string;
  onChange: (value: string) => void;
  onEnter: () => void;
}

function FilterControl({ id, value, options, degraded, placeholder, onChange, onEnter }: FilterControlProps) {
  if (!options || degraded) {
    return (
      <>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onEnter();
          }}
          placeholder={placeholder}
          aria-describedby={degraded ? `${id}-warn` : undefined}
          className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-faint focus:border-pine-500 focus:outline-none"
        />
        {degraded ? (
          <p id={`${id}-warn`} className="text-[10px] leading-tight text-ochre-400">
            No se pudo cargar la lista; escribe el valor manualmente
          </p>
        ) : null}
      </>
    );
  }
  return (
    <Combobox
      id={id}
      value={value}
      options={options}
      placeholder={placeholder}
      onChange={onChange}
      onEnter={onEnter}
    />
  );
}

export function Explore() {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");
  const [tag, setTag] = useState("");
  const [filters, setFilters] = useState<Filters>({ name: "", country: "", language: "", tag: "" });
  const [offset, setOffset] = useState(0);

  const current = { name, country, language, tag };

  const countriesQuery = useQuery({
    queryKey: ["catalog-countries"],
    queryFn: fetchCatalogCountries,
    staleTime: 5 * 60_000,
  });
  const languagesQuery = useQuery({
    queryKey: ["catalog-languages"],
    queryFn: fetchCatalogLanguages,
    staleTime: 5 * 60_000,
  });
  const tagsQuery = useQuery({
    queryKey: ["catalog-tags"],
    queryFn: fetchCatalogTags,
    staleTime: 5 * 60_000,
  });

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

  const hasActiveFilters = Boolean(filters.name || filters.country || filters.language || filters.tag);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Explorar emisoras</h1>
        <p className="text-sm text-muted">Busca entre miles de emisoras de todo el mundo.</p>
      </div>

      <form
        onSubmit={submitForm}
        className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-4 lg:flex-row lg:items-center"
      >
        <label className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters(current);
            }}
            placeholder="Buscar por nombre de emisora…"
            className="w-full rounded-lg border border-line-strong bg-surface py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-faint focus:border-pine-500 focus:outline-none"
          />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-col gap-1 sm:w-40">
            <FilterControl
              id="filter-country"
              value={country}
              options={countriesQuery.data?.items}
              degraded={countriesQuery.isError}
              placeholder="País (ej. España)"
              onChange={setCountry}
              onEnter={() => applyFilters(current)}
            />
          </div>
          <div className="flex flex-col gap-1 sm:w-44">
            <FilterControl
              id="filter-language"
              value={language}
              options={languagesQuery.data?.items}
              degraded={languagesQuery.isError}
              placeholder="Idioma (ej. español)"
              onChange={setLanguage}
              onEnter={() => applyFilters(current)}
            />
          </div>
          <div className="flex flex-col gap-1 sm:w-44">
            <FilterControl
              id="filter-genre"
              value={tag}
              options={tagsQuery.data?.items}
              degraded={tagsQuery.isError}
              placeholder="Género (ej. jazz)"
              onChange={setTag}
              onEnter={() => applyFilters(current)}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => applyFilters(current)}
          className="rounded-lg bg-pine-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-pine-500"
        >
          Buscar
        </button>
      </form>

      {!hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-faint">Sugerencias:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setName(ex);
                applyFilters({ name: ex, country: "", language: "", tag: "" });
              }}
              className="rounded-full border border-line-strong px-3 py-1 text-soft transition hover:border-ochre-500 hover:text-ochre-300"
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
        <div className="flex items-center justify-center gap-2 py-16 text-faint">
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
                setTag("");
                applyFilters({ name: "", country: "", language: "", tag: "" });
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
          <StationList stations={data.items} />
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              className="rounded-lg border border-line-strong px-4 py-2 text-sm text-foreground transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-sm text-faint">
              {offset + 1}–{offset + data.items.length} de más resultados
            </span>
            <button
              type="button"
              disabled={!data.pagination.hasMore}
              onClick={() => setOffset(offset + PAGE_SIZE)}
              className="rounded-lg border border-line-strong px-4 py-2 text-sm text-foreground transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </section>
  );
}
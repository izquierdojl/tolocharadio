/**
 * Normaliza texto para comparaciones de búsqueda: minúsculas y sin marcas
 * diacríticas (NFD), de modo que «camion» coincida con «El camión fantasma».
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/**
 * Coincidencia «contiene» sin distinguir mayúsculas ni acentos.
 * Un término vacío o en blanco no coincide con nada.
 */
export function textMatches(term: string, value: string): boolean {
  const needle = normalizeSearchText(term.trim());
  if (!needle) return false;
  return normalizeSearchText(value).includes(needle);
}

/**
 * Copia filtrada por título con coincidencia «contiene» sin mayúsculas ni
 * acentos, conservando el orden recibido. Con término vacío devuelve una
 * copia sin filtrar (la lista completa).
 */
export function filterByTitle<T extends { title: string }>(
  items: readonly T[],
  term: string,
): T[] {
  const trimmed = term.trim();
  if (!trimmed) return [...items];
  return items.filter((item) => textMatches(trimmed, item.title));
}

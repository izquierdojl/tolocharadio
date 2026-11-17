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

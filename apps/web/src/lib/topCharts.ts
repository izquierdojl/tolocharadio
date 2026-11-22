export interface TopChartOption {
  id: string;
  label: string;
}

export const DEFAULT_TOP_COUNTRY = "es";

/** Paises del ranking de Apple Podcasts (Espana primero). */
export const TOP_COUNTRIES: readonly TopChartOption[] = [
  { id: "es", label: "España" },
  { id: "mx", label: "México" },
  { id: "ar", label: "Argentina" },
  { id: "co", label: "Colombia" },
  { id: "cl", label: "Chile" },
  { id: "pe", label: "Perú" },
  { id: "us", label: "Estados Unidos" },
  { id: "gb", label: "Reino Unido" },
  { id: "fr", label: "Francia" },
  { id: "de", label: "Alemania" },
  { id: "it", label: "Italia" },
  { id: "pt", label: "Portugal" },
  { id: "br", label: "Brasil" },
];

/** Categorias de Apple Podcasts (identificador de genero). */
export const TOP_GENRES: readonly TopChartOption[] = [
  { id: "1301", label: "Artes" },
  { id: "1321", label: "Negocios" },
  { id: "1303", label: "Comedia" },
  { id: "1304", label: "Educación" },
  { id: "1483", label: "Ficción" },
  { id: "1487", label: "Historia" },
  { id: "1512", label: "Salud y bienestar" },
  { id: "1305", label: "Niños y familia" },
  { id: "1502", label: "Ocio" },
  { id: "1310", label: "Música" },
  { id: "1489", label: "Noticias" },
  { id: "1314", label: "Religión y espiritualidad" },
  { id: "1533", label: "Ciencia" },
  { id: "1324", label: "Sociedad y cultura" },
  { id: "1545", label: "Deportes" },
  { id: "1318", label: "Tecnología" },
  { id: "1488", label: "Crímenes reales" },
  { id: "1309", label: "TV y cine" },
];

export function isTopCountry(value: unknown): value is string {
  return typeof value === "string" && TOP_COUNTRIES.some((c) => c.id === value);
}

export function isTopGenre(value: unknown): value is string {
  return typeof value === "string" && TOP_GENRES.some((g) => g.id === value);
}

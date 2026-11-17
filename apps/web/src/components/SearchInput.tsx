import { Search, X } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  id?: string;
  className?: string;
}

/**
 * Input de búsqueda/filtrado de texto con botón de limpiar, reutilizable en
 * las pantallas de podcasts (ficha, suscripciones, favoritos y cola).
 */
export function SearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  id,
  className,
}: SearchInputProps) {
  return (
    <div className={`relative flex items-center ${className ?? ""}`}>
      <Search className="pointer-events-none absolute left-2.5 size-4 text-faint" aria-hidden="true" />
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full rounded-lg border border-line-strong bg-surface py-1.5 pl-8 pr-8 text-sm text-foreground placeholder:text-faint transition hover:border-pine-500 focus:border-pine-500 focus:outline-none"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-1.5 rounded-md p-1 text-faint transition hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

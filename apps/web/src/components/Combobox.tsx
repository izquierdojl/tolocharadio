import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

const MAX_VISIBLE = 300;

interface ComboboxProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  onEnter?: () => void;
}

export function Combobox({ id, value, onChange, options, placeholder, className, onEnter }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handlePointer(event: PointerEvent): void {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, []);

  const filtered = useMemo(() => {
    const term = value.trim().toLocaleLowerCase();
    if (!term) return options;
    return options.filter((option) => option.toLocaleLowerCase().includes(term));
  }, [options, value]);

  const visible = useMemo(() => filtered.slice(0, MAX_VISIBLE), [filtered]);
  const hiddenCount = filtered.length - visible.length;

  const listId = `${id}-listbox`;
  const activeDescendant = open && visible.length > 0 ? `${id}-option-${highlight}` : undefined;

  const select = (next: string): void => {
    onChange(next);
    setOpen(false);
    setHighlight(0);
    inputRef.current?.focus();
  };

  const handleInputChange = (text: string): void => {
    onChange(text);
    setOpen(true);
    setHighlight(0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight((current) => (visible.length === 0 ? 0 : (current + 1) % visible.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setHighlight((current) => (visible.length === 0 ? 0 : (current - 1 + visible.length) % visible.length));
    } else if (event.key === "Enter") {
      const option = open && visible.length > 0 ? visible[Math.min(highlight, visible.length - 1)] : undefined;
      if (option !== undefined) {
        event.preventDefault();
        select(option);
      } else {
        onEnter?.();
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeDescendant}
        value={value}
        onChange={(event) => handleInputChange(event.target.value)}
        onFocus={() => {
          setOpen(true);
          setHighlight(0);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-lg border border-pine-700 bg-pine-950 py-2.5 pl-3 pr-9 text-sm text-pine-100 placeholder:text-pine-500 focus:border-pine-500 focus:outline-none"
      />
      <ChevronDown
        className={`pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-pine-500 transition-transform ${open ? "rotate-180" : ""}`}
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-pine-700 bg-pine-950 py-1 shadow-xl shadow-black/40"
        >
          {visible.length === 0 ? (
            <li className="px-3 py-2 text-sm text-pine-500">Sin resultados</li>
          ) : (
            <>
              {visible.map((option, index) => {
                const selected = option === value;
                return (
                  <li
                    key={option}
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={selected || index === highlight}
                    onMouseEnter={() => setHighlight(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => select(option)}
                    className={`cursor-pointer px-3 py-2 text-sm ${
                      index === highlight ? "bg-pine-800 text-pine-100" : "text-pine-300"
                    } ${selected ? "font-medium" : ""}`}
                  >
                    {option}
                  </li>
                );
              })}
              {hiddenCount > 0 ? (
                <li className="px-3 py-2 text-xs text-pine-500">
                  … y {hiddenCount} más (sigue escribiendo para filtrar)
                </li>
              ) : null}
            </>
          )}
        </ul>
      ) : null}
    </div>
  );
}
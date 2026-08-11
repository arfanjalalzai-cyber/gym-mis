import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export interface SearchableSelectOption {
  id: number;
  label: string;
}

export interface SearchableSelectProps {
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  options: SearchableSelectOption[];
  value: number | null;
  error?: string;
  onChange: (value: number | null) => void;
}

export default function SearchableSelect({
  label,
  placeholder = "Select option",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  options,
  value,
  error,
  onChange,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((option) => option.id === value) ?? null;
  const normalizedSearch = search.trim().toLowerCase();

  const filteredOptions = useMemo(() => {
    if (!normalizedSearch) return options;

    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedSearch)
    );
  }, [normalizedSearch, options]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setActiveIndex(0);
    }
  }, [isOpen, normalizedSearch]);

  const selectOption = (option: SearchableSelectOption) => {
    onChange(option.id);
    setIsOpen(false);
    setSearch("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        filteredOptions.length ? Math.min(index + 1, filteredOptions.length - 1) : 0
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }

    if (event.key === "Enter" && filteredOptions[activeIndex]) {
      event.preventDefault();
      selectOption(filteredOptions[activeIndex]);
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setSearch("");
    }
  };

  return (
    <div ref={rootRef} className="relative w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={`
          flex w-full items-center justify-between gap-2 rounded-lg border bg-background px-4 py-2.5 text-left text-sm text-text-primary
          transition-all duration-200
          focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
          ${error ? "border-error focus:border-error focus:ring-error/20" : "border-border"}
        `}
      >
        <span className={selectedOption ? "truncate" : "truncate text-muted"}>
          {selectedOption?.label ?? placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-muted">
          {selectedOption && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear selection"
              onClick={(event) => {
                event.stopPropagation();
                onChange(null);
                setSearch("");
              }}
              className="rounded p-0.5 hover:bg-surface-hover"
            >
              <X className="h-4 w-4" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-border bg-background shadow-lg">
          <div className="relative border-b border-border">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              ref={inputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-background py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-muted focus:outline-none"
            />
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted">{emptyMessage}</div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.id === value;
                const isActive = index === activeIndex;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectOption(option)}
                    className={`
                      flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm
                      ${isActive ? "bg-surface-hover text-text-primary" : "text-text-primary"}
                    `}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
    </div>
  );
}

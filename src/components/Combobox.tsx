"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Extra words to match on, e.g. a city or an offset. */
  keywords?: string;
}

/**
 * Single-select with a search box. A native `<select>` is fine for six options and
 * unusable for four hundred — which is what the timezone list is.
 *
 * Keyboard: type to filter, ↑/↓ to move, Enter to pick, Escape to close.
 */
export function Combobox({
  value,
  onChange,
  options,
  label,
  placeholder = "Search…",
  emptyText = "No matches",
  disabled,
  id,
  className,
  size = "md",
}: {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  label?: string;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** `sm` matches `<Button size="sm">`, for sitting next to one in a toolbar. */
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    const terms = q.split(/\s+/);
    return options.filter((o) => {
      const haystack = `${o.label} ${o.value} ${o.keywords ?? ""}`.toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    // keep the highlighted row in view while arrowing through a long list
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const pick = (option: ComboboxOption) => {
    onChange(option.value);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className={className ?? "w-full"} ref={root}>
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => {
            setOpen((o) => !o);
            setQuery("");
            setActive(
              Math.max(
                0,
                filtered.findIndex((o) => o.value === value)
              )
            );
          }}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded border border-gray-300 bg-white text-left text-gray-900 transition-colors",
            size === "sm" ? "px-3 py-1.5 text-xs" : "px-3 py-2 text-sm",
            "focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900",
            "dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-gray-100 dark:focus:ring-gray-100",
            "disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800"
          )}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <svg
            className={cn("shrink-0 text-gray-400", size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
            <input
              autoFocus
              value={query}
              placeholder={placeholder}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, filtered.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (filtered[active]) pick(filtered[active]);
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              className="w-full border-b border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none dark:border-gray-700 dark:text-white"
            />
            <ul ref={listRef} role="listbox" className="max-h-64 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{emptyText}</li>
              )}
              {filtered.map((option, i) => (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(option)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm",
                      i === active
                        ? "bg-gray-100 dark:bg-gray-800"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/60",
                      option.value === value
                        ? "font-medium text-gray-900 dark:text-white"
                        : "text-gray-700 dark:text-gray-300"
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {option.value === value && <span aria-hidden="true">✓</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

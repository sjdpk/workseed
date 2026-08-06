"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";

export interface NavSearchItem {
  name: string;
  href: string;
  /** The sidebar group it sits under, shown as a hint on the row. */
  section: string;
  /** The same icon the sidebar uses, so a row is recognisable before it is read. */
  icon?: ComponentType<{ className?: string }>;
}

/**
 * Jump-to-page search over the sidebar. It searches exactly what the sidebar shows,
 * so a page hidden from this user by permission is not findable here either.
 *
 * Keyboard: ⌘K / Ctrl+K opens it, ↑/↓ moves, Enter goes, Escape closes.
 */
export function NavSearch({
  items,
  open,
  onClose,
}: {
  items: NavSearchItem[];
  open: boolean;
  onClose: () => void;
}) {
  // mounted only while open, so the query resets itself with no effect to do it
  if (!open) return null;
  return <Palette items={items} onClose={onClose} />;
}

function Palette({ items, onClose }: { items: NavSearchItem[]; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    const terms = q.split(/\s+/);
    return items.filter((item) => {
      const haystack = `${item.name} ${item.section} ${item.href}`.toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
  }, [items, query]);

  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search pages"
        className="relative w-full max-w-lg overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      >
        <div className="flex items-center gap-2 border-b border-gray-200 px-3 dark:border-gray-700">
          <SearchIcon className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            autoFocus
            value={query}
            placeholder="Search pages…"
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (results[active]) go(results[active].href);
              } else if (e.key === "Escape") {
                onClose();
              }
            }}
            className="w-full bg-transparent py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none dark:text-white"
          />
          <kbd className="hidden shrink-0 rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-400 sm:block dark:border-gray-700">
            esc
          </kbd>
        </div>

        <ul ref={listRef} className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No pages match “{query}”
            </li>
          )}
          {results.map((item, i) => {
            const Icon = item.icon;
            return (
              <li key={item.href + item.name}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item.href)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${
                    i === active
                      ? "bg-gray-100 dark:bg-gray-800"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  }`}
                >
                  {Icon ? (
                    <Icon className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
                  ) : (
                    <span className="h-4 w-4 shrink-0" />
                  )}
                  <span className="truncate text-gray-900 dark:text-white">{item.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-gray-400 dark:text-gray-500">
                    {item.section}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

interface SearchBarProps {
  initialQuery?: string;
}

export function SearchBar({ initialQuery = "" }: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery || queryFromUrl);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync with URL when navigating from search page
  useEffect(() => {
    if (!initialQuery && pathname === "/search" && queryFromUrl) {
      setQuery(queryFromUrl);
    }
  }, [initialQuery, pathname, queryFromUrl]);

  // Debounced fetch suggestions
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggestions?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        setIsOpen(false);
      }
    },
    [query, router],
  );

  const handleSelect = useCallback(
    (suggestion: string) => {
      setQuery(suggestion);
      router.push(`/search?q=${encodeURIComponent(suggestion)}`);
      setIsOpen(false);
    },
    [router],
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl">
      <form onSubmit={handleSubmit} role="search" className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder="Search products..."
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          aria-label="Search"
          aria-autocomplete="list"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg"
          role="listbox"
          aria-label="Search suggestions"
        >
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500">Loading...</div>
          ) : suggestions.length > 0 ? (
            <ul className="py-1">
              {suggestions.map((suggestion) => (
                <li
                  key={suggestion}
                  role="option"
                  aria-selected={false}
                >
                  <button
                    type="button"
                    onClick={() => handleSelect(suggestion)}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">No suggestions</div>
          )}
        </div>
      )}
    </div>
  );
}

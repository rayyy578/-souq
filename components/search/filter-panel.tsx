"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

interface FilterPanelProps {
  categories?: string[];
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function FilterSection({ title, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 py-4 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between text-sm font-semibold text-gray-900"
        aria-expanded={isOpen}
      >
        {title}
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {isOpen && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function FilterPanel({ categories = [] }: FilterPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const minRating = searchParams.get("minRating") ?? "";
  const category = searchParams.get("category") ?? "";
  const inStock = searchParams.get("inStock") === "true";

  const [localMinPrice, setLocalMinPrice] = useState(minPrice);
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice);
  const [localInStock, setLocalInStock] = useState(inStock);

  const applyFilters = useCallback(
    (overrides: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(overrides)) {
        if (value !== null) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`/search?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handlePriceApply = useCallback(() => {
    const overrides: Record<string, string | null> = {};
    if (localMinPrice && Number(localMinPrice)) {
      overrides.minPrice = localMinPrice;
    } else {
      overrides.minPrice = null;
    }
    if (localMaxPrice && Number(localMaxPrice)) {
      overrides.maxPrice = localMaxPrice;
    } else {
      overrides.maxPrice = null;
    }
    applyFilters(overrides);
  }, [localMinPrice, localMaxPrice, applyFilters]);

  const handleRating = useCallback(
    (rating: string) => {
      if (minRating === rating) {
        applyFilters({ minRating: null });
      } else {
        applyFilters({ minRating: rating });
      }
    },
    [minRating, applyFilters],
  );

  const handleCategory = useCallback(
    (cat: string) => {
      if (category === cat) {
        applyFilters({ category: null });
      } else {
        applyFilters({ category: cat });
      }
    },
    [category, applyFilters],
  );

  const handleInStock = useCallback(
    (checked: boolean) => {
      setLocalInStock(checked);
      applyFilters({ inStock: checked ? "true" : null });
    },
    [applyFilters],
  );

  const hasFilters = !!(minPrice || maxPrice || minRating || category || inStock);

  const handleClearAll = useCallback(() => {
    setLocalMinPrice("");
    setLocalMaxPrice("");
    setLocalInStock(false);
    router.push("/search");
  }, [router]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">Filters</h2>
        {hasFilters && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Price Range */}
      <FilterSection title="Price">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={localMinPrice}
            onChange={(e) => setLocalMinPrice(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handlePriceApply();
            }}
            placeholder="Min"
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            min={0}
            aria-label="Minimum price"
          />
          <span className="text-gray-400">-</span>
          <input
            type="number"
            value={localMaxPrice}
            onChange={(e) => setLocalMaxPrice(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handlePriceApply();
            }}
            placeholder="Max"
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            min={0}
            aria-label="Maximum price"
          />
          <button
            type="button"
            onClick={handlePriceApply}
            className="shrink-0 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            Go
          </button>
        </div>
      </FilterSection>

      {/* Rating */}
      <FilterSection title="Rating">
        <div className="flex flex-col gap-2">
          {["4", "3", "2", "1"].map((rating) => {
            const isSelected = minRating === rating;
            return (
              <button
                key={rating}
                type="button"
                onClick={() => handleRating(rating)}
                className={`rounded-md border px-3 py-1.5 text-left text-sm transition-colors ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {"\u2605".repeat(Number(rating))}{"\u2606".repeat(4 - Number(rating))}
                {" "}
                & above
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Category */}
      {categories.length > 0 && (
        <FilterSection title="Category">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const isSelected = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategory(cat)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </FilterSection>
      )}

      {/* Availability */}
      <FilterSection title="Availability">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={localInStock}
            onChange={(e) => handleInStock(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            aria-label="In stock only"
          />
          In stock only
        </label>
      </FilterSection>
    </div>
  );
}

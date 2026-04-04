"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback } from "react";

export function FilterControls() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const minRating = searchParams.get("minRating");
  const category = searchParams.get("category");
  const inStock = searchParams.get("inStock");

  const hasFilters = !!(minPrice || maxPrice || minRating || category || inStock);

  const removeFilter = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(key);
      const query = params.toString();
      router.push(query ? `/search?${query}` : "/search");
    },
    [router, searchParams],
  );

  const clearAll = useCallback(() => {
    router.push("/search");
  }, [router]);

  if (!hasFilters) return null;

  const chips: { key: string; label: string }[] = [];

  if (minPrice || maxPrice) {
    const label = `Price: ${minPrice ? `${minPrice}+` : ""}${minPrice && maxPrice ? "-" : ""}${maxPrice ? `<${maxPrice}` : ""} TND`;
    chips.push({ key: "price", label });
  }
  if (minRating) {
    chips.push({ key: "minRating", label: `${minRating}\u2605 & above` });
  }
  if (category) {
    chips.push({ key: "category", label: `Category: ${category}` });
  }
  if (inStock === "true") {
    chips.push({ key: "inStock", label: "In stock" });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => removeFilter(chip.key)}
          className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-100"
        >
          {chip.label}
          <span className="ml-0.5 text-gray-400 hover:text-gray-600" aria-label="Remove filter">
            &times;
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}

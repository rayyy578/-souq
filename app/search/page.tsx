"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { SearchBar } from "@/components/search/search-bar";
import { FilterPanel } from "@/components/search/filter-panel";
import { FilterControls } from "@/components/search/filter-controls";
import { ProductCard } from "@/components/product/product-card";
import { ProductSearch } from "@/lib/search";
import { useEffect, useState, useCallback } from "react";

function SearchSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-lg border border-gray-200 bg-white"
        >
          <div className="aspect-square w-full bg-gray-200" />
          <div className="p-3 space-y-2">
            <div className="h-4 w-3/4 rounded bg-gray-200" />
            <div className="h-3 w-full rounded bg-gray-200" />
            <div className="h-3 w-1/2 rounded bg-gray-200" />
            <div className="h-4 w-1/3 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [results, setResults] = useState<ProductSearch[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const q = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page")) || 1;
  const minPrice = searchParams.get("minPrice") ?? undefined;
  const maxPrice = searchParams.get("maxPrice") ?? undefined;
  const minRating = searchParams.get("minRating") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const inStock = searchParams.get("inStock") ?? undefined;

  const fetchResults = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (page > 1) params.set("page", String(page));
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (minRating) params.set("minRating", minRating);
    if (category) params.set("category", category);
    if (inStock) params.set("inStock", inStock);

    try {
      const res = await fetch(`/api/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 0);
      }
    } catch {
      setResults([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [q, page, minPrice, maxPrice, minRating, category, inStock]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`/search?${params.toString()}`);
  };

  const handlePrevious = () => {
    if (page > 1) goToPage(page - 1);
  };

  const handleNext = () => {
    if (page < totalPages) goToPage(page + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-center">
          <SearchBar />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Active filter chips */}
        <FilterControls />

        <div className="mt-4 flex gap-6">
          {/* Filter panel - hidden on mobile */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <FilterPanel />
          </aside>

          {/* Results */}
          <main className="min-w-0 flex-1">
            {loading ? (
              <SearchSkeleton />
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-16 text-center">
                <p className="text-lg font-semibold text-gray-900">No results found</p>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            ) : (
              <>
                <p className="mb-4 text-sm text-gray-500">
                  {total} result{total !== 1 ? "s" : ""} found
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {results.map((product) => (
                    <ProductCard
                      key={product.id}
                      id={product.id}
                      name={product.name}
                      description={product.description}
                      price_millimes={product.price_millimes}
                      rating={product.rating}
                      images={product.images}
                      category={product.category}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrevious}
                      disabled={page <= 1}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-50 hover:bg-gray-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let p: number;
                      if (totalPages <= 5) {
                        p = i + 1;
                      } else if (page <= 3) {
                        p = i + 1;
                      } else if (page >= totalPages - 2) {
                        p = totalPages - 4 + i;
                      } else {
                        p = page - 2 + i;
                      }
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => goToPage(p)}
                          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                            p === page
                              ? "bg-emerald-600 text-white"
                              : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={page >= totalPages}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-50 hover:bg-gray-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

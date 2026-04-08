import { Suspense } from "react";
import { formatPrice } from "@/lib/utils";

const CATEGORIES = [
  "electronics",
  "fashion",
  "home-garden",
  "sports",
  "books",
  "toys",
  "automotive",
  "other",
];

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const cat = params.category;
  const search = params.search;
  const page = parseInt(params.page || "1");
  const limit = 20;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const url = new URL(`${baseUrl}/api/products`);
  if (cat) url.searchParams.set("category", cat);
  if (search) url.searchParams.set("search", search);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 },
  });
  const json = await res.json();
  const { data, pagination, error: apiError } = json;

  // Debug: return simple text first
  if (apiError) {
    return <div>API Error: {apiError}</div>;
  }

  if (!data || data.length === 0) {
    return <div>No products found</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {cat ? `${cat.replace("-", " & ").replace(/\b\w/g, (c: string) => c.toUpperCase())} Category` : "All Products"}
        </h1>

        <form className="flex gap-2 mb-4" action="/shop" method="GET">
          <input
            type="text"
            name="search"
            placeholder="Search products..."
            defaultValue={search || ""}
            className="flex-1 max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm hover:bg-emerald-700"
          >
            Search
          </button>
        </form>

        <div className="flex gap-2 flex-wrap">
          <a
            href="/shop"
            className={`px-3 py-1 rounded-full text-sm border ${
              !cat ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "hover:bg-gray-100"
            }`}
          >
            All
          </a>
          {CATEGORIES.map((c) => (
            <a
              key={c}
              href={`/shop?category=${c}`}
              className={`px-3 py-1 rounded-full text-sm border ${
                cat === c ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "hover:bg-gray-100"
              }`}
            >
              {c.replace("-", " & ").replace(/\b\w/g, (ch: string) => ch.toUpperCase())}
            </a>
          ))}
        </div>
      </div>

      <div className="text-center py-12">
        Found {data.length} products
      </div>
    </div>
  );
}
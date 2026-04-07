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

      {apiError ? (
        <div className="text-center py-12 text-red-500">
          Error loading products: {apiError}
        </div>
      ) : data?.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No products found.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data?.map((product) => (
              <a
                key={product.id}
                href={`/product/${product.id}`}
                className="block rounded-lg border p-4 hover:shadow-md transition hover:border-emerald-300"
              >
                <div className="aspect-square bg-gray-100 rounded-md mb-3 overflow-hidden">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No image
                    </div>
                  )}
                </div>
                <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                <p className="text-sm text-gray-500 truncate">{product.sellers?.store_name}</p>
                <p className="text-lg font-bold text-emerald-600 mt-1">
                  {formatPrice(product.price_millimes)}
                </p>
              </a>
            ))}
          </div>

          {pagination?.pages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                <a
                  key={p}
                  href={`/shop?${cat ? `category=${cat}&` : ""}page=${p}`}
                  className={`px-3 py-1 rounded ${
                    p === page
                      ? "bg-emerald-600 text-white"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {p}
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

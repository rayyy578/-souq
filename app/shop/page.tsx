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

  return <div>Found {data.length} products. First product: {data[0]?.name}</div>;
}
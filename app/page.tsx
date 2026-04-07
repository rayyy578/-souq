import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/search/search-bar";

export default function HomePage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 to-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to Souq
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Buy and sell products from trusted sellers across Tunisia.
          </p>

          {/* Search bar in hero */}
          <Suspense fallback={<div className="h-10 w-96 bg-gray-100 rounded mx-auto" />}>
            <div className="flex justify-center mb-8">
              <SearchBar />
            </div>
          </Suspense>

          <div className="flex gap-4 justify-center">
            <Button size="lg" href="/shop">Start Shopping</Button>
            <Button size="lg" variant="outline" href="/auth/register">Start Selling</Button>
          </div>
        </div>
      </section>

      {/* Featured categories */}
      <section className="py-16 max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["Electronics", "Fashion", "Home & Garden", "Sports"].map((cat) => (
            <a
              key={cat}
              href={`/search?category=${cat.toLowerCase().replace(/ & /g, "-")}`}
              className="block p-6 rounded-lg border hover:border-emerald-300 hover:shadow-sm transition"
            >
              <h3 className="font-medium text-gray-900">{cat}</h3>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

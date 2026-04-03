import { formatPrice } from "@/lib/utils";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/product/add-to-cart";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/products/${id}`, {
    next: { revalidate: 60 },
  });
  const json = await res.json();

  if (!json.success || !json.data) {
    notFound();
  }

  const product = json.data;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">
                No image
              </div>
            )}
          </div>
          {product.images?.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((img: string, i: number) => (
                <img
                  key={i}
                  src={img}
                  alt={`${product.name} - ${i + 1}`}
                  className="aspect-square object-cover rounded border hover:border-emerald-500 cursor-pointer"
                />
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-sm text-gray-500">
            Sold by: {product.sellers?.store_name}
          </p>
          <p className="text-3xl font-bold text-emerald-600">
            {formatPrice(product.price_millimes)}
          </p>
          <p className="text-gray-600 whitespace-pre-wrap">{product.description}</p>

          <div className="flex items-center gap-2 text-sm">
            <span className={product.stock > 0 ? "text-green-600" : "text-red-600"}>
              {product.stock > 0 ? `In stock (${product.stock})` : "Out of stock"}
            </span>
          </div>

          {product.stock > 0 && (
            <AddToCartButton product={product} />
          )}

          <div className="pt-4 border-t text-sm text-gray-500">
            <p>Category: {product.category.replace(/-/g, " & ").replace(/\b\w/g, (c) => c.toUpperCase())}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

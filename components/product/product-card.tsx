import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

interface ProductCardProps {
  id: string;
  name: string;
  description: string;
  price_millimes: number;
  rating: number;
  images: string[];
  category: string;
}

export function ProductCard({
  id,
  name,
  description,
  price_millimes,
  rating,
  images,
}: ProductCardProps) {
  const thumbnail = images[0];

  return (
    <Link
      href={`/product/${id}`}
      className="group block overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-lg hover:scale-[1.02]"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            No image
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-semibold text-gray-900">{name}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-gray-500">{description}</p>
        <div className="mt-2 flex items-center gap-1">
          <span className="text-xs text-yellow-500">
            {"\u2605".repeat(Math.round(rating))}
            {"\u2606".repeat(5 - Math.round(rating))}
          </span>
          <span className="text-xs text-gray-500">{rating.toFixed(1)}</span>
        </div>
        <p className="mt-2 text-sm font-bold text-emerald-600">
          {formatPrice(price_millimes)}
        </p>
      </div>
    </Link>
  );
}

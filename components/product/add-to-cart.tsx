"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

interface Product {
  id: string;
  name: string;
  price_millimes: number;
  images: string[];
  stock: number;
}

export function AddToCartButton({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find((item: { productId: string }) => item.productId === product.id);

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        productId: product.id,
        name: product.name,
        price_millimes: product.price_millimes,
        image: product.images?.[0] || "",
        quantity,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center border rounded-md">
        <button
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          className="px-3 py-2 hover:bg-gray-100"
        >
          -
        </button>
        <span className="px-4 py-2">{quantity}</span>
        <button
          onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
          className="px-3 py-2 hover:bg-gray-100"
        >
          +
        </button>
      </div>

      <Button onClick={handleAdd} disabled={added}>
        {added ? "Added to cart" : "Add to cart"}
      </Button>
    </div>
  );
}

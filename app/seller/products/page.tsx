"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import { useEffect, useState } from "react";

export default function SellerProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price_millimes: "",
    stock: "",
    category: "",
    images: "",
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setProducts(json.data);
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        price_millimes: parseFloat(form.price_millimes) * 1000,
        stock: parseInt(form.stock) || 0,
        images: form.images ? form.images.split(",").map((s) => s.trim()) : [],
      }),
    });

    const json = await res.json();
    if (json.success) {
      setShowForm(false);
      setForm({ name: "", description: "", price_millimes: "", stock: "", category: "", images: "" });
      loadProducts();
    } else {
      alert(json.error);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    loadProducts();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Products</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Product"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-lg mb-6 space-y-4">
          <Input
            label="Product Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price (TND)"
              type="number"
              step="0.001"
              value={form.price_millimes}
              onChange={(e) => setForm({ ...form, price_millimes: e.target.value })}
              required
            />
            <Input
              label="Stock"
              type="number"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              required
            />
          </div>
          <Input
            label="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            required
          />
          <Input
            label="Image URLs (comma separated)"
            value={form.images}
            onChange={(e) => setForm({ ...form, images: e.target.value })}
            placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg"
          />
          <Button type="submit">Create Product</Button>
        </form>
      )}

      <div className="space-y-3">
        {products.map((product) => (
          <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-gray-500">
                {formatPrice(product.price_millimes)} · Stock: {product.stock}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded ${product.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                {product.is_active ? "Active" : "Inactive"}
              </span>
              <Button variant="outline" size="sm" onClick={() => toggleActive(product.id, product.is_active)}>
                {product.is_active ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

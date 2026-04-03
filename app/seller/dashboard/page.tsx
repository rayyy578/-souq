"use client";

import { formatPrice } from "@/lib/utils";
import { useEffect, useState } from "react";

export default function SellerDashboardPage() {
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0 });

  useEffect(() => {
    fetch("/api/seller/dashboard")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setStats(json.data);
      });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Seller Dashboard</h1>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg border">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {formatPrice(stats.revenue)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg border">
          <p className="text-sm text-gray-500">Orders</p>
          <p className="text-2xl font-bold mt-1">{stats.orders}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border">
          <p className="text-sm text-gray-500">Products</p>
          <p className="text-2xl font-bold mt-1">{stats.products}</p>
        </div>
      </div>

      <div className="flex gap-4">
        <a href="/seller/products" className="text-emerald-600 hover:underline">
          Manage Products →
        </a>
        <a href="/seller/orders" className="text-emerald-600 hover:underline">
          View Orders →
        </a>
      </div>
    </div>
  );
}

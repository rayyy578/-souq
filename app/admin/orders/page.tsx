"use client";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { useEffect, useState } from "react";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = () => {
    fetch("/api/admin/orders")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setOrders(json.data);
      });
  };

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">All Orders</h1>

      <div className="flex gap-2 mb-6">
        {["all", "pending", "paid", "shipped", "delivered", "cancelled", "refunded"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === s ? "bg-emerald-600 text-white" : "bg-gray-100"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((order) => (
          <div key={order.id} className="p-4 border rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium">#{order.id.slice(0, 8)}</span>
                <span className="text-sm text-gray-500 ml-4">
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
              </div>
              <span className="font-bold">{formatPrice(order.total_amount_millimes)}</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Commission: {formatPrice(order.commission_amount_millimes)} · Status: {order.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

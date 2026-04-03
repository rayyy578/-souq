"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    users: 0,
    sellers: 0,
    products: 0,
    orders: 0,
    totalCommission: 0,
  });

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setStats(json.data);
      });
  }, []);

  const cards = [
    { label: "Total Users", value: stats.users },
    { label: "Sellers", value: stats.sellers },
    { label: "Products", value: stats.products },
    { label: "Orders", value: stats.orders },
    { label: "Total Commission Earned", value: formatPrice(stats.totalCommission) },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-white p-6 rounded-lg border">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <a href="/admin/users" className="p-6 border rounded-lg hover:border-emerald-300 transition">
          <h3 className="font-medium">Manage Users</h3>
          <p className="text-sm text-gray-500 mt-1">View users, approve sellers</p>
        </a>
        <a href="/admin/orders" className="p-6 border rounded-lg hover:border-emerald-300 transition">
          <h3 className="font-medium">All Orders</h3>
          <p className="text-sm text-gray-500 mt-1">View all platform orders</p>
        </a>
        <a href="/admin/commissions" className="p-6 border rounded-lg hover:border-emerald-300 transition">
          <h3 className="font-medium">Commissions</h3>
          <p className="text-sm text-gray-500 mt-1">View commission ledger</p>
        </a>
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export default function AdminUsersPage() {
  const [data, setData] = useState({ users: [], sellers: [] });

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
      });
  }, []);

  const approveSeller = async (sellerId: string) => {
    await fetch(`/api/admin/sellers/${sellerId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: true }),
    });
    // Reload
    const r = await fetch("/api/admin/users");
    const json = await r.json();
    if (json.success) setData(json.data);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">User Management</h1>

      {/* Pending Sellers */}
      <h2 className="text-lg font-semibold mb-4">Pending Seller Approvals</h2>
      <div className="space-y-2 mb-8">
        {data.sellers
          .filter((s: any) => !s.approved)
          .map((seller: any) => (
            <div key={seller.id} className="flex justify-between items-center p-4 border rounded">
              <span>{seller.store_name}</span>
              <Button size="sm" onClick={() => approveSeller(seller.id)}>
                Approve
              </Button>
            </div>
          ))}
      </div>

      {/* All Users */}
      <h2 className="text-lg font-semibold mb-4">All Users</h2>
      <div className="space-y-2">
        {data.users.map((user: any) => (
          <div key={user.id} className="flex justify-between items-center p-4 border rounded">
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
              {user.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

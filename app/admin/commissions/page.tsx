"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";

export default function AdminCommissionsPage() {
  const [commissions, setCommissions] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/commissions")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCommissions(json.data);
      });
  }, []);

  const total = commissions.reduce((sum, c) => sum + c.amount_millimes, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Commission Ledger</h1>

      <div className="bg-emerald-50 p-4 rounded-lg mb-6">
        <p className="text-sm text-emerald-800">Total Commission Collected</p>
        <p className="text-2xl font-bold text-emerald-600 mt-1">{formatPrice(total)}</p>
      </div>

      <div className="space-y-3">
        {commissions.map((c) => (
          <div key={c.id} className="flex justify-between items-center p-4 border rounded-lg">
            <div>
              <p className="font-medium">Order #{c.orders?.id?.slice(0, 8) || "N/A"}</p>
              <p className="text-sm text-gray-500">
                {c.sellers?.store_name || "Unknown seller"}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold">{formatPrice(c.amount_millimes)}</p>
              <p className="text-xs text-gray-500">{c.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

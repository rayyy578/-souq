"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import { useEffect, useState } from "react";

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);
  const [tracking, setTracking] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = () => {
    fetch("/api/seller/orders")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setOrders(json.data);
      });
  };

  const handleShip = async (orderId: string) => {
    const res = await fetch(`/api/seller/orders/${orderId}/ship`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackingNumber: tracking }),
    });

    const json = await res.json();
    if (json.success) {
      setShippingOrderId(null);
      setTracking("");
      loadOrders();
    } else {
      alert(json.error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Orders to Fulfill</h1>

      <div className="space-y-3">
        {orders.map((item) => {
          const order = item.orders;
          return (
            <div key={item.id} className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className="text-sm text-gray-500">
                    Order #{order?.id?.slice(0, 8)}
                  </span>
                  <span className="text-sm text-gray-500 ml-4">
                    {order?.created_at ? new Date(order.created_at).toLocaleDateString() : ""}
                  </span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  order?.status === "paid" ? "bg-blue-100 text-blue-800" :
                  order?.status === "shipped" ? "bg-purple-100 text-purple-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {order?.status}
                </span>
              </div>

              <div className="text-sm text-gray-600 mb-3">
                Quantity: {item.quantity} × {formatPrice(item.price_at_purchase_millimes)}
              </div>

              {order?.status === "paid" && shippingOrderId !== order.id && (
                <Button size="sm" onClick={() => setShippingOrderId(order.id)}>
                  Mark as Shipped
                </Button>
              )}

              {shippingOrderId === order.id && (
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Tracking number"
                    value={tracking}
                    onChange={(e) => setTracking(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button size="sm" onClick={() => handleShip(order.id)}>
                    Confirm
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setShippingOrderId(null);
                    setTracking("");
                  }}>
                    Cancel
                  </Button>
                </div>
              )}

              {order?.tracking_number && (
                <p className="text-xs text-gray-500 mt-1">Tracking: {order.tracking_number}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

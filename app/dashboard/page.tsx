import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatPrice } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-red-100 text-red-800",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (
        quantity,
        products (name, images)
      )
    `)
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">My Orders</h1>

      {orders?.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          You haven&apos;t placed any orders yet.
          <a href="/shop" className="text-emerald-600 hover:underline ml-1">
            Start shopping
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {orders?.map((order) => (
            <div key={order.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="text-sm text-gray-500">
                    Order #{order.id.slice(0, 8)}
                  </span>
                  <span className="text-sm text-gray-500 ml-4">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                  {STATUS_LABELS[order.status]}
                </span>
              </div>

              <div className="space-y-2 mb-3">
                {order.order_items?.map((item: { quantity: number; products: { name: string } }) => (
                  <div key={item.products?.name} className="flex justify-between text-sm">
                    <span>{item.products?.name} × {item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-3 border-t">
                <span className="font-bold">
                  {formatPrice(order.total_amount_millimes)}
                </span>
                {order.tracking_number && (
                  <span className="text-sm text-gray-500">
                    Tracking: {order.tracking_number}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: seller } = await supabase
    .from("sellers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!seller) {
    return NextResponse.json(
      { success: false, error: "Seller profile not found" },
      { status: 404 }
    );
  }

  // Products count
  const { count: productCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("seller_id", seller.id);

  // Orders count (via order_items)
  const { count: orderCount } = await supabase
    .from("order_items")
    .select("*", { count: "exact", head: true })
    .eq("seller_id", seller.id);

  // Total revenue
  const { data: revenueData } = await supabase
    .from("order_items")
    .select("price_at_purchase_millimes, quantity")
    .eq("seller_id", seller.id);

  const totalRevenue = revenueData?.reduce(
    (sum, item) => sum + item.price_at_purchase_millimes * item.quantity,
    0
  ) || 0;

  return NextResponse.json({
    success: true,
    data: {
      products: productCount || 0,
      orders: orderCount || 0,
      revenue: totalRevenue,
    },
  });
}

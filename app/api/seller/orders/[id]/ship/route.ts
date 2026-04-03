import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { trackingNumber } = await request.json();

  if (!trackingNumber) {
    return NextResponse.json(
      { success: false, error: "Tracking number is required" },
      { status: 400 }
    );
  }

  // Verify order belongs to one of seller's order_items
  const { data: { user: userData } } = await supabase.auth.getUser();
  const { data: seller } = await supabase
    .from("sellers")
    .select("id")
    .eq("user_id", userData!.id)
    .single();

  if (!seller) {
    return NextResponse.json({ success: false, error: "Seller profile not found" }, { status: 403 });
  }

  // Check if this order has items from this seller
  const { data: orderItem } = await supabase
    .from("order_items")
    .select("id")
    .eq("order_id", id)
    .eq("seller_id", seller.id)
    .limit(1)
    .maybeSingle();

  if (!orderItem) {
    return NextResponse.json({ success: false, error: "Order not found or not associated with your store" }, { status: 404 });
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "shipped", tracking_number: trackingNumber })
    .eq("id", id)
    .in("status", ["paid", "shipped"]);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

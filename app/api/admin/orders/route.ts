// @ts-nocheck
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (quantity, price_at_purchase_millimes)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createAdminClient();

  const { count: userCount } = await supabase.from("users").select("*", { count: "exact", head: true });
  const { count: sellerCount } = await supabase.from("sellers").select("*", { count: "exact", head: true });
  const { count: productCount } = await supabase.from("products").select("*", { count: "exact", head: true });
  const { count: orderCount } = await supabase.from("orders").select("*", { count: "exact", head: true });

  const { data: commissionData } = await supabase
    .from("commissions")
    .select("amount_millimes");

  const totalCommission = commissionData?.reduce(
    (sum, c) => sum + c.amount_millimes, 0
  ) || 0;

  return NextResponse.json({
    success: true,
    data: {
      users: userCount || 0,
      sellers: sellerCount || 0,
      products: productCount || 0,
      orders: orderCount || 0,
      totalCommission,
    },
  });
}

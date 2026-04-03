import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("commissions")
    .select(`
      *,
      orders (id, status),
      sellers (store_name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

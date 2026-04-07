import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createAdminClient();
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const offset = (page - 1) * limit;

  let query = supabase
    .from("products")
    .select(`*, sellers!inner(store_name, approved)`, { count: "exact" })
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) {
    query = query.eq("category", category);
  }

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data,
    pagination: {
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Get seller record
  const { data: seller } = await supabase
    .from("sellers")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!seller) {
    return NextResponse.json(
      { success: false, error: "Seller profile not found" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name, description, price_millimes, stock, category, images } = body;

  if (!name || !description || !price_millimes || !category) {
    return NextResponse.json(
      { success: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (price_millimes < 0) {
    return NextResponse.json(
      { success: false, error: "Price must be positive" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      seller_id: seller.id,
      name,
      description,
      price_millimes,
      stock: stock || 0,
      category,
      images: images || [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}

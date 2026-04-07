import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log("Fetching product:", id);

  // First try without join
  const supabase = await createAdminClient();
  const { data: rawProduct, error: rawError } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  console.log("Raw product result:", JSON.stringify(rawProduct));
  console.log("Raw product error:", rawError);

  if (rawError || !rawProduct) {
    return NextResponse.json(
      { success: false, error: "Product not found", details: rawError },
      { status: 404 }
    );
  }

  // Get seller separately
  const { data: seller, error: sellerError } = await supabase
    .from("sellers")
    .select("store_name, description, user_id")
    .eq("id", rawProduct.seller_id)
    .single();

  console.log("Seller result:", JSON.stringify(seller));
  console.log("Seller error:", sellerError);

  const product = {
    ...rawProduct,
    sellers: seller,
  };

  return NextResponse.json({ success: true, data: product });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    return NextResponse.json({ success: false, error: "Seller profile not found" }, { status: 403 });
  }

  // Verify product belongs to this seller
  const { data: existing } = await supabase
    .from("products")
    .select("seller_id")
    .eq("id", id)
    .eq("seller_id", seller.id)
    .single();

  if (!existing) {
    return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
  }

  const body = await request.json();
  const { data, error } = await supabase
    .from("products")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    return NextResponse.json({ success: false, error: "Seller profile not found" }, { status: 403 });
  }

  // Soft delete: set is_active = false
  const { error } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("id", id)
    .eq("seller_id", seller.id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

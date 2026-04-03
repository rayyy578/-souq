import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { stripe, COMMISSION_RATE } from "@/lib/stripe";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { items, shippingAddress } = await request.json();

  if (!items?.length || !shippingAddress) {
    return NextResponse.json(
      { success: false, error: "Missing items or shipping address" },
      { status: 400 }
    );
  }

  // Group items by seller
  const itemsBySeller: Record<string, { productId: string; quantity: number; price_millimes: number }[]> = {};

  for (const item of items) {
    // Fetch product to get seller_id
    const { data: product } = await supabase
      .from("products")
      .select("seller_id")
      .eq("id", item.productId)
      .single();

    if (!product) continue;

    if (!itemsBySeller[product.seller_id]) {
      itemsBySeller[product.seller_id] = [];
    }
    itemsBySeller[product.seller_id].push(item);
  }

  const sellerIds = Object.keys(itemsBySeller);
  if (sellerIds.length === 0) {
    return NextResponse.json(
      { success: false, error: "No valid items in cart" },
      { status: 400 }
    );
  }

  // Fetch seller Stripe account IDs
  const { data: sellers } = await supabase
    .from("sellers")
    .select("id, stripe_account_id")
    .in("id", sellerIds);

  if (!sellers?.length) {
    return NextResponse.json(
      { success: false, error: "Seller information not found" },
      { status: 500 }
    );
  }

  // For simplicity, create one payment intent per seller
  const paymentIntents: { sellerId: string; paymentIntentId: string }[] = [];

  for (const seller of sellers) {
    if (!seller.stripe_account_id) {
      return NextResponse.json(
        { success: false, error: `Seller not connected to Stripe. Please contact seller.` },
        { status: 400 }
      );
    }

    const sellerItems = itemsBySeller[seller.id];
    const total = sellerItems.reduce(
      (sum, item) => sum + item.price_millimes * item.quantity,
      0
    );
    const commission = Math.round(total * COMMISSION_RATE);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: "tnd",
      payment_method_types: ["card"],
      application_fee_amount: commission,
      transfer_data: {
        destination: seller.stripe_account_id,
      },
      metadata: {
        buyerId: user.id,
        sellerId: seller.id,
        items: JSON.stringify(sellerItems),
        shippingAddress: JSON.stringify(shippingAddress),
      },
    });

    paymentIntents.push({ sellerId: seller.id, paymentIntentId: paymentIntent.id });
  }

  return NextResponse.json({
    success: true,
    paymentIntents,
    clientSecrets: paymentIntents.map((pi) => pi.paymentIntentId),
  });
}

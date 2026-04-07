// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = await createAdminClient();

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as any;
    const { buyerId, sellerId, items, shippingAddress } = paymentIntent.metadata;
    const parsedItems = JSON.parse(items);

    // Create order
    const { data: order } = await supabase
      .from("orders")
      .insert({
        buyer_id: buyerId,
        stripe_payment_intent_id: paymentIntent.id,
        total_amount_millimes: paymentIntent.amount,
        commission_amount_millimes: paymentIntent.application_fee_amount || 0,
        status: "paid",
        shipping_address: shippingAddress ? JSON.parse(shippingAddress) : {},
      })
      .select()
      .single();

    if (order) {
      for (const item of parsedItems) {
        await supabase.from("order_items").insert({
          order_id: order.id,
          product_id: item.productId,
          seller_id: sellerId,
          quantity: item.quantity,
          price_at_purchase_millimes: item.price_millimes,
        });

        // Decrement stock
        await supabase.rpc("decrement_stock", {
          product_id: item.productId,
          qty: item.quantity,
        });

        // Create commission record
        await supabase.from("commissions").insert({
          order_id: order.id,
          seller_id: sellerId,
          amount_millimes: Math.round(item.price_millimes * item.quantity * 0.05),
          status: "collected",
        });
      }
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as any;
    console.error("Payment failed", paymentIntent.id);
  }

  return NextResponse.json({ received: true });
}

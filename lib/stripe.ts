import Stripe from "stripe";

export const COMMISSION_RATE = 0.05; // 5%

const stripeKey = process.env.STRIPE_SECRET_KEY;

export function stripe() {
  if (!stripeKey) {
    throw new Error("STRIPE_SECRET_KEY is not set in environment variables.");
  }
  return new Stripe(stripeKey, {
    apiVersion: "2025-02-24.clover",
    typescript: true,
  });
}

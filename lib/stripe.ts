import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.clover",
  typescript: true,
});

export const COMMISSION_RATE = 0.05; // 5%

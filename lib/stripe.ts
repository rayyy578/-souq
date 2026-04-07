import Stripe from "stripe";

export const COMMISSION_RATE = 0.05; // 5%

const stripeKey = process.env.STRIPE_SECRET_KEY;

let _stripe: Stripe | null = null;

export function stripe() {
  if (!stripeKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env.local or skip the checkout flow."
    );
  }

  if (!_stripe) {
    _stripe = new Stripe(stripeKey, {
      apiVersion: "2025-02-24.clover",
      typescript: true,
    });
  }

  return _stripe;
}

// For backward compat: lazy export
export { _stripe as stripe };

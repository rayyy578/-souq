"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CartItem {
  productId: string;
  name: string;
  price_millimes: number;
  image: string;
  quantity: number;
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");

  useEffect(() => {
    const items = JSON.parse(localStorage.getItem("cart") || "[]");
    setCart(items);
  }, []);

  const total = cart.reduce(
    (sum, item) => sum + item.price_millimes * item.quantity,
    0
  );

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const shippingAddress = { name, address, city, postalCode };

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart, shippingAddress }),
    });

    const json = await res.json();
    setLoading(false);

    if (!json.success) {
      alert(json.error);
      return;
    }

    setClientSecret(json.clientSecrets[0]);
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Your cart is empty.</p>
      </div>
    );
  }

  if (clientSecret) {
    return (
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <PaymentForm />
      </Elements>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <form onSubmit={handleCreatePayment} className="space-y-4">
          <h2 className="text-lg font-semibold">Shipping Address</h2>

          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
          <Input
            label="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
          <Input
            label="Postal Code"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            required
          />

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Processing..." : "Continue to Payment"}
          </Button>
        </form>

        <div className="bg-gray-50 p-6 rounded-lg h-fit">
          <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
          {cart.map((item) => (
            <div key={item.productId} className="flex justify-between py-2">
              <span>{item.name} x {item.quantity}</span>
              <span>{formatPrice(item.price_millimes * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t mt-4 pt-4 flex justify-between font-bold">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
    });

    setLoading(false);

    if (error) {
      alert(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto py-8">
      <h2 className="text-xl font-bold mb-4">Payment</h2>
      <PaymentElement />
      <Button type="submit" disabled={loading || !stripe} className="w-full mt-4">
        {loading ? "Processing..." : "Pay Now"}
      </Button>
    </form>
  );
}

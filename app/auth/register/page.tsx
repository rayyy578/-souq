"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = registerSchema.safeParse({ name, email, password });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.user) {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
            <p className="mt-4 text-sm text-gray-600">
              We&apos;ve sent a confirmation link to <strong>{email}</strong>.
              Please click the link to verify your email before signing in.
            </p>
            <div className="mt-6 space-y-3">
              <a
                href="/auth/login"
                className="block px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
              >
                Go to login
              </a>
              <button
                onClick={() => setSent(false)}
                className="text-sm text-emerald-600 hover:underline"
              >
                Didn&apos;t receive it? Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Create an account</h1>
          <p className="mt-2 text-sm text-gray-600">
            Already have an account?{" "}
            <a href="/auth/login" className="text-emerald-600 hover:underline">
              Sign in
            </a>
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 bg-white p-6 rounded-lg shadow">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>
          )}

          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              I want to
            </label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="buyer"
                  checked={role === "buyer"}
                  onChange={(e) => setRole(e.target.value as "buyer" | "seller")}
                  className="text-emerald-600"
                />
                <span className="text-sm">Buy products</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="seller"
                  checked={role === "seller"}
                  onChange={(e) => setRole(e.target.value as "buyer" | "seller")}
                  className="text-emerald-600"
                />
                <span className="text-sm">Sell products</span>
              </label>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>
      </div>
    </div>
  );
}

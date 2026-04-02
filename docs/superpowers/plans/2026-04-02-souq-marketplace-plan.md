# Souq Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-vendor marketplace platform in TND where buyers browse and purchase products, sellers manage their stores, and the platform takes a 5% commission per sale.

**Architecture:** Next.js App Router with React Server Components, Supabase (Postgres + Auth + Storage), Stripe Connect for split payments.

**Tech Stack:** Next.js, TypeScript, TailwindCSS, Supabase, Stripe Connect, Playwright (E2E).

**Plan Structure:**

| Phase | Focus | Output |
|-------|-------|--------|
| Phase 1 | Project setup + Auth | Scaffolding, DB schema, login, signup |
| Phase 2 | Product catalog + Cart | Public product pages, browsing, cart management |
| Phase 3 | Checkout + Stripe + Orders | Payment processing, order tracking, shipping |
| Phase 4 | Seller dashboard + Admin | Seller tools, admin panel, commissions |

---

## Phase 1: Project Setup + Auth

### Task 1.1: Project Scaffolding

**Files:**
- Create: `/home/rayen/souq/package.json`
- Create: `/home/rayen/souq/tsconfig.json`
- Create: `/home/rayen/souq/next.config.ts`
- Create: `/home/rayen/souq/tailwind.config.ts`
- Create: `/home/rayen/souq/postcss.config.mjs`
- Create: `/home/rayen/souq/app/layout.tsx`

- [ ] **Step 1: Initialize Next.js project**

Run in `/home/rayen/souq/`:

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias="@/*" --turbopack --eslint --use-pnpm
```

Expected: Project scaffolded with Next.js, TypeScript, TailwindCSS, App Router.

- [ ] **Step 2: Install additional dependencies**

```bash
cd /home/rayen/souq && pnpm add @supabase/supabase-js @supabase/ssr @stripe/stripe-js stripe sonner clsx tailwind-merge lucide-react react-hook-form @hookform/resolvers zod
```

Expected: All dependencies installed.

- [ ] **Step 3: Add environment variable template**

Create `.env.example`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

Run:

```bash
cp .env.example .env.local
```

- [ ] **Step 4: Verify build passes**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: scaffold Next.js project with dependencies"
```

---

### Task 1.2: Database Migration + Supabase Setup

**Files:**
- Create: `db/001-initial-schema.sql`
- Create: `db/002-rls-policies.sql`

- [ ] **Step 1: Write schema migration**

Create `db/001-initial-schema.sql`:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  role text not null default 'buyer' check (role in ('buyer', 'seller', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sellers table
create table sellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references users(id) on delete cascade not null,
  stripe_account_id text unique,
  store_name text not null,
  description text,
  approved boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Products table
create table products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references sellers(id) on delete cascade not null,
  name text not null,
  description text not null,
  price_millimes bigint not null,
  images text[] default '{}',
  stock integer not null default 0,
  category text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Orders table
create table orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references users(id) on delete set null not null,
  stripe_payment_intent_id text unique,
  total_amount_millimes bigint not null,
  commission_amount_millimes bigint not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded')),
  shipping_address jsonb not null,
  tracking_number text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Order items table
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade not null,
  product_id uuid references products(id) not null,
  seller_id uuid references sellers(id) not null,
  quantity integer not null,
  price_at_purchase_millimes bigint not null
);

-- Commissions table
create table commissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade not null,
  seller_id uuid references sellers(id) on delete cascade not null,
  amount_millimes bigint not null,
  status text not null default 'pending' check (status in ('pending', 'collected', 'paid_out')),
  created_at timestamptz default now()
);

-- Indexes
create index idx_products_seller on products(seller_id);
create index idx_products_active on products(is_active);
create index idx_products_category on products(category);
create index idx_orders_buyer on orders(buyer_id);
create index idx_orders_status on orders(status);
create index idx_order_items_order on order_items(order_id);
create index idx_order_items_seller on order_items(seller_id);
create index idx_commissions_order on commissions(order_id);
```

- [ ] **Step 2: Write Row Level Security policies**

Create `db/002-rls-policies.sql`:

```sql
-- Users: users can view their own profile
alter table users enable row level security;

create policy "Users can view own profile"
  on users for select
  using (auth.uid()::uuid = id);

create policy "Users can update own profile"
  on users for update
  using (auth.uid()::uuid = id)
  with check (auth.uid()::uuid = id);

-- Sellers: anyone can view approved sellers, sellers can update own
alter table sellers enable row level security;

create policy "Anyone can view approved sellers"
  on sellers for select
  using (approved = true);

create policy "Sellers can update own"
  on sellers for update
  using (user_id = auth.uid()::uuid);

-- Products: anyone can view active products, sellers manage own
alter table products enable row level security;

create policy "Anyone can view active products"
  on products for select
  using (is_active = true);

create policy "Sellers can manage own products"
  on products for all
  using (
    seller_id in (
      select id from sellers where user_id = auth.uid()::uuid
    )
  );

-- Orders: buyers see their own, sellers see orders with their products, admin sees all
alter table orders enable row level security;

create policy "Buyers see own orders"
  on orders for select
  using (buyer_id = auth.uid()::uuid);

create policy "Sellers see orders with their products"
  on orders for select
  using (
    id in (
      select order_id from order_items where seller_id in (
        select id from sellers where user_id = auth.uid()::uuid
      )
    )
  );

create policy "Admin sees all orders"
  on orders for select
  using (
    exists (select 1 from users where id = auth.uid()::uuid and role = 'admin')
  );

create policy "Buyers can create orders"
  on orders for insert
  with check (buyer_id = auth.uid()::uuid);

-- Order items: sellers see their items, buyers see items from their orders
alter table order_items enable row level security;

create policy "Buyers see items from their orders"
  on order_items for select
  using (
    order_id in (select id from orders where buyer_id = auth.uid()::uuid)
  );

create policy "Sellers see their order items"
  on order_items for select
  using (
    seller_id in (
      select id from sellers where user_id = auth.uid()::uuid
    )
  );

create policy "System can create order items"
  on order_items for insert
  with check (true);

-- Commissions: sellers see own, admin sees all
alter table commissions enable row level security;

create policy "Sellers see own commissions"
  on commissions for select
  using (
    seller_id in (
      select id from sellers where user_id = auth.uid()::uuid
    )
  );

create policy "Admin sees all commissions"
  on commissions for select
  using (
    exists (select 1 from users where id = auth.uid()::uuid and role = 'admin')
  );
```

- [ ] **Step 3: Commit**

```bash
git add db/ && git commit -m "feat: add database schema and RLS policies"
```

---

### Task 1.3: Supabase Client Setup

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`

- [ ] **Step 1: Write Supabase client utilities**

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/lib/supabase/database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/lib/supabase/database.types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // In route handlers, cookies can't be set
            }
          }
        },
      },
    }
  );
}

export async function createAdminClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );
}
```

Create `lib/supabase/middleware.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}
```

- [ ] **Step 2: Create middleware**

Create `middleware.ts`:

```typescript
import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/ middleware.ts && git commit -m "feat: add Supabase client and middleware"
```

---

### Task 1.4: Auth Pages + Auth Flow

**Files:**
- Create: `app/auth/login/page.tsx`
- Create: `app/auth/register/page.tsx`
- Create: `lib/utils.ts`
- Create: `components/ui/input.tsx`
- Create: `components/ui/button.tsx`

- [ ] **Step 1: Create shared UI components**

Create `lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(millimes: number): string {
  const dinars = millimes / 1000;
  return `${dinars.toFixed(3)} TND`;
}

export function calculateCommission(amount: number): number {
  return Math.round(amount * 0.05);
}
```

Create `components/ui/button.tsx`:

```typescript
import { cn } from "@/lib/utils";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        {
          "bg-emerald-600 text-white hover:bg-emerald-700": variant === "primary",
          "bg-gray-100 text-gray-900 hover:bg-gray-200": variant === "secondary",
          "border border-gray-300 bg-transparent hover:bg-gray-100": variant === "outline",
          "hover:bg-gray-100": variant === "ghost",
          "h-8 px-3 text-sm": size === "sm",
          "h-10 px-4": size === "md",
          "h-12 px-6 text-lg": size === "lg",
        },
        className
      )}
      {...props}
    />
  );
}
```

Create `components/ui/input.tsx`:

```typescript
import { cn } from "@/lib/utils";
import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export function Input({ className, error, label, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        className={cn(
          "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500",
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write login page**

Create `app/auth/login/page.tsx`:

```typescript
"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/shop");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Sign in to Souq</h1>
          <p className="mt-2 text-sm text-gray-600">
            Don't have an account?{" "}
            <a href="/auth/register" className="text-emerald-600 hover:underline">
              Sign up
            </a>
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 bg-white p-6 rounded-lg shadow">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>
          )}

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

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write register page**

Create `app/auth/register/page.tsx`:

```typescript
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
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = registerSchema.safeParse({ name, email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
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
      // Note: In production, use a Supabase trigger to sync auth.users → users table
      router.push("/auth/login");
    }
  };

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
```

- [ ] **Step 4: Commit**

```bash
git add components/ lib/utils.ts app/auth/ && git commit -m "feat: add auth pages with login and register"
```

---

### Task 1.5: Global Layout + Navigation

**Files:**
- Create: `app/layout.tsx`
- Create: `components/layout/header.tsx`
- Create: `components/layout/footer.tsx`
- Create: `app/page.tsx`

- [ ] **Step 1: Write root layout**

Update `app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Souq - Marketplace",
  description: "Buy and sell products on Souq",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="border-b bg-white">
      <nav className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <a href="/" className="text-xl font-bold text-emerald-600">
            Souq
          </a>
          <a href="/shop" className="text-sm text-gray-600 hover:text-gray-900">
            Shop
          </a>
        </div>

        <div className="flex items-center gap-4">
          <a href="/cart" className="text-sm text-gray-600 hover:text-gray-900">
            Cart
          </a>
          {user ? (
            <>
              <a href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
                Orders
              </a>
              <a href="/seller/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
                Seller
              </a>
              <form action="/auth/signout" method="post">
                <button type="submit" className="text-sm text-gray-600 hover:text-gray-900">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <a href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900">
              Sign in
            </a>
          )}
        </div>
      </nav>
    </header>
  );
}

async function Footer() {
  return (
    <footer className="border-t bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-600">
        &copy; {new Date().getFullYear()} Souq. All rights reserved.
      </div>
    </footer>
  );
}
```

Note: `Header` and `Footer` are now Server Components — `createClient()` from `server.ts` will be imported.

- [ ] **Step 2: Write landing page**

Create `app/page.tsx`:

```typescript
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 to-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to Souq
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Buy and sell products from trusted sellers across Tunisia.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <a href="/shop">Start Shopping</a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="/auth/register">Start Selling</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured categories */}
      <section className="py-16 max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["Electronics", "Fashion", "Home & Garden", "Sports"].map((cat) => (
            <a
              key={cat}
              href={`/shop?category=${cat.toLowerCase().replace(/ & /g, "-")}`}
              className="block p-6 rounded-lg border hover:border-emerald-300 hover:shadow-sm transition"
            >
              <h3 className="font-medium text-gray-900">{cat}</h3>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Fix layout — import createClient from server, add signout route**

Create `app/auth/signout/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
}
```

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/layout.tsx app/auth/signout/ && git commit -m "feat: add landing page, layout, header, footer, signout"
```

---

## Phase 2: Product Catalog + Cart

### Task 2.1: Database Types

**Files:**
- Create: `lib/supabase/database.types.ts`

- [ ] **Step 1: Generate database types**

After running SQL migrations in Supabase, run:

```bash
cd /home/rayen/souq && npx supabase gen types typescript --project-id <project-id> > lib/supabase/database.types.ts
```

For now, create a manual types file:

Create `lib/supabase/database.types.ts`:

```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: "buyer" | "seller" | "admin";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          role?: "buyer" | "seller" | "admin";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?: "buyer" | "seller" | "admin";
          created_at?: string;
          updated_at?: string;
        };
      };
      sellers: {
        Row: {
          id: string;
          user_id: string;
          stripe_account_id: string | null;
          store_name: string;
          description: string | null;
          approved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_account_id?: string | null;
          store_name: string;
          description?: string | null;
          approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_account_id?: string | null;
          store_name?: string;
          description?: string | null;
          approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          seller_id: string;
          name: string;
          description: string;
          price_millimes: number;
          images: string[];
          stock: number;
          category: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          name: string;
          description: string;
          price_millimes: number;
          images?: string[];
          stock?: number;
          category: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          name?: string;
          description?: string;
          price_millimes?: number;
          images?: string[];
          stock?: number;
          category?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          buyer_id: string;
          stripe_payment_intent_id: string | null;
          total_amount_millimes: number;
          commission_amount_millimes: number;
          status: "pending" | "paid" | "shipped" | "delivered" | "cancelled" | "refunded";
          shipping_address: Json;
          tracking_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          stripe_payment_intent_id?: string | null;
          total_amount_millimes: number;
          commission_amount_millimes: number;
          status?: "pending" | "paid" | "shipped" | "delivered" | "cancelled" | "refunded";
          shipping_address: Json;
          tracking_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          buyer_id?: string;
          stripe_payment_intent_id?: string | null;
          total_amount_millimes?: number;
          commission_amount_millimes?: number;
          status?: "pending" | "paid" | "shipped" | "delivered" | "cancelled" | "refunded";
          shipping_address?: Json;
          tracking_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          seller_id: string;
          quantity: number;
          price_at_purchase_millimes: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          seller_id: string;
          quantity: number;
          price_at_purchase_millimes: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          seller_id?: string;
          quantity?: number;
          price_at_purchase_millimes?: number;
        };
      };
      commissions: {
        Row: {
          id: string;
          order_id: string;
          seller_id: string;
          amount_millimes: number;
          status: "pending" | "collected" | "paid_out";
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          seller_id: string;
          amount_millimes: number;
          status?: "pending" | "collected" | "paid_out";
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          seller_id?: string;
          amount_millimes?: number;
          status?: "pending" | "collected" | "paid_out";
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/supabase/database.types.ts && git commit -m "feat: add database types"
```

---

### Task 2.2: Products API

**Files:**
- Create: `app/api/products/route.ts`
- Create: `app/api/products/[id]/route.ts`
- Test: `__tests__/products-api.test.ts`

- [ ] **Step 1: Write products list API**

Create `app/api/products/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { calculateCommission } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const offset = (page - 1) * limit;

  let query = supabase
    .from("products")
    .select(`*, sellers(store_name, approved)`, { count: "exact" })
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
```

- [ ] **Step 2: Write single product API**

Append to `app/api/products/[id]/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(`*, sellers(store_name, description as store_description, user_id)`)
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: "Product not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data });
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
```

- [ ] **Step 3: Commit**

```bash
git add app/api/products/ && git commit -m "feat: add products API endpoints"
```

---

### Task 2.3: Product Pages (Public)

**Files:**
- Create: `app/shop/page.tsx`
- Create: `app/product/[id]/page.tsx`

- [ ] **Step 1: Write shop listing page**

Create `app/shop/page.tsx`:

```typescript
import { formatPrice } from "@/lib/utils";

const CATEGORIES = [
  "electronics",
  "fashion",
  "home-garden",
  "sports",
  "books",
  "toys",
  "automotive",
  "other",
];

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const cat = params.category;
  const search = params.search;
  const page = parseInt(params.page || "1");
  const limit = 20;

  const url = new URL(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/products`);
  if (cat) url.searchParams.set("category", cat);
  if (search) url.searchParams.set("search", search);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 },
  });
  const json = await res.json();
  const { data, pagination } = json;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {cat ? `${cat.replace("-", " & ").replace(/\b\w/g, (c) => c.toUpperCase())} Category` : "All Products"}
        </h1>

        <form className="flex gap-2 mb-4" action="/shop" method="GET">
          <input
            type="text"
            name="search"
            placeholder="Search products..."
            defaultValue={search || ""}
            className="flex-1 max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm hover:bg-emerald-700"
          >
            Search
          </button>
        </form>

        <div className="flex gap-2 flex-wrap">
          <a
            href="/shop"
            className={`px-3 py-1 rounded-full text-sm border ${
              !cat ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "hover:bg-gray-100"
            }`}
          >
            All
          </a>
          {CATEGORIES.map((c) => (
            <a
              key={c}
              href={`/shop?category=${c}`}
              className={`px-3 py-1 rounded-full text-sm border ${
                cat === c ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "hover:bg-gray-100"
              }`}
            >
              {c.replace("-", " & ").replace(/\b\w/g, (ch) => ch.toUpperCase())}
            </a>
          ))}
        </div>
      </div>

      {data?.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No products found.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data?.map((product: { id: string; name: string; description: string; price_millimes: number; images: string[]; sellers: { store_name: string } }) => (
              <a
                key={product.id}
                href={`/product/${product.id}`}
                className="block rounded-lg border p-4 hover:shadow-md transition hover:border-emerald-300"
              >
                <div className="aspect-square bg-gray-100 rounded-md mb-3 overflow-hidden">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No image
                    </div>
                  )}
                </div>
                <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                <p className="text-sm text-gray-500 truncate">{product.sellers?.store_name}</p>
                <p className="text-lg font-bold text-emerald-600 mt-1">
                  {formatPrice(product.price_millimes)}
                </p>
              </a>
            ))}
          </div>

          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                <a
                  key={p}
                  href={`/shop?${cat ? `category=${cat}&` : ""}page=${p}`}
                  className={`px-3 py-1 rounded ${
                    p === page
                      ? "bg-emerald-600 text-white"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {p}
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write product detail page**

Create `app/product/[id]/page.tsx`:

```typescript
import { formatPrice } from "@/lib/utils";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/product/add-to-cart";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/products/${id}`, {
    next: { revalidate: 60 },
  });
  const json = await res.json();

  if (!json.success || !json.data) {
    notFound();
  }

  const product = json.data;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">
                No image
              </div>
            )}
          </div>
          {product.images?.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((img: string, i: number) => (
                <img
                  key={i}
                  src={img}
                  alt={`${product.name} - ${i + 1}`}
                  className="aspect-square object-cover rounded border hover:border-emerald-500 cursor-pointer"
                />
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-sm text-gray-500">
            Sold by: {product.sellers?.store_name}
          </p>
          <p className="text-3xl font-bold text-emerald-600">
            {formatPrice(product.price_millimes)}
          </p>
          <p className="text-gray-600 whitespace-pre-wrap">{product.description}</p>

          <div className="flex items-center gap-2 text-sm">
            <span className={product.stock > 0 ? "text-green-600" : "text-red-600"}>
              {product.stock > 0 ? `In stock (${product.stock})` : "Out of stock"}
            </span>
          </div>

          {product.stock > 0 && (
            <AddToCartButton product={product} />
          )}

          <div className="pt-4 border-t text-sm text-gray-500">
            <p>Category: {product.category.replace(/-/g, " & ").replace(/\b\w/g, (c) => c.toUpperCase())}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write AddToCart component**

Create `components/product/add-to-cart.tsx`:

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

interface Product {
  id: string;
  name: string;
  price_millimes: number;
  images: string[];
  stock: number;
}

export function AddToCartButton({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find((item: { productId: string }) => item.productId === product.id);

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        productId: product.id,
        name: product.name,
        price_millimes: product.price_millimes,
        image: product.images?.[0] || "",
        quantity,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center border rounded-md">
        <button
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          className="px-3 py-2 hover:bg-gray-100"
        >
          -
        </button>
        <span className="px-4 py-2">{quantity}</span>
        <button
          onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
          className="px-3 py-2 hover:bg-gray-100"
        >
          +
        </button>
      </div>

      <Button onClick={handleAdd} disabled={added}>
        {added ? "Added to cart" : "Add to cart"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/shop/ app/product/ components/product/ && git commit -m "feat: add product listing and detail pages with cart"
```

---

### Task 2.4: Cart Page

**Files:**
- Create: `app/cart/page.tsx`

- [ ] **Step 1: Write cart page**

Create `app/cart/page.tsx`:

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { useState, useEffect } from "react";
import Link from "next/link";

interface CartItem {
  productId: string;
  name: string;
  price_millimes: number;
  image: string;
  quantity: number;
}

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    setCart(JSON.parse(localStorage.getItem("cart") || "[]"));
  }, []);

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      const newCart = cart.filter((item) => item.productId !== id);
      setCart(newCart);
      localStorage.setItem("cart", JSON.stringify(newCart));
      return;
    }
    const newCart = cart.map((item) =>
      item.productId === id ? { ...item, quantity: qty } : item
    );
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  const total = cart.reduce(
    (sum, item) => sum + item.price_millimes * item.quantity,
    0
  );

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
        <Link href="/shop">
          <Button>Start Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          {cart.map((item) => (
            <div key={item.productId} className="flex gap-4 p-4 border rounded-lg">
              <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{item.name}</h3>
                <p className="text-emerald-600 font-bold">{formatPrice(item.price_millimes)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="w-8 h-8 border rounded hover:bg-gray-100"
                  >
                    -
                  </button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="w-8 h-8 border rounded hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatPrice(item.price_millimes * item.quantity)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 p-6 rounded-lg h-fit">
          <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Subtotal</span>
            <span>{formatPrice(total)}</span>
          </div>
          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
          <Link href="/checkout" className="block mt-4">
            <Button className="w-full" size="lg">
              Proceed to Checkout
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/cart/ && git commit -m "feat: add cart page with quantity controls"
```

---

## Phase 3: Checkout + Stripe + Orders

### Task 3.1: Stripe API Routes

**Files:**
- Create: `lib/stripe.ts`
- Create: `app/api/checkout/route.ts`
- Create: `app/api/webhooks/stripe/route.ts`
- Create: `app/api/orders/route.ts`

- [ ] **Step 1: Stripe configuration**

Create `lib/stripe.ts`:

```typescript
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.clover",
  typescript: true,
});

export const COMMISSION_RATE = 0.05; // 5%
```

- [ ] **Step 2: Checkout API**

Create `app/api/checkout/route.ts`:

```typescript
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
  // In production, use PaymentIntents with sub-transfers
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
```

- [ ] **Step 3: Stripe Webhook Handler**

Create `app/api/webhooks/stripe/route.ts`:

```typescript
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
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const { buyerId, sellerId, items } = paymentIntent.metadata;
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
        shipping_address: paymentIntent.metadata.shippingAddress
          ? JSON.parse(paymentIntent.metadata.shippingAddress)
          : {},
      })
      .select()
      .single();

    if (order) {
      // Create order items and decrement stock
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
          amount_millimes: Math.round(
            item.price_millimes * item.quantity * 0.05
          ),
          status: "collected",
        });
      }
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    // Log failed payment for manual review
    console.error("Payment failed", event.data.object.id);
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 4: Add SQL function for stock decrement**

Append to `db/002-rls-policies.sql` (before the RLS policies section, or create `db/003-functions.sql`):

```sql
-- Function to decrement product stock
create or replace function decrement_stock(product_id uuid, qty integer)
returns void as $$
  update products set stock = stock - qty where id = product_id and stock >= qty;
$$ language sql;
```

- [ ] **Step 5: Orders API for buyer dashboard**

Create `app/api/orders/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (
        *,
        products (name, images)
      )
    `)
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/stripe.ts app/api/checkout/ app/api/webhooks/ app/api/orders/ db/ && git commit -m "feat: add Stripe checkout, webhook handler, orders API"
```

---

### Task 3.2: Checkout Page

**Files:**
- Create: `app/checkout/page.tsx`

- [ ] **Step 1: Write checkout page**

Create `app/checkout/page.tsx`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add app/checkout/page.tsx && git commit -m "feat: add checkout page with Stripe Elements"
```

---

### Task 3.3: Buyer Dashboard

**Files:**
- Create: `app/dashboard/page.tsx`

- [ ] **Step 1: Write buyer dashboard**

Create `app/dashboard/page.tsx`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatPrice } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-red-100 text-red-800",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (
        quantity,
        products (name, images)
      )
    `)
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">My Orders</h1>

      {orders?.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          You haven't placed any orders yet.
          <a href="/shop" className="text-emerald-600 hover:underline ml-1">
            Start shopping
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {orders?.map((order) => (
            <div key={order.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="text-sm text-gray-500">
                    Order #{order.id.slice(0, 8)}
                  </span>
                  <span className="text-sm text-gray-500 ml-4">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                  {STATUS_LABELS[order.status]}
                </span>
              </div>

              <div className="space-y-2 mb-3">
                {order.order_items?.map((item: { quantity: number; products: { name: string } }) => (
                  <div key={item.products?.name} className="flex justify-between text-sm">
                    <span>{item.products?.name} × {item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-3 border-t">
                <span className="font-bold">
                  {formatPrice(order.total_amount_millimes)}
                </span>
                {order.tracking_number && (
                  <span className="text-sm text-gray-500">
                    Tracking: {order.tracking_number}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/ && git commit -m "feat: add buyer dashboard with order history"
```

---

## Phase 4: Seller Dashboard + Admin Panel

### Task 4.1: Seller Dashboard

**Files:**
- Create: `app/seller/dashboard/page.tsx`
- Create: `app/seller/products/page.tsx`
- Create: `app/seller/orders/page.tsx`
- Create: `app/api/seller/dashboard/route.ts`
- Create: `app/api/seller/orders/route.ts`
- Create: `app/api/seller/orders/[id]/ship/route.ts`

- [ ] **Step 1: Seller dashboard stats API**

Create `app/api/seller/dashboard/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
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
    return NextResponse.json(
      { success: false, error: "Seller profile not found" },
      { status: 404 }
    );
  }

  // Products count
  const { count: productCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("seller_id", seller.id);

  // Orders count
  const { count: orderCount } = await supabase
    .from("order_items")
    .select("*", { count: "exact", head: true })
    .eq("seller_id", seller.id);

  // Total revenue
  const { data: revenueData } = await supabase
    .from("order_items")
    .select("price_at_purchase_millimes, quantity")
    .eq("seller_id", seller.id);

  const totalRevenue = revenueData?.reduce(
    (sum, item) => sum + item.price_at_purchase_millimes * item.quantity,
    0
  ) || 0;

  return NextResponse.json({
    success: true,
    data: {
      products: productCount || 0,
      orders: orderCount || 0,
      revenue: totalRevenue,
    },
  });
}
```

- [ ] **Step 2: Seller orders API**

Create `app/api/seller/orders/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
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
    return NextResponse.json({ error: "Seller profile not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("order_items")
    .select(`
      *,
      orders (id, status, tracking_number, created_at, buyer_id, shipping_address, total_amount_millimes, commission_amount_millimes)
    `)
    .eq("seller_id", seller.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
```

- [ ] **Step 3: Mark order as shipped API**

Create `app/api/seller/orders/[id]/ship/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { trackingNumber } = await request.json();

  if (!trackingNumber) {
    return NextResponse.json(
      { success: false, error: "Tracking number is required" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "shipped", tracking_number: trackingNumber })
    .eq("id", id)
    .in("status", ["paid", "shipped"]);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Seller dashboard page**

Create `app/seller/dashboard/page.tsx`:

```typescript
"use client";

import { formatPrice } from "@/lib/utils";
import { useEffect, useState } from "react";

export default function SellerDashboardPage() {
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0 });

  useEffect(() => {
    fetch("/api/seller/dashboard")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setStats(json.data);
      });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Seller Dashboard</h1>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg border">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {formatPrice(stats.revenue)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg border">
          <p className="text-sm text-gray-500">Orders</p>
          <p className="text-2xl font-bold mt-1">{stats.orders}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border">
          <p className="text-sm text-gray-500">Products</p>
          <p className="text-2xl font-bold mt-1">{stats.products}</p>
        </div>
      </div>

      <div className="flex gap-4">
        <a href="/seller/products" className="text-emerald-600 hover:underline">
          Manage Products →
        </a>
        <a href="/seller/orders" className="text-emerald-600 hover:underline">
          View Orders →
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Seller products page**

Create `app/seller/products/page.tsx`:

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SellerProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    description: "",
    price_millimes: "",
    stock: "",
    category: "",
    images: "",
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setProducts(json.data);
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        price_millimes: parseFloat(form.price_millimes) * 1000,
        stock: parseInt(form.stock) || 0,
        images: form.images ? form.images.split(",").map((s) => s.trim()) : [],
      }),
    });

    const json = await res.json();
    if (json.success) {
      setShowForm(false);
      setForm({ name: "", description: "", price_millimes: "", stock: "", category: "", images: "" });
      loadProducts();
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    loadProducts();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Products</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Product"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-lg mb-6 space-y-4">
          <Input
            label="Product Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price (TND)"
              type="number"
              step="0.001"
              value={form.price_millimes}
              onChange={(e) => setForm({ ...form, price_millimes: e.target.value })}
              required
            />
            <Input
              label="Stock"
              type="number"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              required
            />
          </div>
          <Input
            label="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            required
          />
          <Input
            label="Image URLs (comma separated)"
            value={form.images}
            onChange={(e) => setForm({ ...form, images: e.target.value })}
            placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg"
          />
          <Button type="submit">Create Product</Button>
        </form>
      )}

      <div className="space-y-3">
        {products.map((product) => (
          <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-gray-500">
                {formatPrice(product.price_millimes)} · Stock: {product.stock}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded ${product.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                {product.is_active ? "Active" : "Inactive"}
              </span>
              <Button variant="outline" size="sm" onClick={() => toggleActive(product.id, product.is_active)}>
                {product.is_active ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Seller orders page**

Create `app/seller/orders/page.tsx`:

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import { useEffect, useState } from "react";

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);
  const [tracking, setTracking] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = () => {
    fetch("/api/seller/orders")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setOrders(json.data);
      });
  };

  const handleShip = async (orderId: string) => {
    const res = await fetch(`/api/seller/orders/${orderId}/ship`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackingNumber: tracking }),
    });

    const json = await res.json();
    if (json.success) {
      setShippingOrderId(null);
      setTracking("");
      loadOrders();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Orders to Fulfill</h1>

      <div className="space-y-3">
        {orders.map((item) => {
          const order = item.orders;
          return (
            <div key={item.id} className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className="text-sm text-gray-500">
                    Order #{order?.id?.slice(0, 8)}
                  </span>
                  <span className="text-sm text-gray-500 ml-4">
                    {order?.created_at ? new Date(order.created_at).toLocaleDateString() : ""}
                  </span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  order?.status === "paid" ? "bg-blue-100 text-blue-800" :
                  order?.status === "shipped" ? "bg-purple-100 text-purple-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {order?.status}
                </span>
              </div>

              <div className="text-sm text-gray-600 mb-3">
                Quantity: {item.quantity} × {formatPrice(item.price_at_purchase_millimes)}
              </div>

              {order?.status === "paid" && shippingOrderId !== order.id && (
                <Button size="sm" onClick={() => setShippingOrderId(order.id)}>
                  Mark as Shipped
                </Button>
              )}

              {shippingOrderId === order.id && (
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Tracking number"
                    value={tracking}
                    onChange={(e) => setTracking(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button size="sm" onClick={() => handleShip(order.id)}>
                    Confirm
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setShippingOrderId(null);
                    setTracking("");
                  }}>
                    Cancel
                  </Button>
                </div>
              )}

              {order?.tracking_number && (
                <p className="text-xs text-gray-500 mt-1">Tracking: {order.tracking_number}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add app/seller/ app/api/seller/ && git commit -m "feat: add seller dashboard, products management, orders fulfillment"
```

---

### Task 4.2: Admin Panel

**Files:**
- Create: `app/admin/dashboard/page.tsx`
- Create: `app/admin/users/page.tsx`
- Create: `app/admin/orders/page.tsx`
- Create: `app/admin/commissions/page.tsx`
- Create: `app/api/admin/dashboard/route.ts`
- Create: `app/api/admin/users/route.ts`
- Create: `app/api/admin/orders/route.ts`
- Create: `app/api/admin/commissions/route.ts`
- Create: `app/api/admin/sellers/[id]/approve/route.ts`
- Create: `middleware.ts` (update to protect admin routes)

- [ ] **Step 1: Admin dashboard API**

Create `app/api/admin/dashboard/route.ts`:

```typescript
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createAdminClient();

  const { count: userCount } = await supabase.from("users").select("*", { count: "exact", head: true });
  const { count: sellerCount } = await supabase.from("sellers").select("*", { count: "exact", head: true });
  const { count: productCount } = await supabase.from("products").select("*", { count: "exact", head: true });
  const { count: orderCount } = await supabase.from("orders").select("*", { count: "exact", head: true });

  const { data: commissionData } = await supabase
    .from("commissions")
    .select("amount_millimes");

  const totalCommission = commissionData?.reduce(
    (sum, c) => sum + c.amount_millimes, 0
  ) || 0;

  return NextResponse.json({
    success: true,
    data: {
      users: userCount || 0,
      sellers: sellerCount || 0,
      products: productCount || 0,
      orders: orderCount || 0,
      totalCommission,
    },
  });
}
```

- [ ] **Step 2: Admin users API**

Create `app/api/admin/users/route.ts`:

```typescript
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createAdminClient();

  const { data: users } = await supabase
    .from("users")
    .select("id, email, name, role, created_at")
    .order("created_at", { ascending: false });

  const { data: sellers } = await supabase
    .from("sellers")
    .select("id, user_id, store_name, approved, created_at");

  return NextResponse.json({
    success: true,
    data: { users, sellers },
  });
}

export async function POST(request: Request) {
  const { userId, role } = await request.json();

  if (!userId || !role) {
    return NextResponse.json(
      { success: false, error: "Missing userId or role" },
      { status: 400 }
    );
  }

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Approve seller API**

Create `app/api/admin/sellers/[id]/approve/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin
  const { data: adminUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminUser?.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { approved } = await request.json();

  const { error } = await supabase
    .from("sellers")
    .update({ approved })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Admin orders API**

Create `app/api/admin/orders/route.ts`:

```typescript
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (quantity, price_at_purchase_millimes)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
```

- [ ] **Step 5: Admin commissions API**

Create `app/api/admin/commissions/route.ts`:

```typescript
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { formatPrice } from "@/lib/utils";

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
```

- [ ] **Step 6: Admin dashboard page**

Create `app/admin/dashboard/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    users: 0,
    sellers: 0,
    products: 0,
    orders: 0,
    totalCommission: 0,
  });

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setStats(json.data);
      });
  }, []);

  const cards = [
    { label: "Total Users", value: stats.users },
    { label: "Sellers", value: stats.sellers },
    { label: "Products", value: stats.products },
    { label: "Orders", value: stats.orders },
    { label: "Total Commission Earned", value: formatPrice(stats.totalCommission) },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-white p-6 rounded-lg border">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <a href="/admin/users" className="p-6 border rounded-lg hover:border-emerald-300 transition">
          <h3 className="font-medium">Manage Users</h3>
          <p className="text-sm text-gray-500 mt-1">View users, approve sellers</p>
        </a>
        <a href="/admin/orders" className="p-6 border rounded-lg hover:border-emerald-300 transition">
          <h3 className="font-medium">All Orders</h3>
          <p className="text-sm text-gray-500 mt-1">View all platform orders</p>
        </a>
        <a href="/admin/commissions" className="p-6 border rounded-lg hover:border-emerald-300 transition">
          <h3 className="font-medium">Commissions</h3>
          <p className="text-sm text-gray-500 mt-1">View commission ledger</p>
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Admin users page**

Create `app/admin/users/page.tsx`:

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export default function AdminUsersPage() {
  const [data, setData] = useState({ users: [], sellers: [] });

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
      });
  }, []);

  const approveSeller = async (sellerId: string) => {
    await fetch(`/api/admin/sellers/${sellerId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: true }),
    });
    // Reload
    const r = await fetch("/api/admin/users");
    const json = await r.json();
    if (json.success) setData(json.data);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">User Management</h1>

      {/* Pending Sellers */}
      <h2 className="text-lg font-semibold mb-4">Pending Seller Approvals</h2>
      <div className="space-y-2 mb-8">
        {data.sellers
          .filter((s: any) => !s.approved)
          .map((seller: any) => (
            <div key={seller.id} className="flex justify-between items-center p-4 border rounded">
              <span>{seller.store_name}</span>
              <Button size="sm" onClick={() => approveSeller(seller.id)}>
                Approve
              </Button>
            </div>
          ))}
      </div>

      {/* All Users */}
      <h2 className="text-lg font-semibold mb-4">All Users</h2>
      <div className="space-y-2">
        {data.users.map((user: any) => (
          <div key={user.id} className="flex justify-between items-center p-4 border rounded">
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
              {user.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Admin orders page**

Create `app/admin/orders/page.tsx`:

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { useEffect, useState } from "react";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = () => {
    fetch("/api/admin/orders")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setOrders(json.data);
      });
  };

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">All Orders</h1>

      <div className="flex gap-2 mb-6">
        {["all", "pending", "paid", "shipped", "delivered", "cancelled", "refunded"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === s ? "bg-emerald-600 text-white" : "bg-gray-100"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((order) => (
          <div key={order.id} className="p-4 border rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium">#{order.id.slice(0, 8)}</span>
                <span className="text-sm text-gray-500 ml-4">
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
              </div>
              <span className="font-bold">{formatPrice(order.total_amount_millimes)}</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Commission: {formatPrice(order.commission_amount_millimes)} · Status: {order.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Admin commissions page**

Create `app/admin/commissions/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";

export default function AdminCommissionsPage() {
  const [commissions, setCommissions] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/commissions")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCommissions(json.data);
      });
  }, []);

  const total = commissions.reduce((sum, c) => sum + c.amount_millimes, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Commission Ledger</h1>

      <div className="bg-emerald-50 p-4 rounded-lg mb-6">
        <p className="text-sm text-emerald-800">Total Commission Collected</p>
        <p className="text-2xl font-bold text-emerald-600 mt-1">{formatPrice(total)}</p>
      </div>

      <div className="space-y-3">
        {commissions.map((c) => (
          <div key={c.id} className="flex justify-between items-center p-4 border rounded-lg">
            <div>
              <p className="font-medium">Order #{c.orders?.id?.slice(0, 8) || "N/A"}</p>
              <p className="text-sm text-gray-500">
                {c.sellers?.store_name || "Unknown seller"}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold">{formatPrice(c.amount_millimes)}</p>
              <p className="text-xs text-gray-500">{c.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 10: Protect admin routes in middleware**

Update `middleware.ts` to add role checking:

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for auth pages, api routes (except webhooks), static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protect seller and admin routes
  if (pathname.startsWith("/seller")) {
    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    // Check admin role
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") {
      return NextResponse.redirect(new URL("/403", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 11: Create 403 page**

Create `app/403/page.tsx`:

```typescript
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">403</h1>
        <p className="text-gray-600 mb-6">You don't have access to this page.</p>
        <a href="/" className="block">
          <Button>Back to Home</Button>
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 12: Commit**

```bash
git add app/admin/ app/api/admin/ middleware.ts app/403/ && git commit -m "feat: add admin panel with dashboard, users, orders, commissions"
```

---

## Testing

### Task 5.1: Utility Tests

**Files:**
- Create: `__tests__/utils.test.ts`

- [ ] **Step 1: Write utility tests**

Create `__tests__/utils.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { formatPrice, calculateCommission } from "@/lib/utils";

describe("formatPrice", () => {
  it("formats 0 millimes as 0.000", () => {
    expect(formatPrice(0)).toBe("0.000 TND");
  });

  it("formats 1000 millimes as 1.000 TND", () => {
    expect(formatPrice(1000)).toBe("1.000 TND");
  });

  it("formats 49500 millimes as 49.500 TND", () => {
    expect(formatPrice(49500)).toBe("49.500 TND");
  });

  it("formats 100 millimes as 0.100 TND", () => {
    expect(formatPrice(100)).toBe("0.100 TND");
  });
});

describe("calculateCommission", () => {
  it("calculates 5% of 10000", () => {
    expect(calculateCommission(10000)).toBe(500);
  });

  it("calculates 5% of 49500", () => {
    expect(calculateCommission(49500)).toBe(2475);
  });

  it("calculates 5% of 0", () => {
    expect(calculateCommission(0)).toBe(0);
  });

  it("rounds 5% of 1001 to 50", () => {
    expect(calculateCommission(1001)).toBe(50);
  });
});
```

- [ ] **Step 2: Install vitest**

```bash
cd /home/rayen/souq && pnpm add -D vitest @vitest/react
```

- [ ] **Step 3: Create vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 4: Add test script to package.json**

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 5: Run tests**

```bash
cd /home/rayen/souq && pnpm test
```

Expected: All 8 tests pass.

- [ ] **Step 6: Commit**

```bash
git add __tests__/ vitest.config.ts package.json && git commit -m "test: add utility tests for price formatting and commission"
```

---

## Post-Implementation Checklist

After completing all tasks:

- [ ] Verify Supabase migration applied (`db/001-initial-schema.sql`, `db/002-rls-policies.sql`)
- [ ] Verify Stripe Connected Account onboarding flow for sellers
- [ ] Verify Stripe webhook endpoint configured on production
- [ ] Run `pnpm build` — build must succeed
- [ ] Run `pnpm test` — all tests pass
- [ ] Test the full buyer journey: browse → add to cart → checkout → payment
- [ ] Test the seller journey: add product → receive order → ship
- [ ] Test admin: approve seller → view commissions

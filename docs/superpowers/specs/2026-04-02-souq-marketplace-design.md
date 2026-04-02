# Souq Marketplace — Design Spec

**Date:** 2026-04-02
**Status:** Draft
**Author:** Claude Code

## Overview

Souq is a multi-vendor marketplace platform (similar to Amazon/Alibaba) built as an MVP.
It connects buyers and sellers, with the platform taking a 5% commission on each sale.
Prices are in Tunisian Dinar (TND), stored as integer millimes (1 TND = 1000 millimes).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js App Router (React Server Components + Server Actions) |
| Language | TypeScript |
| Styling | TailwindCSS |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Storage | Supabase Storage (product images) |
| Payments | Stripe Connect (marketplace with automatic 5% split) |
| Hosting | Vercel |

## Architecture

- Next.js App Router serves as both frontend (pages) and backend (API routes + Server Actions)
- Supabase handles database, authentication, and file storage with Row Level Security
- Stripe Connect handles payment processing, automatic 5% platform commission, and seller payouts
- Stripe Webhooks for async event handling (payment confirmation, refunds, disputes)
- Next.js middleware for route protection (auth + role-based access)

```
┌─────────────────────────────────────────────────────┐
│                    Vercel                            │
│  ┌───────────────────────────────────────────────┐  │
│  │              Next.js App Router                │  │
│  │                                               │  │
│  │  ┌─────────────┐  ┌─────────────┐            │  │
│  │  │  Pages      │  │  API Routes │            │  │
│  │  │  (RSC + CSR)│  │  /api/*     │            │  │
│  │  └─────────────┘  └─────────────┘            │  │
│  └──────────────┬────────────────┬──────────────┘  │
└─────────────────┼────────────────┼─────────────────┘
                  │                │
         ┌────────▼───┐    ┌──────▼────────┐
         │  Supabase  │    │   Stripe      │
         │  Postgres  │    │   Connect     │
         │  Auth      │    │   Payments    │
         │  Storage   │    │   Webhooks    │
         └────────────┘    └───────────────┘
```

## Database Schema

### users

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| email | text | UNIQUE, NOT NULL |
| name | text | NOT NULL |
| role | text | NOT NULL, CHECK (role IN ('buyer', 'seller', 'admin')), default 'buyer' |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

### sellers

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| user_id | uuid | FK → users(id), UNIQUE, NOT NULL |
| stripe_account_id | text | UNIQUE |
| store_name | text | NOT NULL |
| description | text | |
| approved | boolean | DEFAULT false |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

### products

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| seller_id | uuid | FK → sellers(id), NOT NULL |
| name | text | NOT NULL |
| description | text | NOT NULL |
| price_millimes | bigint | NOT NULL (1 TND = 1000 millimes) |
| images | text[] | DEFAULT '{}' |
| stock | integer | NOT NULL, DEFAULT 0 |
| category | text | NOT NULL |
| is_active | boolean | DEFAULT true |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

### orders

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| buyer_id | uuid | FK → users(id), NOT NULL |
| stripe_payment_intent_id | text | UNIQUE |
| total_amount_millimes | bigint | NOT NULL |
| commission_amount_millimes | bigint | NOT NULL (5% of total) |
| status | text | NOT NULL, DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded')) |
| shipping_address | jsonb | NOT NULL |
| tracking_number | text | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

### order_items

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| order_id | uuid | FK → orders(id), NOT NULL |
| product_id | uuid | FK → products(id), NOT NULL |
| seller_id | uuid | FK → sellers(id), NOT NULL |
| quantity | integer | NOT NULL |
| price_at_purchase_millimes | bigint | NOT NULL |

### commissions

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| order_id | uuid | FK → orders(id), NOT NULL |
| seller_id | uuid | FK → sellers(id), NOT NULL |
| amount_millimes | bigint | NOT NULL |
| status | text | NOT NULL, DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'paid_out')) |
| created_at | timestamptz | DEFAULT now() |

### Row Level Security

- Buyers can only view their own orders
- Sellers can only view/edit their own products
- Sellers can only view orders containing their products
- Admin can view all data
- Only authenticated users can create orders

## Payment Flow (Stripe Connect)

1. Buyer adds items to cart (client-side, session-based)
2. Buyer proceeds to checkout, enters shipping address
3. Server creates a Stripe PaymentIntent with:
   - `amount`: total cart value in millimes
   - `application_fee_amount`: 5% of total in millimes (platform commission)
   - `transfer_data.destination`: seller's Stripe Connected Account ID
   - For multi-seller carts: separate sub-payments per seller
4. Buyer confirms payment via Stripe Elements
5. Stripe charges the buyer, transfers 5% to platform, 95% to seller
6. Stripe webhook (`payment_intent.succeeded`) fires:
   - Creates Order + OrderItems records
   - Decrements product stock
   - Creates Commission record (status: `collected`)
7. Order status flows: `pending` → `paid` → `shipped` → `delivered`

## Shipping Flow

1. After payment confirmed, seller sees order in their dashboard
2. Seller fulfills order, marks as `shipped`, enters tracking number
3. Buyer can view tracking number in their order history
4. Buyer marks order as `delivered` when received

## API Surface

### Auth (Supabase)
- Signup/login via Supabase Auth UI
- Role stored on `users.role`

### Products
- `GET /api/products` — browse/filter/search (public)
- `GET /api/products/:id` — product detail (public)
- `POST /api/products` — create (seller only)
- `PATCH /api/products/:id` — update (seller, own products only)
- `DELETE /api/products/:id` — deactivate (seller, own products only)

### Cart & Checkout
- `POST /api/cart` — add to cart (session-based)
- `POST /api/checkout` — create PaymentIntent + order (authenticated buyer)
- `POST /api/webhooks/stripe` — Stripe events (payment, refund, dispute)

### Seller Dashboard
- `GET /api/seller/dashboard` — stats (revenue, orders, product performance)
- `GET /api/seller/orders` — orders to fulfill
- `POST /api/seller/orders/:id/ship` — mark shipped + tracking number
- `PATCH /api/seller/products/:id/stock` — update inventory

### Admin Panel
- `GET /api/admin/dashboard` — platform overview (sales, commissions, users)
- `GET /api/admin/users` — user management, seller approval queue
- `GET /api/admin/orders` — all orders, filterable by status
- `GET /api/admin/commissions` — commission ledger
- `POST /api/admin/sellers/:id/approve` — approve/reject seller, reject seller

## Frontend Structure

```
/ (app/)
├── layout.tsx              ← global layout + navbar + footer
├── page.tsx                ← landing page (hero, featured products, categories)
├── shop/
│   └── page.tsx            ← product listing, filters, search, pagination
├── product/
│   └── [id]/
│       └── page.tsx        ← product detail page
├── cart/
│   └── page.tsx            ← shopping cart management
├── checkout/
│   └── page.tsx            ← Stripe Elements payment form + shipping address
├── dashboard/
│   └── page.tsx            ← buyer order history + tracking
├── seller/
│   ├── dashboard/
│   │   └── page.tsx        ← seller stats overview
│   ├── products/
│   │   ├── page.tsx        ← product list + CRUD
│   │   └── new/
│   │       └── page.tsx    ← create product + image upload
│   ├── orders/
│   │   └── page.tsx        ← orders to fulfill
│   └── profile/
│       └── page.tsx        ← store settings + Stripe onboarding
├── admin/
│   ├── dashboard/
│   │   └── page.tsx        ← platform stats
│   ├── users/
│   │   └── page.tsx        ← user management + seller approvals
│   ├── orders/
│   │   └── page.tsx        ← all orders
│   └── commissions/
│       └── page.tsx        ← commission ledger
└── auth/
    ├── login/
    │   └── page.tsx        ← login form
    └── register/
        └── page.tsx        ← signup (buyer or seller)
```

## Security

- Supabase Auth handles authentication with email/password + Google OAuth
- Supabase Row Level Security enforced at the database level
- Next.js middleware for route protection, role-based guards per seller
- Server-side validation for all inputs (stock checks, price validation, role checks)
- Stripe webhook signature verification
- Input sanitization via React's default XSS protection
- Rate limiting on API endpoints via Vercel

## Error Handling

- Stripe payment failures → order stays `pending`, retry via webhook
- Out of stock → server validates before payment, shows error if changed
- Shipping errors → order status can only move forward, tracking validation required
- General errors → toast notifications for users, structured server logs
- Sellers must complete Stripe identity verification before receiving payouts

## Testing Strategy

- **Unit tests:** Utility functions (price formatting, commission calculation, currency conversion, stock validation)
- **Integration tests:** API routes (products CRUD, cart checkout, order creation)
- **E2E tests (Playwright):**
  - Buyer flow: browse → add to cart → checkout → order confirmation
  - Seller flow: create product → receive order → mark shipped
  - Admin flow: approve seller → view commissions

## Deployment

- **Development:** `pnpm dev`, Supabase CLI local DB, Stripe test mode
- **Staging:** Vercel preview deployments, Supabase staging project
- **Production:** Vercel (auto-deploy on `main` push), Supabase prod project
- **Environment variables:** Supabase URL/key + service role key, Stripe publishable/secret keys + webhook secret

## Post-MVP Considerations (NOT in scope)

- Email notifications (order confirmation, shipping updates, seller alerts)
- Product reviews/ratings
- Full-text search with Meilisearch or Postgres tsvector
- Multi-currency support beyond TND
- Seller analytics dashboard
- Dispute resolution workflow

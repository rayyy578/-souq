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

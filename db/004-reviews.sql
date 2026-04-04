-- Reviews table
create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade not null,
  buyer_id uuid references users(id) on delete cascade not null,
  order_id uuid references orders(id) on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  title text not null default '',
  comment text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(product_id, buyer_id)
);

-- Indexes
create index idx_reviews_product on reviews(product_id);
create index idx_reviews_buyer on reviews(buyer_id);

-- RLS
alter table reviews enable row level security;

create policy "Anyone can view reviews"
  on reviews for select
  using (true);

create policy "Buyers can write reviews"
  on reviews for insert
  with check (buyer_id = auth.uid());

create policy "Buyers can update own reviews"
  on reviews for update
  using (buyer_id = auth.uid())
  with check (buyer_id = auth.uid());

create policy "Buyers can delete own reviews"
  on reviews for delete
  using (buyer_id = auth.uid());

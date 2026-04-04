-- Categories table with parent-child relationship
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  parent_id uuid references categories(id) on delete set null,
  icon text default '',
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Indexes
create index idx_categories_parent on categories(parent_id);
create index idx_categories_slug on categories(slug);

-- Seed top-level categories
insert into categories (name, slug, parent_id, sort_order) values
  ('Electronics', 'electronics', null, 1),
  ('Fashion', 'fashion', null, 2),
  ('Home & Garden', 'home-garden', null, 3),
  ('Books', 'books', null, 4),
  ('Sports', 'sports', null, 5),
  ('Toys', 'toys', null, 6),
  ('Automotive', 'automotive', null, 7),
  ('Other', 'other', null, 8);

-- Electronics subcategories
insert into categories (name, slug, parent_id, sort_order)
  select 'Smartphones', 'smartphones', id, 1 from categories where slug = 'electronics'
  union all
  select 'Laptops', 'laptops', id, 2 from categories where slug = 'electronics'
  union all
  select 'Accessories', 'accessories', id, 3 from categories where slug = 'electronics';

-- Fashion subcategories
insert into categories (name, slug, parent_id, sort_order)
  select 'Men', 'men', id, 1 from categories where slug = 'fashion'
  union all
  select 'Women', 'women', id, 2 from categories where slug = 'fashion'
  union all
  select 'Kids', 'kids', id, 3 from categories where slug = 'fashion';

-- RLS
alter table categories enable row level security;

create policy "Anyone can view categories" on categories for select using (true);
